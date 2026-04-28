import "server-only"

import { prisma } from "@/lib/prisma"
import { fetchDriverAttendance } from "@/lib/services/pedidos-driver-attendance.service"
import type {
  RawAttendance,
  RawAttendanceRequest,
} from "@/lib/types/pedidos.types"
import {
  HEATMAP_HOURS,
  WEEKDAY_LABELS,
  type DriverStats,
  type DriverStatsFilters,
  type OrdersByDayPoint,
  type WeekdayBreakdown,
} from "@/lib/types/driver-stats.types"

// Re-exports para que el código existente que importa de este service siga funcionando.
export {
  HEATMAP_HOURS,
  WEEKDAY_LABELS,
  type DriverStats,
  type DriverStatsFilters,
  type WeekdayBreakdown,
}

/**
 * Procesa la asistencia + pedidos de un driver para los últimos N días.
 * Idempotente por día: si ya hay datos para (driverId, day) y forceRefresh=false,
 * salta. Si forceRefresh=true o el día no existe, hace fetch + delete-and-insert.
 */
export interface ProcessResult {
  ok: boolean
  totalDays: number
  fetched: number
  skipped: number
  errors: { day: string; message: string }[]
  durationMs: number
}

const PARALLEL_DAYS = 5 // simultáneos contra la API

function pyDayIso(offsetDaysBack: number): string {
  const now = new Date()
  // Calcula el día PY con offset
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Asuncion",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const shifted = new Date(now.getTime() - offsetDaysBack * 86400 * 1000)
  return fmt.format(shifted)
}

function rangeDays(daysBack: number): string[] {
  const days: string[] = []
  for (let i = 0; i < daysBack; i++) {
    days.push(pyDayIso(i))
  }
  return days
}

function parseAttendanceDate(s: string): Date {
  // "2026-04-22 20:17:49" → tratar como wall-clock PY local
  const utc = new Date(s.replace(" ", "T") + "Z")
  return utc
}

async function persistDayAttendances(
  driverId: string,
  day: string,
  attendances: RawAttendance[],
) {
  await prisma.$transaction(async (tx) => {
    // Borra todo lo previo de ese (driver, day) por cascada
    await tx.monchisDriverAttendance.deleteMany({ where: { driverId, day } })

    if (attendances.length === 0) return

    for (const att of attendances) {
      const created = await tx.monchisDriverAttendance.create({
        data: {
          driverId,
          day,
          zone: att.zone,
          turn: att.turn,
          turnEntryTime: att.turn_entry_time,
          turnExitTime: att.turn_exit_time,
          driverEntryAt: parseAttendanceDate(att.driver_entry_time),
          driverExitAt: parseAttendanceDate(att.driver_exit_time),
          driverExitReason: att.driver_exit_reason || null,
          requestQty: att.request_qty || 0,
          rawData: att as unknown as object,
        },
      })

      const reqs = att.requests || []
      if (reqs.length > 0) {
        await tx.monchisDriverAttendanceRequest.createMany({
          data: reqs.map((r: RawAttendanceRequest) => ({
            attendanceId: created.id,
            driverId,
            day,
            externalOrderId: r.external_order_id,
            requestAt: parseAttendanceDate(r.request_date_time),
            branch: r.branch || null,
            accepted: r.accepted || null,
            reason: r.reason || null,
            requestState: r.request_state || null,
          })),
        })
      }
    }
  })
}

