import "server-only"

import { TURNOS_CONFIG, TURNOS_HOURS } from "@/lib/config/turnos.config"
import { prisma } from "@/lib/prisma"
import type {
  CompareCell,
  CompareMode,
  ComparisonData,
} from "@/lib/types/turnos.types"
import { addDaysIso, todayInPyIso } from "@/lib/utils/turnos-dates"

const SLOT_END_TOLERANCE = 1 / 60

interface CompareShift {
  zoneName: string
  fromHour: number | null
  toHour: number | null
  driversAssigned: number
  maxDrivers: number
}

function coversHour(s: CompareShift, hour: number): boolean {
  if (s.fromHour === null || s.toHour === null) return false
  return s.fromHour <= hour && s.toHour + SLOT_END_TOLERANCE >= hour + 1
}

function emptyData(
  mode: CompareMode,
  weeksBack: number,
  comparisonDate: string,
): ComparisonData {
  return {
    mode,
    weeksBack,
    comparisonDate,
    capturedAtIso: null,
    cells: {},
    totalsByZone: {},
    totals: { assigned: 0, max: 0 },
    shiftCount: 0,
    hasData: false,
  }
}

function buildCells(
  shifts: CompareShift[],
): Record<string, Record<number, CompareCell>> {
  const cells: Record<string, Record<number, CompareCell>> = {}
  for (const h of TURNOS_HOURS.slice(0, -1)) {
    const byZone = new Map<string, CompareCell>()
    for (const s of shifts) {
      if (!coversHour(s, h)) continue
      const cur = byZone.get(s.zoneName) ?? { assigned: 0, max: 0 }
      cur.assigned += s.driversAssigned
      cur.max += s.maxDrivers
      byZone.set(s.zoneName, cur)
    }
    for (const [z, v] of byZone) {
      if (!cells[z]) cells[z] = {}
      cells[z][h] = v
    }
  }
  return cells
}

function buildTotalsByZone(shifts: CompareShift[]): Record<string, CompareCell> {
  const out: Record<string, CompareCell> = {}
  for (const s of shifts) {
    const cur = out[s.zoneName] ?? { assigned: 0, max: 0 }
    cur.assigned += s.driversAssigned
    cur.max += s.maxDrivers
    out[s.zoneName] = cur
  }
  return out
}

// Hora actual en zona Asunción (0–23).
function currentPyHour(): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TURNOS_CONFIG.timezone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const h = parts.find((p) => p.type === "hour")?.value
  let n = h ? parseInt(h, 10) : 0
  if (n === 24) n = 0
  return n
}

// MODO FINAL: para cada hora H, usamos la foto tomada **al cierre** de esa
// hora — la del :00 siguiente, que captura cómo terminó el slot. Para H=23 eso
// es el snapshot de (D+1, 00:00). Si esa foto falta (cron salteado), bajamos
// a la primera disponible posterior y, en última instancia, a la más tardía
// del día. Para los totales (KPIs y total día) usamos el snapshot del cierre
// del día (D+1 a las 00:00), con fallback a la última foto de D.
async function getFinalComparison(
  comparisonDate: string,
): Promise<{
  shiftsForCells: Map<number, CompareShift[]>
  latestShifts: CompareShift[]
  capturedAtIso: string | null
} | null> {
  const nextDate = addDaysIso(comparisonDate, 1)

  const snaps = await prisma.turnosSnapshot.findMany({
    where: { localDate: { in: [comparisonDate, nextDate] } },
    orderBy: [{ localDate: "asc" }, { localHour: "asc" }],
    select: { id: true, localDate: true, localHour: true, capturedAt: true },
  })
  if (snaps.length === 0) return null

  const allShifts = await prisma.turnosShiftSnapshot.findMany({
    where: {
      snapshotId: { in: snaps.map((s) => s.id) },
      dateIso: comparisonDate,
    },
    select: {
      snapshotId: true,
      zoneName: true,
      fromHour: true,
      toHour: true,
      driversAssigned: true,
      maxDrivers: true,
    },
  })

  const shiftsBySnapId = new Map<string, CompareShift[]>()
  for (const r of allShifts) {
    let arr = shiftsBySnapId.get(r.snapshotId)
    if (!arr) {
      arr = []
      shiftsBySnapId.set(r.snapshotId, arr)
    }
    arr.push(r)
  }

  type SnapMeta = (typeof snaps)[number]
  const snapsWithShifts: SnapMeta[] = snaps.filter(
    (s) => (shiftsBySnapId.get(s.id) ?? []).length > 0,
  )
  if (snapsWithShifts.length === 0) return null

  // Primer snapshot con shifts que sea >= (date, hour) en el orden temporal.
  const findAtOrAfter = (date: string, hour: number): SnapMeta | undefined =>
    snapsWithShifts.find(
      (s) =>
        s.localDate > date ||
        (s.localDate === date && s.localHour >= hour),
    )

  const shiftsForCells = new Map<number, CompareShift[]>()
  for (const h of TURNOS_HOURS.slice(0, -1)) {
    const targetDate = h === 23 ? nextDate : comparisonDate
    const targetHour = h === 23 ? 0 : h + 1
    const chosen =
      findAtOrAfter(targetDate, targetHour) ??
      snapsWithShifts[snapsWithShifts.length - 1]
    const shifts = shiftsBySnapId.get(chosen.id)
    if (shifts?.length) shiftsForCells.set(h, shifts)
  }

  const closingSnap =
    findAtOrAfter(nextDate, 0) ??
    [...snapsWithShifts]
      .filter((s) => s.localDate === comparisonDate)
      .at(-1) ??
    snapsWithShifts[snapsWithShifts.length - 1]
  const latestShifts = shiftsBySnapId.get(closingSnap.id) ?? []

  return {
    shiftsForCells,
    latestShifts,
    capturedAtIso: closingSnap.capturedAt.toISOString(),
  }
}

