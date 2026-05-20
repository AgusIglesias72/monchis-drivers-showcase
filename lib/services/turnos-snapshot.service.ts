import "server-only"

import { Prisma } from "@prisma/client"

import { TURNOS_CONFIG, TURNOS_SNAPSHOT } from "@/lib/config/turnos.config"
import { prisma } from "@/lib/prisma"
import { sendSlackMessage } from "@/lib/services/slack.service"
import { fetchAllZoneShifts } from "@/lib/services/turnos.service"
import type { FlattenedShift } from "@/lib/types/turnos.types"

// Cobertura del "slot activo" de una zona a una hora dada.
interface ZoneActive {
  zoneId: string
  assigned: number // drivers únicos reservados que cubren la hora
  max: number // capacidad sumada de los turnos que cubren la hora
  driverIds: string[]
}
type ActiveByZone = Record<string, ZoneActive>

export interface CaptureResult {
  snapshotId: string
  localDate: string
  localHour: number
  shiftCount: number
  activeAssigned: number
  zonesActive: number
  eventsCreated: number
  slackSent: boolean
  slackError?: string
  pruned: number
}

interface ShiftEventRow {
  snapshotId: string
  detectedAt: Date
  shiftId: string
  zoneId: string
  zoneName: string
  dateIso: string
  fromHour: number | null
  toHour: number | null
  eventType: "join" | "leave"
  driverId: string
  driverName: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

// Fecha y hora actuales en zona Asunción, sin depender de la TZ del runtime.
function localNow(): { dateIso: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TURNOS_CONFIG.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  const dateIso = `${get("year")}-${get("month")}-${get("day")}`
  let hour = parseInt(get("hour"), 10)
  if (hour === 24) hour = 0 // algunos runtimes devuelven "24" a medianoche
  return { dateIso, hour }
}

// Un turno [fromHour, toHour) cubre la hora entera `hour` si fromHour <= hour
// && toHour >= hour+1 (mismo criterio que getDriversToReview). toHour <= fromHour
// representa cruce de medianoche.
function coversHour(s: FlattenedShift, hour: number): boolean {
  if (s.fromHour == null || s.toHour == null) return false
  let to = s.toHour
  if (to <= s.fromHour) to += 24
  return s.fromHour <= hour && to >= hour + 1
}

function buildActiveByZone(
  shifts: FlattenedShift[],
  dateIso: string,
  hour: number,
): ActiveByZone {
  const byZone = new Map<
    string,
    { zoneId: string; max: number; ids: Set<string> }
  >()
  for (const s of shifts) {
    if (s.dateIso !== dateIso) continue
    if (!coversHour(s, hour)) continue
    let z = byZone.get(s.zoneName)
    if (!z) {
      z = { zoneId: s.zoneId, max: 0, ids: new Set() }
      byZone.set(s.zoneName, z)
    }
    z.max += s.maxDrivers
    for (const id of s.driverIds) z.ids.add(id)
  }
  const out: ActiveByZone = {}
  for (const [name, z] of byZone) {
    out[name] = {
      zoneId: z.zoneId,
      assigned: z.ids.size,
      max: z.max,
      driverIds: [...z.ids],
    }
  }
  return out
}

function fmtDay(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00Z`)
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d)
}

function fmtDelta(d: number): string {
  if (d === 0) return "="
  return d > 0 ? `+${d}` : `${d}`
}

async function resolveNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const rows = await prisma.monchisDriverCache.findMany({
    where: { driverId: { in: ids } },
    select: { driverId: true, fullName: true, firstName: true, lastName: true },
  })
  const m = new Map<string, string>()
  for (const r of rows) {
    const name =
      r.fullName ||
      `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() ||
      r.driverId
    m.set(r.driverId, name)
  }
  return m
}

