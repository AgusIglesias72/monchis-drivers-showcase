// components/admin/dashboard-content-v2.tsx
"use client"

import { useState } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { DashboardFilters } from "@/components/admin/dashboard-filters"
import { DashboardTabs } from "@/components/admin/dashboard-tabs"
import { DashboardKpisImproved } from "@/components/admin/dashboard-kpis-improved"
import { AsistenciasCharts } from "@/components/admin/asistencias-charts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  CheckCircle,
  TrendingDown,
  Activity,
  FileCheck,
  FileX,
  FileClock,
  AlertCircle,
  TrendingUp,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Pie,
  PieChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  Legend,
} from "recharts"
import { motion } from "framer-motion"

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

const CustomFunnelTooltip = ({ active, payload, fullFunnelData }: any) => {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload
  const currentValue = data.value
  const currentIndex = fullFunnelData.findIndex((item: any) => item.step === data.step)

  const totalIniciadas = fullFunnelData[0]?.value || 1
  const porcentajeTotal = ((currentValue / totalIniciadas) * 100).toFixed(1)

  let porcentajeAnterior = null
  if (currentIndex > 0) {
    const valorAnterior = fullFunnelData[currentIndex - 1]?.value || 1
    porcentajeAnterior = ((currentValue / valorAnterior) * 100).toFixed(1)
  }

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-4 min-w-[220px]">
      <div className="font-bold text-base mb-3 text-gray-900 dark:text-gray-100">
        {data.step}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Cantidad:</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {currentValue.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">% del total:</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {porcentajeTotal}%
          </span>
        </div>
        {porcentajeAnterior !== null && (
          <div className="flex justify-between items-center gap-4 pt-1 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">% del anterior:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {porcentajeAnterior}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
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
  // Preparar datos para el funnel completo
  const totalIniciadas = postulacionesStats.totalPostulaciones

  const fullFunnelData = [
    { step: "Iniciado", value: totalIniciadas, fill: "#3b82f6" },
    { step: "Contacto", value: funnelData[0]?.count || 0, fill: "#2563eb" },
    { step: "Datos Personales", value: funnelData[1]?.count || 0, fill: "#1d4ed8" },
    { step: "Trabajo", value: funnelData[2]?.count || 0, fill: "#1e40af" },
    { step: "Documentos", value: funnelData[3]?.count || 0, fill: "#1e3a8a" },
    { step: "Info Adicional", value: funnelData[4]?.count || 0, fill: "#172554" },
    { step: "Pago Equip.", value: funnelData[5]?.count || 0, fill: "#0f172a" },
    { step: "Completado", value: postulacionesStats.completadas, fill: "#10b981" },
    { step: "Agendado", value: onboardingStats.inProgressDrivers, fill: "#059669" },
    { step: "Asistido", value: onboardingStats.completedThisMonth, fill: "#047857" },
  ]

  const tasaConversionTotal = totalIniciadas > 0
    ? ((onboardingStats.completedThisMonth / totalIniciadas) * 100).toFixed(1)
    : "0"

  // Preparar datos para el gráfico de documentos
  const documentosData = [
    {
      name: 'Aprobados',
      value: mainStats.manualReviewDocs > 0 ? mainStats.manualReviewDocs : 0,
      fill: '#10b981',
    },
    {
      name: 'Rechazados',
      value: mainStats.rejectedDocs,
      fill: '#ef4444',
    },
    {
      name: 'Pendientes',
      value: mainStats.pendingDocs,
      fill: '#f59e0b',
    },
  ]

  const totalDocumentos = documentosData.reduce((sum, item) => sum + item.value, 0)

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent === 0) return null
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180)
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-bold text-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  // Estado para controlar qué capas están visibles
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    'Completadas': true,
    '6. Pago de Equipamiento': true,
    '5. Info Adicional': true,
    '4. Documentos': true,
    '3. Trabajo y Vehículo': true,
    '2. Datos Personales': true,
    '1. Contacto Básico': true,
  })

  // Mapeo de colores por etapa
  const stageColors: Record<string, string> = {
    'Completadas': '#10b981',
    '6. Pago de Equipamiento': '#0f172a',
    '5. Info Adicional': '#172554',
    '4. Documentos': '#1e3a8a',
    '3. Trabajo y Vehículo': '#1e40af',
    '2. Datos Personales': '#1d4ed8',
    '1. Contacto Básico': '#2563eb',
  }

  const toggleLayer = (layer: string) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }))
  }

  // CONTENIDO DE LOS TABS

  // Tab General
  const generalContent = (
    <div className="space-y-6">
      {/* KPIs mejorados */}
      <DashboardKpisImproved
        postulacionesStats={postulacionesStats}
        onboardingStats={onboardingStats}
        asistenciasProgramadasVsRealizadas={asistenciasProgramadasVsRealizadas}
      />

      {/* Gráfico de evolución por etapa - Full Width con Stacked Area e interactivo */}
      <Card>
        <CardHeader>
          <div className="space-y-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                Distribución de Postulaciones por Etapa
              </CardTitle>
              <CardDescription>
                Total de completaciones de cada etapa por día
              </CardDescription>
            </div>

            {/* Botones de toggle para cada capa - Ancho completo */}
            <div className="flex flex-wrap gap-2 w-full">
              {Object.entries(visibleLayers).map(([layer, visible]) => (
                <Button
                  key={layer}
                  variant={visible ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleLayer(layer)}
                  className="text-xs h-7"
                  style={
                    visible
                      ? {
                          backgroundColor: stageColors[layer],
                          borderColor: stageColors[layer],
                          color: 'white',
                        }
                      : {
                          borderColor: stageColors[layer],
                          color: stageColors[layer],
                        }
                  }
                >
                  {layer}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={evolucionPorEtapa}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload || !payload.length) return null

                  // Ordenar el payload en el orden deseado
                  const sortOrder = [
                    '1. Contacto Básico',
                    '2. Datos Personales',
                    '3. Trabajo y Vehículo',
                    '4. Documentos',
                    '5. Info Adicional',
                    '6. Pago de Equipamiento',
                    'Completadas'
                  ]

                  const sortedPayload = payload
                    .filter((entry: any) => visibleLayers[entry.dataKey])
                    .sort((a: any, b: any) => {
                      return sortOrder.indexOf(a.dataKey) - sortOrder.indexOf(b.dataKey)
                    })

                  return (
                    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-2 text-xs">
                      <div className="font-bold mb-1 text-gray-900 dark:text-gray-100">
                        {label}
                      </div>
                      <div className="space-y-0.5">
                        {sortedPayload.map((entry: any, index: number) => (
                          <div key={index} className="flex justify-between items-center gap-3">
                            <span className="flex items-center gap-1.5">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.fill }}
                              />
                              <span className="text-gray-600 dark:text-gray-400">
                                {entry.dataKey}:
                              </span>
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {entry.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }}
              />
              {visibleLayers['Completadas'] && (
                <Area
                  type="monotone"
                  dataKey="Completadas"
                  stackId="1"
                  stroke={stageColors['Completadas']}
                  fill={stageColors['Completadas']}
                  fillOpacity={0.8}
                />
              )}
              {visibleLayers['6. Pago de Equipamiento'] && (
                <Area
                  type="monotone"
                  dataKey="6. Pago de Equipamiento"
                  stackId="1"
                  stroke={stageColors['6. Pago de Equipamiento']}
                  fill={stageColors['6. Pago de Equipamiento']}
                  fillOpacity={0.6}
                />
              )}
              {visibleLayers['5. Info Adicional'] && (
                <Area
                  type="monotone"
                  dataKey="5. Info Adicional"
                  stackId="1"
                  stroke={stageColors['5. Info Adicional']}
                  fill={stageColors['5. Info Adicional']}
                  fillOpacity={0.6}
                />
              )}
              {visibleLayers['4. Documentos'] && (
                <Area
                  type="monotone"
                  dataKey="4. Documentos"
                  stackId="1"
                  stroke={stageColors['4. Documentos']}
                  fill={stageColors['4. Documentos']}
                  fillOpacity={0.6}
                />
              )}
              {visibleLayers['3. Trabajo y Vehículo'] && (
                <Area
                  type="monotone"
                  dataKey="3. Trabajo y Vehículo"
                  stackId="1"
                  stroke={stageColors['3. Trabajo y Vehículo']}
                  fill={stageColors['3. Trabajo y Vehículo']}
                  fillOpacity={0.6}
                />
              )}
              {visibleLayers['2. Datos Personales'] && (
                <Area
                  type="monotone"
                  dataKey="2. Datos Personales"
                  stackId="1"
                  stroke={stageColors['2. Datos Personales']}
                  fill={stageColors['2. Datos Personales']}
                  fillOpacity={0.6}
                />
              )}
              {visibleLayers['1. Contacto Básico'] && (
                <Area
                  type="monotone"
                  dataKey="1. Contacto Básico"
                  stackId="1"
                  stroke={stageColors['1. Contacto Básico']}
                  fill={stageColors['1. Contacto Básico']}
                  fillOpacity={0.6}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Grid de 2 columnas para Postulaciones y Documentos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico consolidado de Postulaciones - Iniciadas y Completadas juntas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Postulaciones por {currentGroupBy === 'day' ? 'Día' : currentGroupBy === 'week' ? 'Semana' : 'Mes'}
            </CardTitle>
            <CardDescription>
              Comparación de postulaciones iniciadas vs completadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={visitasPorSemana.map((item) => ({
                periodo: item.semana,
                iniciadas: item.visitas,
                completadas: item.completados || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                  dataKey="periodo"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="iniciadas"
                  name="Iniciadas"
                  fill="#3b82f6"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="completadas"
                  name="Completadas"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Estado de Documentos */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-blue-500" />
            Estado de Documentos
          </CardTitle>
          <CardDescription>
            Revisión de documentación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            {/* Gráfico centrado */}
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={documentosData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {documentosData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            {/* Leyenda y detalles debajo */}
            <div className="w-full max-w-md space-y-3">
              {documentosData.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{item.value}</div>
                    <div className="text-xs text-muted-foreground">
                      {totalDocumentos > 0
                        ? `${((item.value / totalDocumentos) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="font-bold">{totalDocumentos}</span>
                </div>
              </div>

              {mainStats.pendingDocs > 0 && (
                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      {mainStats.pendingDocs} doc{mainStats.pendingDocs !== 1 ? 's' : ''} pendiente{mainStats.pendingDocs !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )

  // Tab Funnel
  const funnelContent = (
    <div className="space-y-6">
      {/* Funnel Completo */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Funnel de Conversión Completo
              </CardTitle>
              <CardDescription className="text-sm">
                Recorrido desde inicio de postulación hasta asistencia a capacitación
              </CardDescription>
            </div>
            <div className="text-right bg-blue-50 dark:bg-blue-950 px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {tasaConversionTotal}%
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                Tasa de conversión
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              data={fullFunnelData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                horizontal={true}
                vertical={false}
              />
              <XAxis
                type="number"
                className="text-xs font-medium"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                dataKey="step"
                type="category"
                width={130}
                className="text-xs font-medium"
                tick={{ fill: 'hsl(var(--foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<CustomFunnelTooltip fullFunnelData={fullFunnelData} />}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
              />
              <Bar
                dataKey="value"
                radius={[0, 8, 8, 0]}
                maxBarSize={35}
              >
                {fullFunnelData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    opacity={0.9}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-xs text-muted-foreground">Proceso de Postulación</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-xs text-muted-foreground">Proceso de Onboarding</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abandonos por Step */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Abandonos por Step
          </CardTitle>
          <CardDescription>
            Puntos críticos del formulario
          </CardDescription>
        </CardHeader>
        <CardContent>
          {abandonoPorStep.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={abandonoPorStep}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [value, 'Abandonos']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="abandonos"
                  fill="#ef4444"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay abandonos registrados</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  // Tab Asistencias
  const asistenciasContent = (
    <AsistenciasCharts
      asistenciasPorPeriodo={asistenciasPorPeriodo}
      distribucionEstadosAsistencias={distribucionEstadosAsistencias}
      asistenciasProgramadasVsRealizadas={asistenciasProgramadasVsRealizadas}
    />
  )

  // Tab Demografía
  const demografiaContent = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-500" />
          Distribución por Edades
        </CardTitle>
        <CardDescription>
          Rangos etarios de postulantes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {edadesPorRango.map((rango, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{rango.rango} años</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {rango.cantidad}
                  </span>
                  <span className="font-semibold text-purple-600">
                    {rango.porcentaje.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rango.porcentaje}%` }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: rango.fill }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader
        breadcrumbs={[
          { label: "Dashboard" }
        ]}
      />

      <div className="flex-1 p-8 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Vista general del sistema de gestión de drivers
            </p>
          </div>

          {/* Filtros avanzados */}
          <DashboardFilters
            currentStartDate={currentStartDate}
            currentEndDate={currentEndDate}
            currentFilterType={currentFilterType}
            currentGroupBy={currentGroupBy}
          />
        </div>

        {/* Tabs con contenido */}
        <DashboardTabs
          generalContent={generalContent}
          funnelContent={funnelContent}
          asistenciasContent={asistenciasContent}
          demografiaContent={demografiaContent}
        />
      </div>
    </div>
  )
}