export async function processDriverAttendance(
  driverId: string,
  daysBack: number,
  options: { forceRefresh?: boolean } = {},
): Promise<ProcessResult> {
  const start = Date.now()
  const days = rangeDays(daysBack)

  // Días ya procesados (excluimos hoy si no es forceRefresh — el día actual sigue
  // mutando, conviene refrescarlo. Pero por simplicidad: si forceRefresh, todos.
  // Si no, sólo los que ya tienen al menos un row).
  let alreadyProcessed = new Set<string>()
  if (!options.forceRefresh) {
    const existing = await prisma.monchisDriverAttendance.findMany({
      where: { driverId, day: { in: days } },
      select: { day: true },
      distinct: ["day"],
    })
    alreadyProcessed = new Set(existing.map((e) => e.day))
    // El día actual (offset 0) lo siempre refrescamos porque sigue cambiando.
    alreadyProcessed.delete(days[0])
  }

  const toFetch = days.filter((d) => !alreadyProcessed.has(d))
  const errors: ProcessResult["errors"] = []
  let fetched = 0

  for (let i = 0; i < toFetch.length; i += PARALLEL_DAYS) {
    const chunk = toFetch.slice(i, i + PARALLEL_DAYS)
    await Promise.all(
      chunk.map(async (day) => {
        const result = await fetchDriverAttendance(driverId, day)
        if (result.error) {
          errors.push({ day, message: result.error })
          return
        }
        try {
          await persistDayAttendances(driverId, day, result.attendances)
          fetched += 1
        } catch (err) {
          errors.push({
            day,
            message: err instanceof Error ? err.message : "DB error",
          })
        }
      }),
    )
  }

  return {
    ok: errors.length === 0,
    totalDays: days.length,
    fetched,
    skipped: alreadyProcessed.size,
    errors,
    durationMs: Date.now() - start,
  }
}

/** Devuelve weekday ISO 1-7 a partir de "YYYY-MM-DD" sin importar el TZ del browser. */
function isoWeekdayFromDay(dayIso: string): number {
  const [y, m, d] = dayIso.split("-").map(Number)
  if (!y || !m || !d) return 1
  // Construir en local TZ — el getDay() es independiente de TZ ya que sólo usamos
  // los componentes de fecha (no de hora).
  const dt = new Date(y, m - 1, d)
  const js = dt.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  return js === 0 ? 7 : js
}

/** Hora decimal en wall-clock PY (los DateTime de la DB ya están "estampados"
 *  en UTC con los componentes de PY local). */
function hourDecimal(d: Date): number {
  return d.getUTCHours() + d.getUTCMinutes() / 60
}

