// components/admin/dashboard-content-v2.tsx
"use client"

import { useState } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { OnboardingDateFilter } from "@/components/admin/dashboard/onboarding-date-filter"
import { OnboardingTabContent } from "@/components/admin/dashboard/onboarding-tab-content"
import { OperacionesTab } from "@/components/admin/dashboard/operaciones-tab"
import { DriversTab } from "@/components/admin/dashboard/drivers-tab"
import { AlertasTab } from "@/components/admin/dashboard/alertas-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Activity, Bike, GraduationCap, BellRing } from "lucide-react"
import type { OpsSnapshot } from "@/lib/services/dashboard-ops.service"
import type {
  DriversKpis,
  CoverageZoneHour,
  BonusSummary,
  DriversGrowthTrend,
} from "@/lib/services/dashboard-drivers.service"
import type {
  AlertsCounts,
  OrderSignalAlert,
  NoShowAlert,
  StuckDocAlert,
} from "@/lib/services/dashboard-alerts.service"

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
  opsSnapshot: OpsSnapshot
  driversSnapshot: {
    kpis: DriversKpis
    coverage: CoverageZoneHour[]
    bonus: BonusSummary
    growth: DriversGrowthTrend[]
  }
  alertsSnapshot: {
    counts: AlertsCounts
    orderSignals: OrderSignalAlert[]
    noShows: NoShowAlert[]
    stuckDocs: StuckDocAlert[]
  }
  currentStartDate?: string
  currentEndDate?: string
  currentFilterType?: 'created' | 'completed' | 'event'
  currentGroupBy?: 'day' | 'week' | 'month'
}

type ActiveTab = "onboarding" | "operaciones" | "drivers" | "alertas"

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
  opsSnapshot,
  driversSnapshot,
  alertsSnapshot,
  currentStartDate,
  currentEndDate,
  currentFilterType = 'created',
  currentGroupBy = 'week',
}: DashboardContentV2Props) {
  // Onboarding es el tab principal y default. Los demás son tabs secundarios
  // que reusan snapshots cacheados desde `/admin/gestion/*` para vistas de
  // analytics histórico — el real-time vive en `/admin/gestion/live`.
  const [activeTab, setActiveTab] = useState<ActiveTab>("onboarding")

  const criticalAlertsCount = alertsSnapshot.counts.totalCritical

  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader breadcrumbs={[{ label: "Dashboard" }]} />

      <div className="flex-1 p-8 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Centro de analytics: onboarding, operaciones, drivers y alertas
            </p>
          </div>

          {/* El filtro de fechas solo aplica al tab Onboarding.
              Los otros tabs leen snapshots con rangos internos fijos. */}
          {activeTab === "onboarding" && (
            <OnboardingDateFilter
              currentStartDate={currentStartDate}
              currentEndDate={currentEndDate}
              currentFilterType={currentFilterType}
            />
          )}
        </div>

        {/* Tabs top-level */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ActiveTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="onboarding" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Onboarding</span>
            </TabsTrigger>
            <TabsTrigger value="operaciones" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Operaciones</span>
            </TabsTrigger>
            <TabsTrigger value="drivers" className="flex items-center gap-2">
              <Bike className="h-4 w-4" />
              <span className="hidden sm:inline">Drivers</span>
            </TabsTrigger>
            <TabsTrigger value="alertas" className="flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              <span className="hidden sm:inline">Alertas</span>
              {criticalAlertsCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 h-5 min-w-5 px-1.5 text-[10px] leading-none"
                >
                  {criticalAlertsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="onboarding" className="space-y-6">
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
            />
          </TabsContent>

          <TabsContent value="operaciones" className="space-y-6">
            <OperacionesTab snapshot={opsSnapshot} />
          </TabsContent>

          <TabsContent value="drivers" className="space-y-6">
            <DriversTab snapshot={driversSnapshot} />
          </TabsContent>

          <TabsContent value="alertas" className="space-y-6">
            <AlertasTab snapshot={alertsSnapshot} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
