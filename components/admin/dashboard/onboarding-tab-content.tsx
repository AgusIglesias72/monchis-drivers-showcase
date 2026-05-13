"use client"

// Tab "Onboarding" del Dashboard admin (rediseño denso).
//
// Orquesta los sub-bloques rediseñados:
//   - KpiStrip            franja horizontal con 6 mini-KPIs
//   - FunnelVertical      funnel real (filas con barras + % conversion)
//   - AbandonosRanked     top 5 steps con más abandonos
//   - StagesTrendChart    LineChart limpio con toggle de etapas extras
//   - DocsStatusCompact   donut compacto + lista lateral
//   - PostulacionesTrend  BarChart iniciadas vs completadas (height baja)
//   - AsistenciasBlock    gauge presentismo + stacked bar + mini trend
//   - DemografiaHorizontal  rangos etarios en una sola barra horizontal
//
// El componente recibe los mismos datos que antes salían del bloque
// `onboardingContent` en dashboard-content-v2.tsx — la integración la hace
// otro paso.

import { KpiStrip } from "./onboarding/kpi-strip"
import { FunnelVertical } from "./onboarding/funnel-vertical"
import { AbandonosRanked } from "./onboarding/abandonos-ranked"
import { StagesTrendChart } from "./onboarding/stages-trend-chart"
import { DocsStatusCompact } from "./onboarding/docs-status-compact"
import { PostulacionesTrend } from "./onboarding/postulaciones-trend"
import { AsistenciasBlock } from "./onboarding/asistencias-block"
import { DemografiaHorizontal } from "./onboarding/demografia-horizontal"

interface OnboardingTabContentProps {
  mainStats: {
    manualReviewDocs: number
    rejectedDocs: number
    pendingDocs: number
  }
  postulacionesStats: {
    totalPostulaciones: number
    completadas: number
    enProgreso?: number
  }
  funnelData: Array<{ step: string | number; count: number; label?: string }>
  visitasPorSemana: Array<{
    semana: string
    visitas: number
    completados?: number
  }>
  completadosPorSemana: Array<{ semana: string; completados: number }>
  abandonoPorStep: Array<{ label: string; abandonos: number }>
  edadesPorRango: Array<{
    rango: string
    cantidad: number
    porcentaje: number
    fill: string
  }>
  onboardingStats: {
    inProgressDrivers: number
    completedThisMonth: number
    noShows?: number
  }
  asistenciasPorPeriodo: Array<{
    periodo: string
    asistieron: number
    noAsistieron: number
    programados: number
    total: number
    tasaPresentismo: number
  }>
  distribucionEstadosAsistencias: Array<{
    status: string
    label: string
    cantidad: number
    porcentaje: number
    fill: string
  }>
  asistenciasProgramadasVsRealizadas: {
    totalProgramadas: number
    asistieron: number
    noAsistieron: number
    canceladas: number
    pendientes: number
    tasaPresentismo: number
    resueltas: number
    porResolver: number
  }
  evolucionDiariaPostulaciones: any[]
  evolucionPorEtapa: Array<{
    dia: string
    total?: number
    "1. Contacto Básico"?: number
    "2. Datos Personales"?: number
    "3. Trabajo y Vehículo"?: number
    "4. Documentos"?: number
    "5. Info Adicional"?: number
    "6. Pago de Equipamiento"?: number
    Completadas?: number
  }>
  currentGroupBy?: "day" | "week" | "month"
}

export function OnboardingTabContent({
  mainStats,
  postulacionesStats,
  funnelData,
  visitasPorSemana,
  abandonoPorStep,
  edadesPorRango,
  onboardingStats,
  asistenciasPorPeriodo,
  distribucionEstadosAsistencias,
  asistenciasProgramadasVsRealizadas,
  evolucionPorEtapa,
  currentGroupBy = "week",
}: OnboardingTabContentProps) {
  // El funnel espera { step, count }; el service entrega también `label` pero
  // funnel-vertical solo usa count por índice. Normalizamos para tipar.
  const funnel = funnelData.map((f) => ({
    step: String(f.step ?? ""),
    count: f.count ?? 0,
  }))

  return (
    <div className="space-y-6">
      <KpiStrip
        postulacionesStats={postulacionesStats}
        onboardingStats={onboardingStats}
        mainStats={mainStats}
        asistenciasProgramadasVsRealizadas={asistenciasProgramadasVsRealizadas}
      />

      <div className="grid grid-cols-12 gap-6">
        <FunnelVertical
          funnelData={funnel}
          postulacionesStats={postulacionesStats}
          onboardingStats={onboardingStats}
          className="col-span-12 lg:col-span-7"
        />
        <AbandonosRanked
          abandonoPorStep={abandonoPorStep}
          className="col-span-12 lg:col-span-5"
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <StagesTrendChart
          evolucionPorEtapa={evolucionPorEtapa}
          className="col-span-12 lg:col-span-8"
        />
        <DocsStatusCompact
          mainStats={mainStats}
          className="col-span-12 lg:col-span-4"
        />
      </div>

      <PostulacionesTrend
        visitasPorSemana={visitasPorSemana}
        currentGroupBy={currentGroupBy}
      />

      <AsistenciasBlock
        asistenciasPorPeriodo={asistenciasPorPeriodo}
        distribucionEstadosAsistencias={distribucionEstadosAsistencias}
        asistenciasProgramadasVsRealizadas={asistenciasProgramadasVsRealizadas}
      />

      <DemografiaHorizontal edadesPorRango={edadesPorRango} />
    </div>
  )
}