async function buildSlackSummary(
  dateIso: string,
  hour: number,
  current: ActiveByZone,
  prev: ActiveByZone | null,
): Promise<string> {
  const hh = String(hour).padStart(2, "0")
  const dayLabel = fmtDay(dateIso)
  const zoneNames = new Set([
    ...Object.keys(current),
    ...(prev ? Object.keys(prev) : []),
  ])

  if (zoneNames.size === 0) {
    return `🌙 *Turnos ${hh}:00* · ${dayLabel}\nSin turnos activos a esta hora.`
  }

  // Deserciones: ids que estaban activos la hora previa y ya no. Resolvemos los
  // nombres en una sola query.
  const droppedIds = new Set<string>()
  if (prev) {
    for (const name of zoneNames) {
      const pre = prev[name]
      if (!pre) continue
      const curSet = new Set(current[name]?.driverIds ?? [])
      for (const id of pre.driverIds) if (!curSet.has(id)) droppedIds.add(id)
    }
  }
  const names = await resolveNames([...droppedIds])

  const totalCur = Object.values(current).reduce((a, z) => a + z.assigned, 0)
  const totalPrev = prev
    ? Object.values(prev).reduce((a, z) => a + z.assigned, 0)
    : null

  const lines: string[] = []
  lines.push(`📊 *Turnos ${hh}:00* · ${dayLabel}`)
  if (totalPrev == null) {
    lines.push(`Drivers en turno: *${totalCur}*`)
  } else {
    const d = totalCur - totalPrev
    const warn = d <= -TURNOS_SNAPSHOT.dropAlertThreshold ? " ⚠️" : ""
    lines.push(
      `Drivers en turno: *${totalCur}* (prev ${totalPrev}, ${fmtDelta(d)})${warn}`,
    )
  }
  lines.push("")

  const sorted = [...zoneNames].sort((a, b) => {
    const ca = current[a]?.assigned ?? 0
    const cb = current[b]?.assigned ?? 0
    return cb - ca || a.localeCompare(b, "es")
  })

  for (const name of sorted) {
    const cur = current[name]
    const pre = prev?.[name]
    const assigned = cur?.assigned ?? 0
    const max = cur?.max ?? 0
    let deltaStr = ""
    let warn = ""
    if (pre) {
      const d = assigned - pre.assigned
      deltaStr = ` · prev ${pre.assigned} · ${fmtDelta(d)}`
      if (d <= -TURNOS_SNAPSHOT.dropAlertThreshold) warn = " ⚠️"
    }
    lines.push(`• *${name}*: ${assigned}/${max}${deltaStr}${warn}`)

    if (pre) {
      const curSet = new Set(cur?.driverIds ?? [])
      const dropped = pre.driverIds.filter((id) => !curSet.has(id))
      if (dropped.length) {
        const shown = dropped.slice(0, 5).map((id) => names.get(id) || id)
        const extra = dropped.length > 5 ? ` +${dropped.length - 5}` : ""
        lines.push(`   ↳ bajas: ${shown.join(", ")}${extra}`)
      }
    }
  }

  return lines.join("\n")
}

// Diff de la foto actual contra la anterior, por turno (mismo shiftId presente
// en ambas). Genera un evento "join"/"leave" por cada driver que entra o sale.
async function buildShiftEvents(
  prevSnapshotId: string,
  snapshotId: string,
  detectedAt: Date,
  currentShifts: FlattenedShift[],
): Promise<ShiftEventRow[]> {
  const prevRows = await prisma.turnosShiftSnapshot.findMany({
    where: { snapshotId: prevSnapshotId },
    select: { shiftId: true, driverIds: true },
  })
  const prevByShift = new Map<string, Set<string>>()
  for (const r of prevRows) {
    prevByShift.set(
      r.shiftId,
      new Set((r.driverIds as unknown as string[]) ?? []),
    )
  }

  const partial: Omit<ShiftEventRow, "driverName">[] = []
  for (const s of currentShifts) {
    const prevSet = prevByShift.get(s.shiftId)
    if (!prevSet) continue // turno nuevo en la foto: baseline, no emitimos altas
    const curSet = new Set(s.driverIds)
    const base = {
      snapshotId,
      detectedAt,
      shiftId: s.shiftId,
      zoneId: s.zoneId,
      zoneName: s.zoneName,
      dateIso: s.dateIso,
      fromHour: s.fromHour,
      toHour: s.toHour,
    }
    for (const id of curSet) {
      if (!prevSet.has(id)) {
        partial.push({ ...base, eventType: "join", driverId: id })
      }
    }
    for (const id of prevSet) {
      if (!curSet.has(id)) {
        partial.push({ ...base, eventType: "leave", driverId: id })
      }
    }
  }

  if (partial.length === 0) return []

  const names = await resolveNames([...new Set(partial.map((e) => e.driverId))])
  return partial.map((e) => ({ ...e, driverName: names.get(e.driverId) ?? null }))
}

