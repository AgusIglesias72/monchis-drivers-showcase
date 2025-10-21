// app/admin/page.tsx

import { dashboardService } from "@/lib/services/dashboard.service"
import { DashboardContent } from "@/components/admin/dashboard-content"

export const revalidate = 60 // Revalidar cada minuto

export default async function AdminDashboard() {
  // Obtener todas las stats en paralelo
  const allStats = await dashboardService.getAllStats()
  
  return (
    <DashboardContent
      mainStats={allStats.mainStats}
      postulacionesStats={allStats.postulacionesStats}
      funnelData={allStats.funnelData}
      visitasPorDia={allStats.visitasPorDia}
      completadosPorDia={allStats.completadosPorDia}
      abandonoPorStep={allStats.abandonoPorStep}
      edadesPorRango={allStats.edadesPorRango}
      onboardingStats={allStats.onboardingStats}
    />
  )
}