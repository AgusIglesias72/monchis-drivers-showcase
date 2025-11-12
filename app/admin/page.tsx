// app/admin/page.tsx

import { dashboardService } from "@/lib/services/dashboard.service"
import { DashboardContent } from "@/components/admin/dashboard-content"

export const revalidate = 60 // Revalidar cada minuto

interface PageProps {
  searchParams: Promise<{
    dateRange?: string
    startDate?: string
    endDate?: string
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
  } else if (params.dateRange) {
    // Botón rápido
    const today = new Date()
    endDate = new Date(today)
    endDate.setHours(23, 59, 59, 999)
    
    const days = parseInt(params.dateRange)
    if (!isNaN(days)) {
      startDate = new Date(today)
      startDate.setDate(today.getDate() - days)
      startDate.setHours(0, 0, 0, 0)
    }
  }
  
  // Obtener todas las stats en paralelo con filtros de fecha
  const allStats = await dashboardService.getAllStats({
    startDate,
    endDate,
  })
  
  return (
    <DashboardContent
      mainStats={allStats.mainStats}
      postulacionesStats={allStats.postulacionesStats}
      funnelData={allStats.funnelData}
      visitasPorSemana={allStats.visitasPorSemana}
      completadosPorSemana={allStats.completadosPorSemana}
      abandonoPorStep={allStats.abandonoPorStep}
      edadesPorRango={allStats.edadesPorRango}
      onboardingStats={allStats.onboardingStats}
      currentDateRange={params.dateRange || '30'}
      customStartDate={params.startDate}
      customEndDate={params.endDate}
    />
  )
}