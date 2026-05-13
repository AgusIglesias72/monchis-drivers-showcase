import "server-only"

import { prisma } from "@/lib/prisma"
import { computeKpis } from "@/lib/services/pedidos-kpis"
import type { RawOrder } from "@/lib/types/pedidos.types"
import { PY_TZ } from "@/lib/utils/onboarding-time"
import { formatInTimeZone, toZonedTime } from "date-fns-tz"
import { startOfDay, subDays } from "date-fns"

// ============================================================
// Dashboard Operaciones — snapshots cacheables sobre MonchisOrderCache
// ============================================================
//
// Filosofía: este servicio se llama desde el RSC del dashboard /admin
// (cacheado con `export const revalidate = 60`). NO hace fetches reales:
// solo lee la tabla `MonchisOrderCache` que ya está poblada por el cron
// de importación + las consultas individuales del panel de pedidos.
//
// Para vistas operativas en vivo se usa `lib/services/live-panel.service.ts`,
// que toca la API real-time. Acá trabajamos sobre el cache histórico.
//
// Timezone: la tabla guarda `confirmedAt` parseado vía `parseApiDate`, que
// reproduce el wall-clock PY local en componentes UTC (sufijo Z falso). Esto
// significa que para particionar por "hoy" / "ayer" / "esta semana" usamos
// los componentes UTC del Date, NO los del runtime. En Vercel (UTC) y en
// dev local (UTC-3) el resultado es el mismo si tratamos los timestamps como
// si vivieran en UTC.

const PY_OFFSET_MS = 3 * 60 * 60 * 1000

// Devuelve "ahora" como Date estampado en wall-clock PY (mismo truco que
// `parseOrderInstant`), para comparar contra los `confirmedAt` del cache.
function nowPyStamped(): Date {
  const utcNow = Date.now()
  // PY = UTC-3 fijo desde 2024. Sumamos +3h al UTC para obtener wall-clock PY,
  // y luego re-extraemos componentes UTC para mantener la convención.
  const pyMs = utcNow - PY_OFFSET_MS
  return new Date(pyMs)
}

