// app/admin/page.tsx

import { dashboardService } from "@/lib/services/dashboard.service"
import { DashboardContentV2 } from "@/components/admin/dashboard-content-v2"
import { inferGroupBy } from "@/lib/utils/dashboard-group-by"

export const revalidate = 60 // Revalidar cada minuto

interface PageProps {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
    filterType?: 'created' | 'completed' | 'event'
  }>
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

  const allStats = await dashboardService.getAllStats({
    startDate,
    endDate,
    groupBy,
  })

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
      currentStartDate={params.startDate}
      currentEndDate={params.endDate}
      currentFilterType={params.filterType}
      currentGroupBy={groupBy}
    />
  )
}
