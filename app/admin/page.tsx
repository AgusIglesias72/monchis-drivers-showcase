// app/admin/page.tsx

import { dashboardStatsService } from "@/lib/services/dashboard-stats.service"
import { DashboardKPIs } from "@/components/admin/dashboard-kpis"

export const revalidate = 30 // Revalidar cada 30 segundos

export default async function AdminDashboard() {
  const stats = await dashboardStatsService.getStats()

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Vista general del sistema de gestión
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <DashboardKPIs stats={stats} />

      {/* Sección de acciones rápidas */}
      <div className="grid gap-4 md:grid-cols-2 mt-8">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Acciones Pendientes</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-md hover:bg-accent cursor-pointer">
              <span className="text-sm">Revisar documentos manualmente</span>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">
                {stats.manualReviewDocs}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md hover:bg-accent cursor-pointer">
              <span className="text-sm">Ver nuevos postulantes</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                {stats.newDrivers}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Resumen Semanal</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Documentos procesados</span>
                <span className="text-sm font-bold">{stats.processedThisWeek}</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all" 
                  style={{ width: `${Math.min(stats.processedThisWeek * 2, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tasa de aprobación</span>
                <span className="text-sm font-bold">{stats.approvalRate}%</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-green-500 h-full transition-all" 
                  style={{ width: `${stats.approvalRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}