// Inicio del día PY (00:00) como Date estampado UTC.
function startOfPyDay(stamped: Date): Date {
  return new Date(
    Date.UTC(
      stamped.getUTCFullYear(),
      stamped.getUTCMonth(),
      stamped.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  )
}

// "YYYY-MM-DD" según los componentes UTC del Date estampado (= día PY).
function ymdStamped(stamped: Date): string {
  const y = stamped.getUTCFullYear()
  const m = String(stamped.getUTCMonth() + 1).padStart(2, "0")
  const d = String(stamped.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// ============================================================
// Tipos públicos
// ============================================================

export type OpsKpis = {
  totalToday: number
  totalYesterday: number
  totalThisWeek: number
  totalThisMonth: number
  finalizedToday: number
  cancelledToday: number
  cancellationRate: number // % hoy
  avgE2EMinutes: number | null
  avgPrepMinutes: number | null
  avgMatchingMinutes: number | null
}

export type OpsHourlyBucket = { hour: number; count: number }
export type OpsTopZone = { zone: string; count: number; cancelled: number }
export type OpsDailyTrend = {
  date: string
  total: number
  cancelled: number
  avgE2EMinutes: number | null
}

export type OpsSnapshot = {
  kpis: OpsKpis
  hourly: OpsHourlyBucket[]
  topZones: OpsTopZone[]
  dailyTrend: OpsDailyTrend[]
}

// ============================================================
// Helpers de rango
// ============================================================

function getDateRanges() {
  const now = nowPyStamped()
  const startToday = startOfPyDay(now)
  const startYesterday = new Date(startToday.getTime() - 24 * 60 * 60 * 1000)
  const endYesterday = new Date(startToday.getTime() - 1)
  const startWeek = new Date(startToday.getTime() - 6 * 24 * 60 * 60 * 1000)
  const startMonth = new Date(startToday.getTime() - 29 * 24 * 60 * 60 * 1000)
  return {
    now,
    startToday,
    startYesterday,
    endYesterday,
    startWeek,
    startMonth,
  }
}

// ============================================================
// KPIs
// ============================================================

export async function getOpsKpis(): Promise<OpsKpis> {
  const { startToday, startYesterday, endYesterday, startWeek, startMonth } =
    getDateRanges()

  const [
    totalToday,
    totalYesterday,
    totalThisWeek,
    totalThisMonth,
    finalizedToday,
    cancelledToday,
  ] = await Promise.all([
    prisma.monchisOrderCache.count({
      where: { confirmedAt: { gte: startToday } },
    }),
    prisma.monchisOrderCache.count({
      where: {
        confirmedAt: { gte: startYesterday, lte: endYesterday },
      },
    }),
    prisma.monchisOrderCache.count({
      where: { confirmedAt: { gte: startWeek } },
    }),
    prisma.monchisOrderCache.count({
      where: { confirmedAt: { gte: startMonth } },
    }),
    prisma.monchisOrderCache.count({
      where: { confirmedAt: { gte: startToday }, status: "FINALIZED" },
    }),
    prisma.monchisOrderCache.count({
      where: { confirmedAt: { gte: startToday }, status: "CANCELLED" },
    }),
  ])

  // Promedios timings sobre los últimos 7 días.
  // endToEndSeconds y acceptanceSeconds están pre-computados en la tabla.
  // prepSeconds NO está en la tabla — lo derivamos del rawData en una muestra
  // acotada (ver más abajo).
  const [e2eAgg, matchingAgg] = await Promise.all([
    prisma.monchisOrderCache.aggregate({
      where: {
        confirmedAt: { gte: startWeek },
        status: "FINALIZED",
        endToEndSeconds: { not: null },
      },
      _avg: { endToEndSeconds: true },
    }),
    prisma.monchisOrderCache.aggregate({
      where: {
        confirmedAt: { gte: startWeek },
        status: "FINALIZED",
        acceptanceSeconds: { not: null },
      },
      _avg: { acceptanceSeconds: true },
    }),
  ])

  // Para `prep` no hay columna dedicada — derivamos sobre una muestra de
  // los últimos 7d. Tomamos hasta 500 órdenes para que no sea costoso.
  // TODO(schema): considerar agregar `prepSeconds` a MonchisOrderCache si
  // este cálculo se vuelve frecuente en otros lugares.
  let avgPrepMinutes: number | null = null
  try {
    const sample = await prisma.monchisOrderCache.findMany({
      where: {
        confirmedAt: { gte: startWeek },
        status: "FINALIZED",
      },
      select: { rawData: true },
      take: 500,
      orderBy: { confirmedAt: "desc" },
    })
    const prepValues: number[] = []
    for (const row of sample) {
      const kpis = computeKpis(row.rawData as unknown as RawOrder)
      if (kpis.prep.seconds !== null) prepValues.push(kpis.prep.seconds)
    }
    if (prepValues.length > 0) {
      const avg = prepValues.reduce((a, b) => a + b, 0) / prepValues.length
      avgPrepMinutes = Math.round((avg / 60) * 10) / 10
    }
  } catch (err) {
    console.error("[dashboard-ops] prep sample falló:", err)
  }

  const e2eSec = e2eAgg._avg.endToEndSeconds
  const matchSec = matchingAgg._avg.acceptanceSeconds
  const avgE2EMinutes = e2eSec != null ? Math.round((e2eSec / 60) * 10) / 10 : null
  const avgMatchingMinutes =
    matchSec != null ? Math.round((matchSec / 60) * 10) / 10 : null

  const cancellationRate =
    totalToday > 0 ? Math.round((cancelledToday / totalToday) * 1000) / 10 : 0

  return {
    totalToday,
    totalYesterday,
    totalThisWeek,
    totalThisMonth,
    finalizedToday,
    cancelledToday,
    cancellationRate,
    avgE2EMinutes,
    avgPrepMinutes,
    avgMatchingMinutes,
  }
}

// ============================================================
// Distribución horaria (últimos N días, default 7)
// ============================================================

export async function getOpsHourly(days = 7): Promise<OpsHourlyBucket[]> {
  const { startToday } = getDateRanges()
  const from = new Date(startToday.getTime() - (days - 1) * 24 * 60 * 60 * 1000)

  const rows = await prisma.monchisOrderCache.findMany({
    where: { confirmedAt: { gte: from } },
    select: { confirmedAt: true },
  })

  const buckets = new Map<number, number>()
  for (let h = 0; h < 24; h++) buckets.set(h, 0)
  for (const r of rows) {
    if (!r.confirmedAt) continue
    // confirmedAt es Date estampado: componentes UTC = wall-clock PY.
    const hour = r.confirmedAt.getUTCHours()
    buckets.set(hour, (buckets.get(hour) ?? 0) + 1)
  }
  return Array.from(buckets.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour)
}

// ============================================================
// Top zonas (últimos N días)
// ============================================================
//
// LIMITACIÓN DE SCHEMA: `MonchisOrderCache` no tiene columna `zone` ni
// `zoneId`. La zona "real" del pedido vive en `rawData` (histories[i].zone_*)
// y en el panel live se obtiene del endpoint en vivo. Para una vista
// histórica usamos `branchName` como proxy ("zona" = sucursal de origen).
// TODO(schema): agregar `zoneId`/`zoneName` denormalizado al cache si esta
// vista se vuelve permanente.

export async function getOpsTopZones(
  days = 7,
  limit = 8,
): Promise<OpsTopZone[]> {
  const { startToday } = getDateRanges()
  const from = new Date(startToday.getTime() - (days - 1) * 24 * 60 * 60 * 1000)

  const [grouped, cancelledGrouped] = await Promise.all([
    prisma.monchisOrderCache.groupBy({
      by: ["branchName"],
      where: {
        confirmedAt: { gte: from },
        branchName: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { branchName: "desc" } },
      take: limit,
    }),
    prisma.monchisOrderCache.groupBy({
      by: ["branchName"],
      where: {
        confirmedAt: { gte: from },
        status: "CANCELLED",
        branchName: { not: null },
      },
      _count: { _all: true },
    }),
  ])

  const cancelledByBranch = new Map<string, number>()
  for (const g of cancelledGrouped) {
    if (!g.branchName) continue
    cancelledByBranch.set(g.branchName, g._count._all)
  }

  return grouped
    .filter((g) => g.branchName)
    .map((g) => ({
      zone: g.branchName as string,
      count: g._count._all,
      cancelled: cancelledByBranch.get(g.branchName as string) ?? 0,
    }))
}

// ============================================================
// Tendencia diaria (últimos N días, default 30)
// ============================================================

export async function getOpsDailyTrend(days = 30): Promise<OpsDailyTrend[]> {
  const { startToday } = getDateRanges()
  const from = new Date(startToday.getTime() - (days - 1) * 24 * 60 * 60 * 1000)

  const rows = await prisma.monchisOrderCache.findMany({
    where: { confirmedAt: { gte: from } },
    select: {
      confirmedAt: true,
      status: true,
      endToEndSeconds: true,
    },
  })

  // Inicializamos buckets vacíos para todos los días, así el gráfico es
  // continuo aunque algún día tenga 0 pedidos.
  const buckets = new Map<
    string,
    { total: number; cancelled: number; e2eSum: number; e2eCount: number }
  >()
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000)
    buckets.set(ymdStamped(d), { total: 0, cancelled: 0, e2eSum: 0, e2eCount: 0 })
  }

  for (const r of rows) {
    if (!r.confirmedAt) continue
    const key = ymdStamped(r.confirmedAt)
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.total++
    if (r.status === "CANCELLED") bucket.cancelled++
    if (r.endToEndSeconds != null && r.status === "FINALIZED") {
      bucket.e2eSum += r.endToEndSeconds
      bucket.e2eCount++
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({
      date,
      total: b.total,
      cancelled: b.cancelled,
      avgE2EMinutes:
        b.e2eCount > 0
          ? Math.round((b.e2eSum / b.e2eCount / 60) * 10) / 10
          : null,
    }))
}

// ============================================================
// Snapshot agregado (1 await desde el RSC padre)
// ============================================================

export async function getOpsSnapshot(): Promise<OpsSnapshot> {
  const [kpis, hourly, topZones, dailyTrend] = await Promise.all([
    getOpsKpis(),
    getOpsHourly(7),
    getOpsTopZones(7, 8),
    getOpsDailyTrend(30),
  ])
  return { kpis, hourly, topZones, dailyTrend }
}

// Re-exports útiles para consumidores
export { PY_TZ, formatInTimeZone, toZonedTime, startOfDay, subDays }
