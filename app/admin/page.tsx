// app/admin/page.tsx

import { dashboardService } from "@/lib/services/dashboard.service"
import { DashboardContentV2 } from "@/components/admin/dashboard-content-v2"
import { inferGroupBy } from "@/lib/utils/dashboard-group-by"
import {
  getOpsSnapshot,
  type OpsSnapshot,
} from "@/lib/services/dashboard-ops.service"
import {
  getDriversSnapshot,
  type DriversKpis,
  type CoverageZoneHour,
  type BonusSummary,
  type DriversGrowthTrend,
} from "@/lib/services/dashboard-drivers.service"
import {
  getAlertsSnapshot,
  type AlertsCounts,
  type OrderSignalAlert,
  type NoShowAlert,
  type StuckDocAlert,
} from "@/lib/services/dashboard-alerts.service"

export const revalidate = 60 // Revalidar cada minuto

interface PageProps {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
    filterType?: 'created' | 'completed' | 'event'
  }>
}

// Fallback "vacío" para cada snapshot nuevo. Si el servicio truena en build/runtime
// (DB vacía, fetch a la pasarela caído, etc.) seguimos renderizando el resto del
// dashboard y el tab muestra su empty state.
const EMPTY_OPS_SNAPSHOT: OpsSnapshot = {
  kpis: {
    totalToday: 0,
    totalYesterday: 0,
    totalThisWeek: 0,
    totalThisMonth: 0,
    finalizedToday: 0,
    cancelledToday: 0,
    cancellationRate: 0,
    avgE2EMinutes: null,
    avgPrepMinutes: null,
    avgMatchingMinutes: null,
  },
  hourly: [],
  topZones: [],
  dailyTrend: [],
}

const EMPTY_DRIVERS_SNAPSHOT: {
  kpis: DriversKpis
  coverage: CoverageZoneHour[]
  bonus: BonusSummary
  growth: DriversGrowthTrend[]
} = {
  kpis: {
    totalActive: 0,
    newLast7Days: 0,
    newLast30Days: 0,
    docsPending: 0,
    docsRejected: 0,
    approvalRate: 0,
    avgDocsPerDriver: 0,
  },
  coverage: [],
  bonus: { totalPaid: 0, totalAssigned: 0, topDrivers: [] },
  growth: [],
}

const EMPTY_ALERTS_SNAPSHOT: {
  counts: AlertsCounts
  orderSignals: OrderSignalAlert[]
  noShows: NoShowAlert[]
  stuckDocs: StuckDocAlert[]
} = {
  counts: {
    orderSignals: { total: 0, byType: {} },
    noShowsLast7Days: 0,
    stuckDocs: 0,
    totalCritical: 0,
  },
  orderSignals: [],
  noShows: [],
  stuckDocs: [],
}

async function safeOpsSnapshot(): Promise<OpsSnapshot> {
  try {
    return await getOpsSnapshot()
  } catch (err) {
    console.error("[admin/page] getOpsSnapshot fallo:", err)
    return EMPTY_OPS_SNAPSHOT
  }
}

async function safeDriversSnapshot() {
  try {
    return await getDriversSnapshot()
  } catch (err) {
    console.error("[admin/page] getDriversSnapshot fallo:", err)
    return EMPTY_DRIVERS_SNAPSHOT
  }
}

async function safeAlertsSnapshot() {
  try {
    return await getAlertsSnapshot()
  } catch (err) {
    console.error("[admin/page] getAlertsSnapshot fallo:", err)
    return EMPTY_ALERTS_SNAPSHOT
  }
}

export default async function AdminDashboard({ searchParams }: PageProps) {
  const params = await searchParams

  // Determinar el rango de fechas
  let startDate: Date | undefined
  let endDate: Date | undefined

  if (params.startDate && params.endDate) {
    // Filtro personalizado
    startDate = new Date(params.startDate)
    endDate = new Date(params.endDate)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
  }

  // groupBy se auto-deriva del rango (≤21d → day, ≤120d → week, else → month).
  const groupBy = inferGroupBy(startDate, endDate)

  // Fetch paralelo: stats de onboarding (con filtros) + snapshots cacheados
  // de los 3 tabs nuevos (que ya manejan sus propios rangos internos).
  const [allStats, opsSnapshot, driversSnapshot, alertsSnapshot] =
    await Promise.all([
      dashboardService.getAllStats({
        startDate,
        endDate,
        groupBy,
      }),
      safeOpsSnapshot(),
      safeDriversSnapshot(),
      safeAlertsSnapshot(),
    ])

  return (
    <DashboardContentV2
      mainStats={allStats.mainStats}
      postulacionesStats={allStats.postulacionesStats}
      funnelData={allStats.funnelData}
      visitasPorSemana={allStats.visitasPorSemana}
      completadosPorSemana={allStats.completadosPorSemana}
      abandonoPorStep={allStats.abandonoPorStep}
      edadesPorRango={allStats.edadesPorRango}
      onboardingStats={allStats.onboardingStats}
      asistenciasPorPeriodo={allStats.asistenciasPorPeriodo}
      distribucionEstadosAsistencias={allStats.distribucionEstadosAsistencias}
      asistenciasProgramadasVsRealizadas={allStats.asistenciasProgramadasVsRealizadas}
      evolucionDiariaPostulaciones={allStats.evolucionDiariaPostulaciones}
      evolucionPorEtapa={allStats.evolucionPorEtapa}
      opsSnapshot={opsSnapshot}
      driversSnapshot={driversSnapshot}
      alertsSnapshot={alertsSnapshot}
      currentStartDate={params.startDate}
      currentEndDate={params.endDate}
      currentFilterType={params.filterType}
      currentGroupBy={groupBy}
    />
  )
}
