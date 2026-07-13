// components/admin/dashboard-content.tsx
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  CheckCircle, 
  Calendar, 
  UserCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  FileCheck,
  FileX,
  FileClock,
  AlertCircle,
  X,
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
  Funnel,
  FunnelChart,
  Pie,
  PieChart,
  Legend,
} from "recharts"
import { motion } from "motion/react"

interface DashboardContentProps {
  mainStats: any
  postulacionesStats: any
  funnelData: any[]
  visitasPorSemana: any[]
  completadosPorSemana: any[]
  abandonoPorStep: any[]
  edadesPorRango: any[]
  onboardingStats: any
  currentDateRange?: string
  customStartDate?: string
  customEndDate?: string
}

// Componente de Tooltip Personalizado para el Funnel
const CustomFunnelTooltip = ({ active, payload, fullFunnelData }: any) => {
  if (!active || !payload || !payload.length) return null
  
  const data = payload[0].payload
  const currentValue = data.value
  const currentIndex = fullFunnelData.findIndex((item: any) => item.step === data.step)
  
  // Calcular porcentajes
  const totalIniciadas = fullFunnelData[0]?.value || 1
  const porcentajeTotal = ((currentValue / totalIniciadas) * 100).toFixed(1)
  
  // Calcular porcentaje respecto al paso anterior
  let porcentajeAnterior = null
  if (currentIndex > 0) {
    const valorAnterior = fullFunnelData[currentIndex - 1]?.value || 1
    porcentajeAnterior = ((currentValue / valorAnterior) * 100).toFixed(1)
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-4 min-w-[220px]">
      <div className="font-bold text-base mb-3 text-foreground">
        {data.step}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-muted-foreground">Cantidad:</span>
          <span className="font-semibold text-foreground">
            {currentValue.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-muted-foreground">% del total:</span>
          <span className="font-semibold text-info">
            {porcentajeTotal}%
          </span>
        </div>
        {porcentajeAnterior !== null && (
          <div className="flex justify-between items-center gap-4 pt-1 border-t border-border">
            <span className="text-sm text-muted-foreground">% del anterior:</span>
            <span className="font-semibold text-success">
              {porcentajeAnterior}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function DashboardContent({
  mainStats,
  postulacionesStats,
  funnelData,
  visitasPorSemana,
  completadosPorSemana,
  abandonoPorStep,
  edadesPorRango,
  onboardingStats,
  currentDateRange = '30',
  customStartDate,
  customEndDate,
}: DashboardContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const handleDateRangeChange = (days: string) => {
    const params = new URLSearchParams()
    params.set('dateRange', days)
    router.push(`/admin?${params.toString()}`)
    router.refresh()
  }
  
  const clearDateFilter = () => {
    router.push('/admin')
    router.refresh()
  }
  
  const hasDateFilter = currentDateRange !== '30'
  
  // Preparar datos para KPIs principales
  const mainKPIs = [
    {
      title: "Total Postulaciones",
      value: postulacionesStats.totalPostulaciones,
      change: postulacionesStats.nuevasUltimaSemana,
      changeLabel: undefined, // Ya no mostramos "últimos 7 días" porque varía según filtro
      icon: Users,
      color: "blue",
      bgColor: "bg-info-soft",
      iconColor: "text-info",
    },
    {
      title: "Completadas",
      value: postulacionesStats.completadas,
      change: postulacionesStats.completadasUltimaSemana,
      changeLabel: undefined, // Ya no mostramos "últimos 7 días" porque varía según filtro
      percentage: postulacionesStats.tasaCompletado,
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-success-soft",
      iconColor: "text-success",
      asistidasIncluidas: postulacionesStats.asistenciasIncluidas || 0,
    },
    {
      title: "Pendientes de Asistencia",
      value: onboardingStats.pendingAttendance,
      change: undefined, // Ya no mostramos cambio
      changeLabel: undefined,
      icon: Calendar,
      color: "amber",
      bgColor: "bg-warning-soft",
      iconColor: "text-warning",
    },
    {
      title: "Asistencias",
      value: onboardingStats.completedThisMonth,
      percentage: undefined, // No mostrar porcentaje
      change: undefined,
      changeLabel: undefined,
      icon: UserCheck,
      color: "teal",
      bgColor: "bg-teal-500/10",
      iconColor: "text-teal-600",
    },
  ]

  // Combinar funnel completo con onboarding
  // El primer paso "Iniciado" debería ser el total de postulaciones en el rango
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

  // Calcular tasa de conversión
  const tasaConversionTotal = totalIniciadas > 0
    ? ((onboardingStats.completedThisMonth / totalIniciadas) * 100).toFixed(1)
    : "0"

  // Preparar datos para el gráfico de documentos
  const documentosData = [
    { 
      name: 'Aprobados', 
      value: mainStats.manualReviewDocs > 0 ? mainStats.manualReviewDocs : 0, 
      fill: '#10b981',
      icon: FileCheck 
    },
    { 
      name: 'Rechazados', 
      value: mainStats.rejectedDocs, 
      fill: '#ef4444',
      icon: FileX 
    },
    { 
      name: 'Pendientes', 
      value: mainStats.pendingDocs, 
      fill: '#f59e0b',
      icon: FileClock 
    },
  ]

  const totalDocumentos = documentosData.reduce((sum, item) => sum + item.value, 0)

  // Renderizar label personalizado para el pie chart
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

  // Tooltip personalizado para el gráfico de documentos
  const CustomDocumentosTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    
    const data = payload[0]
    const porcentaje = totalDocumentos > 0 
      ? ((data.value / totalDocumentos) * 100).toFixed(1)
      : '0'

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
        <div className="font-bold text-sm mb-2 text-foreground">
          {data.name}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center gap-3">
            <span className="text-xs text-muted-foreground">Cantidad:</span>
            <span className="font-semibold text-foreground">
              {data.value}
            </span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="text-xs text-muted-foreground">Porcentaje:</span>
            <span className="font-semibold" style={{ color: data.payload.fill }}>
              {porcentaje}%
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader
        breadcrumbs={[
          { label: "Dashboard" }
        ]}
      />

      <div className="flex-1 p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Vista general del sistema de gestión de drivers
            </p>
          </div>
          
          {/* Filtros de Fecha */}
          <div className="flex flex-col gap-3">
            {/* Botones rápidos */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={currentDateRange === '3' && !customStartDate ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('3')}
                className="text-xs"
              >
                Últimos 3 días
              </Button>
              <Button
                variant={currentDateRange === '7' && !customStartDate ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('7')}
                className="text-xs"
              >
                Últimos 7 días
              </Button>
              <Button
                variant={currentDateRange === '30' && !customStartDate ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('30')}
                className="text-xs"
              >
                Últimos 30 días
              </Button>
              <Button
                variant={currentDateRange === '90' && !customStartDate ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('90')}
                className="text-xs"
              >
                Últimos 90 días
              </Button>
              {hasDateFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateFilter}
                  className="text-xs"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* KPIs Principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {mainKPIs.map((kpi, index) => (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Card className="relative overflow-hidden h-full flex flex-col">
                <div className={`absolute inset-0 ${kpi.bgColor} opacity-50`} />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-sm font-medium">
                    {kpi.title}
                  </CardTitle>
                  <div className={`${kpi.bgColor} p-2 rounded-lg`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent className="relative flex-1 flex flex-col justify-end">
                  <div className="text-2xl font-bold">
                    {kpi.value.toLocaleString()}
                    {kpi.percentage !== undefined && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({kpi.percentage}%)
                      </span>
                    )}
                  </div>
                  {kpi.asistidasIncluidas !== undefined && kpi.asistidasIncluidas > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Incluye {kpi.asistidasIncluidas} asistida{kpi.asistidasIncluidas !== 1 ? 's' : ''}
                    </p>
                  )}
                  {kpi.change !== undefined && kpi.changeLabel && (
                    <div className="flex items-center gap-1 mt-1">
                      {kpi.change > 0 ? (
                        <TrendingUp className="h-3 w-3 text-success" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                      <p className="text-xs text-muted-foreground">
                        {kpi.change > 0 && '+'}{kpi.change} {kpi.changeLabel}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Funnel Completo - Full Width */}
        <Card className="border-2">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-info" />
                  Funnel de Conversión Completo
                </CardTitle>
                <CardDescription className="text-sm">
                  Recorrido desde inicio de postulación hasta asistencia a capacitación
                </CardDescription>
              </div>
              <div className="text-right bg-info-soft px-4 py-2 rounded-lg border border-info">
                <div className="text-2xl font-bold text-info">
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
            
            {/* Leyenda personalizada */}
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-info" />
                <span className="text-xs text-muted-foreground">Proceso de Postulación</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-success" />
                <span className="text-xs text-muted-foreground">Proceso de Onboarding</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráficos de Tendencias */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Postulaciones Iniciadas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-info" />
                Postulaciones Iniciadas
              </CardTitle>
              <CardDescription>
                Agrupado por semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={visitasPorSemana}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="semana" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                    labelStyle={{ 
                      fontWeight: 600,
                      marginBottom: '4px',
                      color: '#000000'
                    }}
                    formatter={(value: any) => [value, 'Postulaciones']}
                    cursor={{ fill: '#3b82f6', opacity: 0.1 }}
                  />
                  <Bar 
                    dataKey="visitas" 
                    fill="#3b82f6" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Postulaciones Completadas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                Postulaciones Completadas
              </CardTitle>
              <CardDescription>
                Agrupado por semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={completadosPorSemana}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="semana" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                    labelStyle={{ 
                      fontWeight: 600,
                      marginBottom: '4px',
                      color: '#000000'
                    }}
                    formatter={(value: any) => [value, 'Completadas']}
                    cursor={{ fill: '#10b981', opacity: 0.1 }}
                  />
                  <Bar 
                    dataKey="completados" 
                    fill="#10b981" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Estado de Documentos y Abandonos */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Estado de Documentos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-info" />
                Estado de Documentos
              </CardTitle>
              <CardDescription>
                Revisión de documentación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {/* Gráfico de Torta */}
                <div className="flex-1">
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
                      <Tooltip content={<CustomDocumentosTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Leyenda con iconos */}
                <div className="flex-1 space-y-3">
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
                  
                  {/* Total */}
                  <div className="pt-3 border-t mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Total</span>
                      <span className="font-bold">{totalDocumentos}</span>
                    </div>
                  </div>
                  
                  {/* Alerta de pendientes */}
                  {mainStats.pendingDocs > 0 && (
                    <div className="mt-3 p-2 bg-warning-soft border border-warning rounded-lg">
                      <div className="flex items-center gap-2 text-warning">
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

          <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
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

          {/* Abandonos por Step */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Abandonos por Step
              </CardTitle>
              <CardDescription>
                Puntos críticos del formulario
              </CardDescription>
            </CardHeader>
            <CardContent>
              {abandonoPorStep.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={abandonoPorStep}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="label" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        padding: '8px 12px'
                      }}
                      labelStyle={{ 
                        fontWeight: 600,
                        marginBottom: '4px',
                        color: '#000000'
                      }}
                      formatter={(value: any) => [value, 'Abandonos']}
                      cursor={{ fill: '#ef4444', opacity: 0.1 }}
                    />
                    <Bar 
                      dataKey="abandonos" 
                      fill="#ef4444" 
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay abandonos registrados</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Distribución por Edades */}

      </div>
    </div>
  )
}