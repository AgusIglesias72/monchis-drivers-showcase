import type {
  CellMetric,
  FlattenedShift,
  HourlyAggregate,
  KpiSummary,
  Metric,
} from "@/lib/types/turnos.types"

export function uniqueDates(shifts: FlattenedShift[]): string[] {
  return Array.from(new Set(shifts.map((s) => s.dateIso))).sort()
}

// Encarnación y Kennedy Encarnación van fijas al final del listado (orden
// solicitado por ops: las zonas de Asunción primero, las de Encarnación
// agrupadas al cierre).
const ZONES_AT_END = ["Encarnación", "Kennedy Encarnación"]

export function uniqueZones(shifts: FlattenedShift[]): string[] {
  const all = Array.from(new Set(shifts.map((s) => s.zoneName)))
  const pinned = ZONES_AT_END.filter((z) => all.includes(z))
  const rest = all
    .filter((z) => !ZONES_AT_END.includes(z))
    .sort((a, b) => a.localeCompare(b, "es"))
  return [...rest, ...pinned]
}

export function shiftsForDate(
  shifts: FlattenedShift[],
  dateIso: string,
): FlattenedShift[] {
  return shifts.filter((s) => s.dateIso === dateIso)
}

// 1 min de tolerancia para que un turno hasta XX:59 cuente como cubrir la hora.
const SLOT_END_TOLERANCE = 1 / 60

export function coversSlot(shift: FlattenedShift, hour: number): boolean {
  return (
    shift.fromHour !== null &&
    shift.toHour !== null &&
    shift.fromHour <= hour &&
    shift.toHour + SLOT_END_TOLERANCE >= hour + 1
  )
}

export function shiftsCoveringHour(
  shifts: FlattenedShift[],
  hour: number,
): FlattenedShift[] {
  return shifts.filter((s) => coversSlot(s, hour))
}

export function computeKpis(shifts: FlattenedShift[]): KpiSummary {
  let totalAssigned = 0
  let totalMax = 0
  for (const s of shifts) {
    totalAssigned += s.driversAssigned
    totalMax += s.maxDrivers
  }
  const occupancyPct = totalMax > 0 ? totalAssigned / totalMax : 0
  const activeShifts = shifts.length

  const byZone = new Map<string, { assigned: number; max: number }>()
  for (const s of shifts) {
    const cur = byZone.get(s.zoneName) || { assigned: 0, max: 0 }
    cur.assigned += s.driversAssigned
    cur.max += s.maxDrivers
    byZone.set(s.zoneName, cur)
  }
  let zonesWithLowOccupancy = 0
  for (const [, v] of byZone) {
    if (v.max > 0 && v.assigned / v.max < 0.6) zonesWithLowOccupancy += 1
  }

  return {
    totalAssigned,
    totalMax,
    occupancyPct,
    activeShifts,
    zonesWithLowOccupancy,
  }
}

export function hourlyAggregates(
  shifts: FlattenedShift[],
  hours: readonly number[],
): HourlyAggregate[] {
  const slots = hours.slice(0, -1)
  return slots.map((h) => {
    const covering = shiftsCoveringHour(shifts, h)
    const assigned = covering.reduce((a, s) => a + s.driversAssigned, 0)
    const max = covering.reduce((a, s) => a + s.maxDrivers, 0)
    return { hour: h, label: `${h}-${h + 1}`, assigned, max }
  })
}

export interface ZoneRow {
  zone: string
  cells: (CellMetric | null)[]
  total: CellMetric
}

export function buildHeatmap(
  shifts: FlattenedShift[],
  hours: readonly number[],
  metric: Metric,
): ZoneRow[] {
  const slots = hours.slice(0, -1)
  const zones = uniqueZones(shifts)

  return zones.map((zone) => {
    const zoneShifts = shifts.filter((s) => s.zoneName === zone)

    let dayAssigned = 0
    let dayMax = 0
    let dayShifts = 0
    let dayHasGuaranteed = false
    let dayHasPerOrder = false

    const cells = slots.map((h) => {
      const covering = zoneShifts.filter((s) => coversSlot(s, h))
      if (!covering.length) return null

      const assigned = covering.reduce((a, s) => a + s.driversAssigned, 0)
      const max = covering.reduce((a, s) => a + s.maxDrivers, 0)
      const hasGuaranteed = covering.some((s) => s.paymentType === "guaranteed")
      const hasPerOrder = covering.some((s) => s.paymentType === "per-order")

      dayAssigned += assigned
      dayMax += max
      dayShifts += covering.length
      if (hasGuaranteed) dayHasGuaranteed = true
      if (hasPerOrder) dayHasPerOrder = true

      return cellMetric(
        metric,
        { assigned, max, shiftCount: covering.length, hasGuaranteed, hasPerOrder },
      )
    })

    const total = cellMetric(metric, {
      assigned: dayAssigned,
      max: dayMax,
      shiftCount: dayShifts,
      hasGuaranteed: dayHasGuaranteed,
      hasPerOrder: dayHasPerOrder,
    })

    return { zone, cells, total }
  })
}

interface CellInput {
  assigned: number
  max: number
  shiftCount: number
  hasGuaranteed: boolean
  hasPerOrder: boolean
}

function cellMetric(metric: Metric, c: CellInput): CellMetric {
  const occupancy = c.max > 0 ? c.assigned / c.max : 0
  const full = c.max > 0 && c.assigned >= c.max
  const base = {
    hasGuaranteed: c.hasGuaranteed,
    hasPerOrder: c.hasPerOrder,
    full,
    shiftCount: c.shiftCount,
  }

  if (metric === "drivers" || metric === "person-hours") {
    return {
      ...base,
      display: `${c.assigned}/${c.max}`,
      numeric: occupancy,
      intensity: occupancy,
    }
  }
  if (metric === "occupancy") {
    return {
      ...base,
      display: c.max > 0 ? `${Math.round(occupancy * 100)}%` : "—",
      numeric: occupancy,
      intensity: occupancy,
    }
  }
  // active-shifts
  return {
    ...base,
    display: String(c.shiftCount),
    numeric: c.shiftCount,
    intensity: Math.min(c.shiftCount / 4, 1),
  }
}