export async function captureTurnosSnapshot(): Promise<CaptureResult> {
  const { shifts, errors } = await fetchAllZoneShifts({ fresh: true })
  const { dateIso, hour } = localNow()

  const activeByZone = buildActiveByZone(shifts, dateIso, hour)
  const activeAssigned = Object.values(activeByZone).reduce(
    (a, z) => a + z.assigned,
    0,
  )
  const activeMax = Object.values(activeByZone).reduce((a, z) => a + z.max, 0)

  // Foto anterior (para el delta hora-a-hora y el diff de eventos) ANTES de
  // insertar la nueva.
  const prevRow = await prisma.turnosSnapshot.findFirst({
    orderBy: { capturedAt: "desc" },
    select: { id: true, activeByZone: true },
  })
  const prevActive =
    (prevRow?.activeByZone as unknown as ActiveByZone | null) ?? null

  const snapshot = await prisma.turnosSnapshot.create({
    data: {
      localDate: dateIso,
      localHour: hour,
      activeAssigned,
      activeMax,
      shiftCount: shifts.length,
      activeByZone: activeByZone as unknown as Prisma.InputJsonValue,
      errors: errors.length
        ? (errors as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  })

  if (shifts.length) {
    await prisma.turnosShiftSnapshot.createMany({
      data: shifts.map((s) => ({
        snapshotId: snapshot.id,
        shiftId: s.shiftId,
        zoneId: s.zoneId,
        zoneName: s.zoneName,
        shiftName: s.shiftName,
        dateIso: s.dateIso,
        fromHour: s.fromHour,
        toHour: s.toHour,
        driversAssigned: s.driversAssigned,
        maxDrivers: s.maxDrivers,
        occupancyPct: s.occupancyPct,
        paymentType: s.paymentType,
        pctHourCompliance: s.pctHourCompliance,
        enabled: s.enabled,
        driverIds: s.driverIds as unknown as Prisma.InputJsonValue,
        driverNames: s.driverNames as unknown as Prisma.InputJsonValue,
      })),
    })
  }

  // Variaciones por turno (altas/bajas) vs la foto anterior.
  let eventsCreated = 0
  if (prevRow?.id) {
    const events = await buildShiftEvents(
      prevRow.id,
      snapshot.id,
      snapshot.capturedAt,
      shifts,
    )
    if (events.length) {
      await prisma.turnosShiftEvent.createMany({ data: events })
      eventsCreated = events.length
    }
  }

  const text = await buildSlackSummary(dateIso, hour, activeByZone, prevActive)
  const slack = await sendSlackMessage(text)

  // Retención: borramos fotos viejas (cascade limpia las filas de turnos).
  const cutoff = new Date(Date.now() - TURNOS_SNAPSHOT.retentionDays * DAY_MS)
  const pruned = await prisma.turnosSnapshot.deleteMany({
    where: { capturedAt: { lt: cutoff } },
  })

  return {
    snapshotId: snapshot.id,
    localDate: dateIso,
    localHour: hour,
    shiftCount: shifts.length,
    activeAssigned,
    zonesActive: Object.keys(activeByZone).length,
    eventsCreated,
    slackSent: slack.ok,
    slackError: slack.ok ? undefined : slack.error,
    pruned: pruned.count,
  }
}
