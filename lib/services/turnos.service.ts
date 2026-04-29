import "server-only"

import {
  TURNOS_CONFIG,
  TURNOS_ZONE_IDS,
} from "@/lib/config/turnos.config"
import type {
  FetchResult,
  FlattenedShift,
  RawShift,
} from "@/lib/types/turnos.types"

function flattenShift(raw: RawShift): FlattenedShift | null {
  const fromStr = raw.available_time?.from
  const toStr = raw.available_time?.to
  const dateStr = raw.date || fromStr
  if (!dateStr) return null

  const from = fromStr ? new Date(fromStr) : null
  const to = toStr ? new Date(toStr) : null
  const date = new Date(dateStr)

  // El Sheet original lee la API con getUTCHours(): la API devuelve un string ISO
  // marcado como UTC pero el wall-clock es Asunción. Si la API arregla TZ, esto rompe.
  const fromHour =
    from && !isNaN(from.getTime())
      ? from.getUTCHours() + from.getUTCMinutes() / 60
      : null
  const toHour =
    to && !isNaN(to.getTime())
      ? to.getUTCHours() + to.getUTCMinutes() / 60
      : null

  const driversAssigned = (raw.driver_id || []).length
  const maxDrivers = raw.max_drivers || 0
  const occupancyPct = maxDrivers > 0 ? driversAssigned / maxDrivers : 0
  const paymentType =
    raw.percentage_of_hour_compliance === 1000 ? "per-order" : "guaranteed"

  const dateIso = date.toISOString().slice(0, 10)
  const dayName = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(date)

  return {
    shiftId: raw._id,
    zoneId: raw.zone_id,
    zoneName: raw.zone_name,
    shiftName: raw.available_time?.available_time_name || "",
    dateIso,
    dayName,
    fromHour,
    toHour,
    driversAssigned,
    maxDrivers,
    occupancyPct,
    paymentType,
    pctHourCompliance: raw.percentage_of_hour_compliance ?? 0,
    enabled: raw.enabled ?? false,
    driverNames: (raw.drivers || [])
      .map((d) => `${(d.first_name || "").trim()} ${(d.last_name || "").trim()}`.trim())
      .filter(Boolean),
    driverIds: (raw.driver_id || []).filter(Boolean),
  }
}

async function fetchZone(
  zoneId: string,
): Promise<{ shifts: FlattenedShift[]; error?: string }> {
  if (!TURNOS_CONFIG.token) {
    return { shifts: [], error: "MONCHIS_DRIVERS_API_TOKEN no configurado" }
  }

  try {
    const res = await fetch(TURNOS_CONFIG.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: TURNOS_CONFIG.token,
      },
      body: JSON.stringify({ zone_id: zoneId }),
      next: {
        revalidate: TURNOS_CONFIG.revalidateSeconds,
        tags: [TURNOS_CONFIG.cacheTag],
      },
    })

    if (!res.ok) {
      return { shifts: [], error: `HTTP ${res.status}` }
    }

    const json = (await res.json()) as {
      data?: { driver_zone_date?: RawShift[][] }
    }
    const groups = json?.data?.driver_zone_date || []

    const shifts: FlattenedShift[] = []
    for (const group of groups) {
      for (const raw of group) {
        const flat = flattenShift(raw)
        if (flat) shifts.push(flat)
      }
    }

    return { shifts }
  } catch (err) {
    return {
      shifts: [],
      error: err instanceof Error ? err.message : "Error desconocido",
    }
  }
}

export async function fetchAllZoneShifts(): Promise<FetchResult> {
  const results = await Promise.all(
    TURNOS_ZONE_IDS.map((zoneId) =>
      fetchZone(zoneId).then((r) => ({ zoneId, ...r })),
    ),
  )

  const shifts: FlattenedShift[] = []
  const errors: { zoneId: string; message: string }[] = []
  for (const r of results) {
    shifts.push(...r.shifts)
    if (r.error) errors.push({ zoneId: r.zoneId, message: r.error })
  }

  return { shifts, fetchedAt: new Date(), errors }
}
