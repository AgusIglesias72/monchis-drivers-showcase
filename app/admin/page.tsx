// app/admin/page.tsx

import { postulacionesStatsService } from "@/lib/services/postulaciones-stats.service"
import { DashboardPostulaciones } from "@/components/admin/dashboard-postulaciones"

export const revalidate = 30 // Revalidar cada 30 segundos

export default async function AdminDashboard() {
  const [
    stats,
    funnelData,
    visitasPorDia,
    completadosPorDia,
    abandonoPorStep,
    edadesPorRango
  ] = await Promise.all([
    postulacionesStatsService.getStats(),
    postulacionesStatsService.getFunnelData(),
    postulacionesStatsService.getVisitasPorDia(),
    postulacionesStatsService.getCompletadosPorDia(),
    postulacionesStatsService.getAbandonoPorStep(),
    postulacionesStatsService.getEdadesPorRango()
  ])
  
  return (
    <DashboardPostulaciones
      stats={stats}
      funnelData={funnelData}
      visitasPorDia={visitasPorDia}
      completadosPorDia={completadosPorDia}
      abandonoPorStep={abandonoPorStep}
      edadesPorRango={edadesPorRango}
    />
  )
}