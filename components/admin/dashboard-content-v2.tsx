// components/admin/dashboard-content-v2.tsx
"use client"

import { useState } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { OnboardingDateFilter } from "@/components/admin/dashboard/onboarding-date-filter"
import { OnboardingTabContent } from "@/components/admin/dashboard/onboarding-tab-content"

interface DashboardContentV2Props {
  mainStats: any
  postulacionesStats: any
  funnelData: any[]
  visitasPorSemana: any[]
  completadosPorSemana: any[]
  abandonoPorStep: any[]
  edadesPorRango: any[]
  onboardingStats: any
  asistenciasPorPeriodo: any[]
  distribucionEstadosAsistencias: any[]
  asistenciasProgramadasVsRealizadas: any
  evolucionDiariaPostulaciones: any[]
  evolucionPorEtapa: any[]
  currentStartDate?: string
  currentEndDate?: string
  currentFilterType?: 'created' | 'completed' | 'event'
  currentGroupBy?: 'day' | 'week' | 'month'
}

export function DashboardContentV2({
  mainStats,
  postulacionesStats,
  funnelData,
  visitasPorSemana,
  completadosPorSemana,
  abandonoPorStep,
  edadesPorRango,
  onboardingStats,
  asistenciasPorPeriodo,
  distribucionEstadosAsistencias,
  asistenciasProgramadasVsRealizadas,
  evolucionDiariaPostulaciones,
  evolucionPorEtapa,
  currentStartDate,
  currentEndDate,
  currentFilterType = 'created',
  currentGroupBy = 'week',
}: DashboardContentV2Props) {
  // `isFiltering` lo prende el filtro de fechas mientras se hace la
  // re-navegación SSR. Lo usamos para pintar skeletons en los charts y dar
  // feedback de "estamos recargando con el nuevo rango".
  const [isFiltering, setIsFiltering] = useState(false)

  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader breadcrumbs={[{ label: "Dashboard" }]} />

      <div className="flex-1 p-8 space-y-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Centro de analytics de onboarding
            </p>
          </div>

          <OnboardingDateFilter
            currentStartDate={currentStartDate}
            currentEndDate={currentEndDate}
            currentFilterType={currentFilterType}
            onPendingChange={setIsFiltering}
          />
        </div>

        <OnboardingTabContent
          mainStats={mainStats}
          postulacionesStats={postulacionesStats}
          funnelData={funnelData}
          visitasPorSemana={visitasPorSemana}
          completadosPorSemana={completadosPorSemana}
          abandonoPorStep={abandonoPorStep}
          edadesPorRango={edadesPorRango}
          onboardingStats={onboardingStats}
          asistenciasPorPeriodo={asistenciasPorPeriodo}
          distribucionEstadosAsistencias={distribucionEstadosAsistencias}
          asistenciasProgramadasVsRealizadas={asistenciasProgramadasVsRealizadas}
          evolucionDiariaPostulaciones={evolucionDiariaPostulaciones}
          evolucionPorEtapa={evolucionPorEtapa}
          currentGroupBy={currentGroupBy}
          isLoading={isFiltering}
        />
      </div>
    </div>
  )
}
