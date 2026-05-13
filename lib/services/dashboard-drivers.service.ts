// lib/services/dashboard-drivers.service.ts
//
// Servicio del tab "Drivers" del dashboard admin.
// Snapshot/analytics (sin polling, sin real-time): se invoca desde un server
// component y devuelve todo lo necesario en una llamada (getDriversSnapshot).
//
// Cobertura (zona-hora) se calcula reusando la pasarela de turnos:
//   - fetchAllZoneShifts (lib/services/turnos.service) hace fetch a
//     api.monchis-drivers.com con revalidate de 10 minutos.
//   - buildHeatmap / hourlyAggregates (lib/services/turnos-aggregate) dan la
//     forma zona × hora con assigned/max/occupancy.

import { prisma } from '@/lib/prisma'
import { subDays, startOfDay, endOfDay, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { fetchAllZoneShifts } from '@/lib/services/turnos.service'
import { coversSlot } from '@/lib/services/turnos-aggregate'
import { TURNOS_HOURS } from '@/lib/config/turnos.config'
import type { FlattenedShift } from '@/lib/types/turnos.types'

export type DriversKpis = {
  totalActive: number
  newLast7Days: number
  newLast30Days: number
  docsPending: number
  docsRejected: number
  approvalRate: number // % docs aprobados / total procesados
  avgDocsPerDriver: number
}

export type CoverageZoneHour = {
  zone: string
  hour: number
  assigned: number
  max: number
  occupancy: number // 0..1
}

export type BonusSummary = {
  totalPaid: number
  totalAssigned: number
  topDrivers: Array<{ driverId: string; name: string | null; amount: number }>
}

export type DriversGrowthTrend = {
  date: string // dd MMM
  newDrivers: number
  cumulative: number
}

// FormDriverStatus considerados "activos" — postulación cerrada/operativa.
// IN_PROGRESS / ABANDONED / REJECTED quedan fuera.
const ACTIVE_STATUSES = [
  'COMPLETED',
  'SUBMITTED',
  'UNDER_REVIEW',
  'DOCS_PENDING',
  'APPROVED',
  'READY_ONBOARDING',
  'ONBOARDING',
  'ACTIVE',
] as const

export async function getDriversKpis(): Promise<DriversKpis> {
  const now = new Date()
  const sevenDaysAgo = subDays(now, 7)
  const thirtyDaysAgo = subDays(now, 30)

  const [
    totalActive,
    newLast7Days,
    newLast30Days,
    docsPending,
    docsRejected,
    docsApproved,
    docsTotalProcessed,
    totalDocs,
    totalDriversWithDocs,
  ] = await Promise.all([
    prisma.formDriver.count({
      where: { status: { in: [...ACTIVE_STATUSES] } },
    }),
    prisma.formDriver.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.formDriver.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.formDocument.count({ where: { status: 'PENDING' } }),
    prisma.formDocument.count({ where: { status: 'REJECTED' } }),
    prisma.formDocument.count({ where: { status: 'APPROVED' } }),
    prisma.formDocument.count({
      where: { status: { in: ['APPROVED', 'REJECTED'] } },
    }),
    prisma.formDocument.count(),
    prisma.formDocument
      .groupBy({ by: ['formDriverId'] })
      .then((rows) => rows.length),
  ])

  const approvalRate =
    docsTotalProcessed > 0
      ? Math.round((docsApproved / docsTotalProcessed) * 100)
      : 0

  const avgDocsPerDriver =
    totalDriversWithDocs > 0
      ? Math.round((totalDocs / totalDriversWithDocs) * 10) / 10
      : 0

  return {
    totalActive,
    newLast7Days,
    newLast30Days,
    docsPending,
    docsRejected,
    approvalRate,
    avgDocsPerDriver,
  }
}

export async function getCoverageHeatmap(): Promise<CoverageZoneHour[]> {
  let shifts: FlattenedShift[] = []
  try {
    const res = await fetchAllZoneShifts()
    shifts = res.shifts
  } catch {
    // Si la API de turnos falla (red local bloqueada, token ausente, etc.),
    // devolvemos vacío en lugar de tirar el dashboard entero.
    return []
  }

  if (!shifts.length) return []

  // Solo el día "más cubierto" en la pasarela: nos quedamos con la fecha que
  // tiene más shifts (suele ser hoy o el primer día con datos).
  const byDate = new Map<string, number>()
  for (const s of shifts) byDate.set(s.dateIso, (byDate.get(s.dateIso) || 0) + 1)
  const targetDate = [...byDate.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const dayShifts = targetDate
    ? shifts.filter((s) => s.dateIso === targetDate)
    : shifts

  const zones = Array.from(new Set(dayShifts.map((s) => s.zoneName))).sort(
    (a, b) => a.localeCompare(b, 'es'),
  )
  const slots = TURNOS_HOURS.slice(0, -1) // 8..23

  const out: CoverageZoneHour[] = []
  for (const zone of zones) {
    const zoneShifts = dayShifts.filter((s) => s.zoneName === zone)
    for (const hour of slots) {
      const covering = zoneShifts.filter((s) => coversSlot(s, hour))
      const assigned = covering.reduce((a, s) => a + s.driversAssigned, 0)
      const max = covering.reduce((a, s) => a + s.maxDrivers, 0)
      out.push({
        zone,
        hour,
        assigned,
        max,
        occupancy: max > 0 ? assigned / max : 0,
      })
    }
  }
  return out
}

export async function getBonusSummary(days = 30): Promise<BonusSummary> {
  const since = subDays(new Date(), days)

  const assignments = await prisma.bonusAssignment.findMany({
    where: { bonusDate: { gte: since } },
    select: {
      driverCedula: true,
      driverName: true,
      bonusAmount: true,
    },
  })

  let totalPaid = 0
  const byDriver = new Map<string, { name: string | null; amount: number }>()
  for (const a of assignments) {
    const amount = Number(a.bonusAmount)
    totalPaid += amount
    const cur = byDriver.get(a.driverCedula) || { name: a.driverName, amount: 0 }
    cur.amount += amount
    if (!cur.name && a.driverName) cur.name = a.driverName
    byDriver.set(a.driverCedula, cur)
  }

  const topDrivers = [...byDriver.entries()]
    .map(([driverId, v]) => ({ driverId, name: v.name, amount: v.amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  return {
    totalPaid: Math.round(totalPaid),
    totalAssigned: assignments.length,
    topDrivers,
  }
}

export async function getDriversGrowth(
  days = 90,
): Promise<DriversGrowthTrend[]> {
  const end = new Date()
  const start = subDays(end, days)

  const drivers = await prisma.formDriver.findMany({
    where: {
      createdAt: {
        gte: startOfDay(start),
        lte: endOfDay(end),
      },
    },
    select: { createdAt: true },
  })

  // Total previo al rango → punto de arranque del acumulado.
  const baseline = await prisma.formDriver.count({
    where: { createdAt: { lt: startOfDay(start) } },
  })

  const perDay = new Map<string, number>()
  for (const d of drivers) {
    const key = format(d.createdAt, 'yyyy-MM-dd')
    perDay.set(key, (perDay.get(key) || 0) + 1)
  }

  const out: DriversGrowthTrend[] = []
  let cumulative = baseline
  const cursor = new Date(startOfDay(start))
  const endDay = startOfDay(end)
  while (cursor <= endDay) {
    const key = format(cursor, 'yyyy-MM-dd')
    const newDrivers = perDay.get(key) || 0
    cumulative += newDrivers
    out.push({
      date: format(cursor, 'dd MMM', { locale: es }),
      newDrivers,
      cumulative,
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

export async function getDriversSnapshot(): Promise<{
  kpis: DriversKpis
  coverage: CoverageZoneHour[]
  bonus: BonusSummary
  growth: DriversGrowthTrend[]
}> {
  const [kpis, coverage, bonus, growth] = await Promise.all([
    getDriversKpis(),
    getCoverageHeatmap(),
    getBonusSummary(),
    getDriversGrowth(),
  ])
  return { kpis, coverage, bonus, growth }
}