export async function getDriverStats(
  driverId: string,
  daysBack: number,
  filters: DriverStatsFilters = {},
): Promise<DriverStats> {
  const fromDay = pyDayIso(daysBack - 1)
  const toDay = pyDayIso(0)

  const attendanceWhere: {
    driverId: string
    day: { gte: string; lte: string }
    zone?: string
    turn?: string
  } = { driverId, day: { gte: fromDay, lte: toDay } }
  if (filters.zone) attendanceWhere.zone = filters.zone
  if (filters.turn) attendanceWhere.turn = filters.turn

  const requestWhere: {
    driverId: string
    day: { gte: string; lte: string }
    attendance?: { zone?: string; turn?: string }
  } = { driverId, day: { gte: fromDay, lte: toDay } }
  if (filters.zone || filters.turn) {
    requestWhere.attendance = {}
    if (filters.zone) requestWhere.attendance.zone = filters.zone
    if (filters.turn) requestWhere.attendance.turn = filters.turn
  }

  // Las opciones disponibles del filtro vienen siempre sin filtrar (universo completo
  // de zonas/turnos en el periodo). Lo otro es la data filtrada que arma el resto.
  const [allAttendancesMeta, attendances, requests] = await Promise.all([
    prisma.monchisDriverAttendance.findMany({
      where: { driverId, day: { gte: fromDay, lte: toDay } },
      select: { zone: true, turn: true },
    }),
    prisma.monchisDriverAttendance.findMany({
      where: attendanceWhere,
      select: {
        day: true,
        zone: true,
        turn: true,
        driverEntryAt: true,
        driverExitAt: true,
      },
    }),
    prisma.monchisDriverAttendanceRequest.findMany({
      where: requestWhere,
      select: {
        day: true,
        accepted: true,
        requestState: true,
      },
    }),
  ])

  const availableZones = Array.from(
    new Set(allAttendancesMeta.map((a) => a.zone)),
  ).sort((a, b) => a.localeCompare(b, "es"))
  const availableTurns = Array.from(
    new Set(allAttendancesMeta.map((a) => a.turn)),
  ).sort((a, b) => a.localeCompare(b, "es"))

  const days = new Set(attendances.map((a) => a.day))
  const zoneCounts = new Map<string, number>()
  const turnCounts = new Map<string, number>()
  for (const a of attendances) {
    zoneCounts.set(a.zone, (zoneCounts.get(a.zone) || 0) + 1)
    turnCounts.set(a.turn, (turnCounts.get(a.turn) || 0) + 1)
  }

  // Weekday breakdown + hourly heatmap
  const weekdaySessions = new Array(7).fill(0)
  const weekdayHours = new Array(7).fill(0)
  const weekdayOrders = new Array(7).fill(0)
  const heatmap: number[][] = Array.from({ length: 7 }, () =>
    new Array(HEATMAP_HOURS.length).fill(0),
  )

  for (const a of attendances) {
    const wIso = isoWeekdayFromDay(a.day)
    const wIdx = wIso - 1
    weekdaySessions[wIdx] += 1

    const fromH = hourDecimal(a.driverEntryAt)
    const toH = hourDecimal(a.driverExitAt)
    if (toH > fromH) {
      weekdayHours[wIdx] += toH - fromH
    }

    HEATMAP_HOURS.forEach((h, hIdx) => {
      // Toleramos 1 minuto al final del slot (turnos hasta 23:59 cubren 23-24).
      const TOL = 1 / 60
      if (fromH <= h && toH + TOL >= h + 1) {
        heatmap[wIdx][hIdx] += 1
      }
    })
  }

  for (const r of requests) {
    const wIso = isoWeekdayFromDay(r.day)
    weekdayOrders[wIso - 1] += 1
  }

  const weekdayBreakdown: WeekdayBreakdown[] = WEEKDAY_LABELS.map((label, i) => ({
    iso: i + 1,
    label,
    sessions: weekdaySessions[i],
    hoursWorked: Math.round(weekdayHours[i] * 10) / 10,
    ordersCount: weekdayOrders[i],
  }))

  const totalRequests = requests.length
  const acceptedRequests = requests.filter((r) => r.accepted === "Aceptado").length
  const notTakenRequests = totalRequests - acceptedRequests
  const finalizedRequests = requests.filter(
    (r) => r.requestState === "FINALIZED",
  ).length

  // Pedidos por día — relleno con ceros para todos los días del rango.
  const ordersByDayMap = new Map<string, { accepted: number; notTaken: number }>()
  for (const r of requests) {
    const cur = ordersByDayMap.get(r.day) || { accepted: 0, notTaken: 0 }
    if (r.accepted === "Aceptado") cur.accepted += 1
    else cur.notTaken += 1
    ordersByDayMap.set(r.day, cur)
  }
  const ordersByDay: OrdersByDayPoint[] = []
  for (let i = daysBack - 1; i >= 0; i--) {
    const day = pyDayIso(i)
    const cur = ordersByDayMap.get(day) || { accepted: 0, notTaken: 0 }
    ordersByDay.push({
      day,
      accepted: cur.accepted,
      notTaken: cur.notTaken,
      total: cur.accepted + cur.notTaken,
    })
  }

  const sortedZones = [...zoneCounts.entries()]
    .map(([name, sessions]) => ({ name, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
  const sortedTurns = [...turnCounts.entries()]
    .map(([name, sessions]) => ({ name, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
  const sortedWeekdays = [...weekdayBreakdown].sort(
    (a, b) => b.sessions - a.sessions,
  )
  const primaryWeekday =
    sortedWeekdays[0] && sortedWeekdays[0].sessions > 0
      ? {
          iso: sortedWeekdays[0].iso,
          label: sortedWeekdays[0].label,
          sessions: sortedWeekdays[0].sessions,
        }
      : null

  return {
    daysWithActivity: days.size,
    totalSessions: attendances.length,
    totalRequests,
    acceptedRequests,
    notTakenRequests,
    acceptedPct: totalRequests > 0 ? acceptedRequests / totalRequests : 0,
    notTakenPct: totalRequests > 0 ? notTakenRequests / totalRequests : 0,
    finalizedRequests,
    primaryZone: sortedZones[0] || null,
    primaryTurn: sortedTurns[0] || null,
    primaryWeekday,
    zoneBreakdown: sortedZones,
    turnBreakdown: sortedTurns,
    weekdayBreakdown,
    hourlyHeatmap: heatmap,
    heatmapHours: [...HEATMAP_HOURS],
    ordersByDay,
    appliedFilters: { zone: filters.zone, turn: filters.turn },
    availableZones,
    availableTurns,
    rangeStartDay: fromDay,
    rangeEndDay: toDay,
  }
}

export async function getDriverProcessedDays(
  driverId: string,
  daysBack: number,
): Promise<{ processed: number; total: number; lastProcessedAt: Date | null }> {
  const fromDay = pyDayIso(daysBack - 1)
  const toDay = pyDayIso(0)

  const days = await prisma.monchisDriverAttendance.findMany({
    where: { driverId, day: { gte: fromDay, lte: toDay } },
    select: { day: true, capturedAt: true },
    orderBy: { capturedAt: "desc" },
  })

  const uniqueDays = new Set(days.map((d) => d.day))
  return {
    processed: uniqueDays.size,
    total: daysBack,
    lastProcessedAt: days[0]?.capturedAt ?? null,
  }
}

/**
 * Recalcula el snapshot de stats 30d para un driver y lo persiste en
 * MonchisDriverCache. Lo usa el cron de procesamiento + el botón manual.
 */
export async function updateDriverStatsSnapshot(driverId: string): Promise<void> {
  const stats = await getDriverStats(driverId, 30, {})
  await prisma.monchisDriverCache.update({
    where: { driverId },
    data: {
      attendanceLastProcessedAt: new Date(),
      ordersCount30d: stats.totalRequests,
      acceptedOrders30d: stats.acceptedRequests,
      sessions30d: stats.totalSessions,
      daysWithActivity30d: stats.daysWithActivity,
      hoursWorked30d: stats.weekdayBreakdown.reduce(
        (a, w) => a + w.hoursWorked,
        0,
      ),
      primaryZone30d: stats.primaryZone?.name ?? null,
      primaryTurn30d: stats.primaryTurn?.name ?? null,
    },
  })
}

/**
 * Procesa el batch del cron: toma N drivers ordenados por antigüedad de su
 * último snapshot (NULLS FIRST), procesa 90 días para cada uno y refresca el
 * snapshot. Secuencial driver-por-driver para no saturar la API; cada driver
 * paraleliza días internamente.
 */
export interface BatchResult {
  ok: boolean
  processedDrivers: number
  totalDriversConsidered: number
  durationMs: number
  errors: { driverId: string; message: string }[]
}

export async function processDriverAttendanceBatch(
  limit: number,
): Promise<BatchResult> {
  const start = Date.now()
  const drivers = await prisma.monchisDriverCache.findMany({
    where: { enabled: true },
    orderBy: [
      { attendanceLastProcessedAt: { sort: "asc", nulls: "first" } },
    ],
    take: limit,
    select: { driverId: true },
  })

  const errors: BatchResult["errors"] = []
  let processed = 0

  for (const d of drivers) {
    try {
      await processDriverAttendance(d.driverId, 90, { forceRefresh: false })
      await updateDriverStatsSnapshot(d.driverId)
      processed += 1
    } catch (err) {
      errors.push({
        driverId: d.driverId,
        message: err instanceof Error ? err.message : "Error desconocido",
      })
      // Si fallamos, igual marcamos como visitado para no quedar pegados acá
      // — la próxima rotación lo va a reintentar.
      try {
        await prisma.monchisDriverCache.update({
          where: { driverId: d.driverId },
          data: { attendanceLastProcessedAt: new Date() },
        })
      } catch {
        /* noop */
      }
    }
  }

  return {
    ok: errors.length === 0,
    processedDrivers: processed,
    totalDriversConsidered: drivers.length,
    durationMs: Date.now() - start,
    errors,
  }
}