// MODO RUN RATE: usamos UNA sola foto, la tomada hace exactamente 7×N días a
// la hora actual. Las reservas que tenía esa foto para el día comparado.
async function getRunRateComparison(
  comparisonDate: string,
  refLocalDate: string,
  refLocalHour: number,
): Promise<{
  shifts: CompareShift[]
  capturedAtIso: string | null
} | null> {
  const snap = await prisma.turnosSnapshot.findFirst({
    where: { localDate: refLocalDate, localHour: { lte: refLocalHour } },
    orderBy: { localHour: "desc" },
    select: { id: true, capturedAt: true },
  })
  if (!snap) return null

  const shifts = await prisma.turnosShiftSnapshot.findMany({
    where: { snapshotId: snap.id, dateIso: comparisonDate },
    select: {
      zoneName: true,
      fromHour: true,
      toHour: true,
      driversAssigned: true,
      maxDrivers: true,
    },
  })

  return { shifts, capturedAtIso: snap.capturedAt.toISOString() }
}

export async function getComparison(params: {
  mode: CompareMode
  weeksBack: number
  selectedDate: string
}): Promise<ComparisonData> {
  const { mode, weeksBack, selectedDate } = params
  const comparisonDate = addDaysIso(selectedDate, -7 * weeksBack)

  if (mode === "final") {
    const result = await getFinalComparison(comparisonDate)
    if (!result) return emptyData(mode, weeksBack, comparisonDate)

    // cells: por hora, usando la foto de esa misma hora.
    const cells: Record<string, Record<number, CompareCell>> = {}
    for (const [h, shifts] of result.shiftsForCells) {
      const byZone = new Map<string, CompareCell>()
      for (const s of shifts) {
        if (!coversHour(s, h)) continue
        const cur = byZone.get(s.zoneName) ?? { assigned: 0, max: 0 }
        cur.assigned += s.driversAssigned
        cur.max += s.maxDrivers
        byZone.set(s.zoneName, cur)
      }
      for (const [z, v] of byZone) {
        if (!cells[z]) cells[z] = {}
        cells[z][h] = v
      }
    }

    const totalsByZone = buildTotalsByZone(result.latestShifts)
    let totalAssigned = 0
    let totalMax = 0
    for (const s of result.latestShifts) {
      totalAssigned += s.driversAssigned
      totalMax += s.maxDrivers
    }

    return {
      mode,
      weeksBack,
      comparisonDate,
      capturedAtIso: result.capturedAtIso,
      cells,
      totalsByZone,
      totals: { assigned: totalAssigned, max: totalMax },
      shiftCount: result.latestShifts.length,
      hasData: true,
    }
  }

  // runrate
  const refLocalDate = addDaysIso(todayInPyIso(), -7 * weeksBack)
  const refLocalHour = currentPyHour()
  const result = await getRunRateComparison(
    comparisonDate,
    refLocalDate,
    refLocalHour,
  )
  if (!result || result.shifts.length === 0) {
    return emptyData(mode, weeksBack, comparisonDate)
  }

  const cells = buildCells(result.shifts)
  const totalsByZone = buildTotalsByZone(result.shifts)
  let totalAssigned = 0
  let totalMax = 0
  for (const s of result.shifts) {
    totalAssigned += s.driversAssigned
    totalMax += s.maxDrivers
  }

  return {
    mode,
    weeksBack,
    comparisonDate,
    capturedAtIso: result.capturedAtIso,
    cells,
    totalsByZone,
    totals: { assigned: totalAssigned, max: totalMax },
    shiftCount: result.shifts.length,
    hasData: true,
  }
}

// Cuántas semanas hacia atrás hay datos completos (al menos llega hasta `today - 7*N`).
export async function getAvailableComparisonWeeks(
  maxWeeks = 4,
): Promise<number[]> {
  const oldest = await prisma.turnosSnapshot.findFirst({
    orderBy: { capturedAt: "asc" },
    select: { localDate: true },
  })
  if (!oldest) return []
  const today = todayInPyIso()
  const result: number[] = []
  for (let n = 1; n <= maxWeeks; n++) {
    const target = addDaysIso(today, -7 * n)
    if (target >= oldest.localDate) result.push(n)
  }
  return result
}
