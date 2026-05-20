import "server-only"

import { prisma } from "@/lib/prisma"
import { dayNameFromIso } from "@/lib/utils/turnos-dates"
import type { FlattenedShift } from "@/lib/types/turnos.types"

// Una foto registrada (para los selectores de día/hora).
export interface SnapshotListItem {
  id: string
  capturedAtIso: string
  localDate: string
  localHour: number
}

// Alta/baja de un turno entre la foto anterior y ésta.
export interface ShiftDiff {
  shiftId: string
  zoneName: string
  dateIso: string
  fromHour: number | null
  toHour: number | null
  joined: { driverId: string; driverName: string | null }[]
  left: { driverId: string; driverName: string | null }[]
  net: number
}

export interface SnapshotDetail {
  id: string
  capturedAtIso: string
  localDate: string
  localHour: number
  activeAssigned: number
  shiftCount: number
  shifts: FlattenedShift[]
  diffs: ShiftDiff[]
  hasPrev: boolean
  prevCapturedAtIso: string | null
}

function reconstructShift(r: {
  shiftId: string
  zoneId: string
  zoneName: string
  shiftName: string
  dateIso: string
  fromHour: number | null
  toHour: number | null
  driversAssigned: number
  maxDrivers: number
  occupancyPct: number
  paymentType: string
  pctHourCompliance: number
  enabled: boolean
  driverNames: unknown
  driverIds: unknown
}): FlattenedShift {
  return {
    shiftId: r.shiftId,
    zoneId: r.zoneId,
    zoneName: r.zoneName,
    shiftName: r.shiftName,
    dateIso: r.dateIso,
    dayName: dayNameFromIso(r.dateIso),
    fromHour: r.fromHour,
    toHour: r.toHour,
    driversAssigned: r.driversAssigned,
    maxDrivers: r.maxDrivers,
    occupancyPct: r.occupancyPct,
    paymentType: r.paymentType as FlattenedShift["paymentType"],
    pctHourCompliance: r.pctHourCompliance,
    enabled: r.enabled,
    driverNames: (r.driverNames as string[]) ?? [],
    driverIds: (r.driverIds as string[]) ?? [],
  }
}

// Lista de fotos registradas, más recientes primero. Alimenta los selectores
// de día y hora de captura.
export async function getSnapshotList(
  limit = 1000,
): Promise<SnapshotListItem[]> {
  const rows = await prisma.turnosSnapshot.findMany({
    orderBy: { capturedAt: "desc" },
    take: limit,
    select: { id: true, capturedAt: true, localDate: true, localHour: true },
  })
  return rows.map((r) => ({
    id: r.id,
    capturedAtIso: r.capturedAt.toISOString(),
    localDate: r.localDate,
    localHour: r.localHour,
  }))
}

// Detalle de una foto: cobertura reconstruida + diff vs la foto anterior.
// Sin snapshotId, usa la más reciente.
export async function getSnapshotDetail(
  snapshotId?: string,
): Promise<SnapshotDetail | null> {
  const snap = snapshotId
    ? await prisma.turnosSnapshot.findUnique({
        where: { id: snapshotId },
        select: {
          id: true,
          capturedAt: true,
          localDate: true,
          localHour: true,
          activeAssigned: true,
          shiftCount: true,
        },
      })
    : await prisma.turnosSnapshot.findFirst({
        orderBy: { capturedAt: "desc" },
        select: {
          id: true,
          capturedAt: true,
          localDate: true,
          localHour: true,
          activeAssigned: true,
          shiftCount: true,
        },
      })

  if (!snap) return null

  const [shiftRows, events, prev] = await Promise.all([
    prisma.turnosShiftSnapshot.findMany({ where: { snapshotId: snap.id } }),
    prisma.turnosShiftEvent.findMany({
      where: { snapshotId: snap.id },
      orderBy: [{ dateIso: "asc" }, { fromHour: "asc" }],
    }),
    prisma.turnosSnapshot.findFirst({
      where: { capturedAt: { lt: snap.capturedAt } },
      orderBy: { capturedAt: "desc" },
      select: { capturedAt: true },
    }),
  ])

  const shifts = shiftRows.map(reconstructShift)

  // Agrupamos los eventos por turno (shiftId).
  const byShift = new Map<string, ShiftDiff>()
  for (const e of events) {
    let d = byShift.get(e.shiftId)
    if (!d) {
      d = {
        shiftId: e.shiftId,
        zoneName: e.zoneName,
        dateIso: e.dateIso,
        fromHour: e.fromHour,
        toHour: e.toHour,
        joined: [],
        left: [],
        net: 0,
      }
      byShift.set(e.shiftId, d)
    }
    const entry = { driverId: e.driverId, driverName: e.driverName }
    if (e.eventType === "join") d.joined.push(entry)
    else d.left.push(entry)
  }

  const diffs = [...byShift.values()]
    .map((d) => ({ ...d, net: d.joined.length - d.left.length }))
    .sort(
      (a, b) =>
        a.dateIso.localeCompare(b.dateIso) ||
        (a.fromHour ?? 0) - (b.fromHour ?? 0) ||
        a.zoneName.localeCompare(b.zoneName, "es"),
    )

  return {
    id: snap.id,
    capturedAtIso: snap.capturedAt.toISOString(),
    localDate: snap.localDate,
    localHour: snap.localHour,
    activeAssigned: snap.activeAssigned,
    shiftCount: snap.shiftCount,
    shifts,
    diffs,
    hasPrev: prev !== null,
    prevCapturedAtIso: prev?.capturedAt.toISOString() ?? null,
  }
}
