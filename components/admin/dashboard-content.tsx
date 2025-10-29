// components/admin/dashboard-content.tsx
"use client"

import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  CheckCircle, 
  Calendar, 
  UserCheck,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react"
import { 
  Area, 
  AreaChart, 
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
} from "recharts"
import { motion } from "framer-motion"

interface DashboardContentProps {
  mainStats: any
  postulacionesStats: any
  funnelData: any[]
  visitasPorDia: any[]
  completadosPorDia: any[]
  abandonoPorStep: any[]
  edadesPorRango: any[]
  onboardingStats: any
}

export function DashboardContent({
  mainStats,
  postulacionesStats,
  funnelData,
  visitasPorDia,
  completadosPorDia,
  abandonoPorStep,
  edadesPorRango,
  onboardingStats,
}: DashboardContentProps) {
  
  // Preparar datos para KPIs principales
  const mainKPIs = [
    {
      title: "Total Postulaciones",
      value: postulacionesStats.totalPostulaciones,
      change: postulacionesStats.nuevasUltimaSemana,
      changeLabel: "últimos 7 días",
      icon: Users,
      color: "blue",
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      title: "Completadas",
      value: postulacionesStats.completadas,
      change: postulacionesStats.completadasUltimaSemana,
      changeLabel: "últimos 7 días",
      percentage: postulacionesStats.tasaCompletado,
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-green-500/10",
      iconColor: "text-green-600",
    },
    {
      title: "Capacitaciones Agendadas",
      value: onboardingStats.upcomingEvents,
      change: onboardingStats.pendingDrivers,
      changeLabel: "pendientes de agendar",
      icon: Calendar,
      color: "amber",
      bgColor: "bg-amber-500/10",
      iconColor: "text-amber-600",
    },
    {
      title: "Asistencias",
      value: onboardingStats.completedThisMonth,
      percentage: onboardingStats.attendanceRate,
      change: onboardingStats.noShowsThisMonth,
      changeLabel: "no shows este mes",
      icon: UserCheck,
      color: "emerald",
      bgColor: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
  ]

  // Combinar funnel completo con onboarding
  const fullFunnelData = [
    { step: "Iniciado", value: funnelData[0]?.count || 0, fill: "#3b82f6" },
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
  const tasaConversionTotal = funnelData.length > 0 && funnelData[0]?.count > 0
    ? ((onboardingStats.completedThisMonth / funnelData[0].count) * 100).toFixed(1)
    : "0"

  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader
        breadcrumbs={[
          { label: "Dashboard" }
        ]}
      />

      <div className="flex-1 p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Vista general del sistema de gestión de drivers
          </p>
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
              <Card className="relative overflow-hidden">
                <div className={`absolute inset-0 ${kpi.bgColor} opacity-50`} />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-sm font-medium">
                    {kpi.title}
                  </CardTitle>
                  <div className={`${kpi.bgColor} p-2 rounded-lg`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-2xl font-bold">
                    {kpi.value.toLocaleString()}
                    {kpi.percentage !== undefined && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({kpi.percentage}%)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {kpi.change !== undefined && (
                      <>
                        {kpi.change > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                        <p className="text-xs text-muted-foreground">
                          {kpi.change > 0 && '+'}{kpi.change} {kpi.changeLabel}
                        </p>
                      </>
                    )}
                  </div>
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
                  contentStyle={{ 
                    backgroundColor: '#ffffff',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  labelStyle={{ 
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: '#000000',
                    fontSize: '14px'
                  }}
                  formatter={(value: any) => [value, 'Postulantes']}
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

        {/* Gráficos de Tendencias */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Postulaciones Iniciadas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Postulaciones Iniciadas
              </CardTitle>
              <CardDescription>
                Últimos 30 días
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={visitasPorDia}>
                  <defs>
                    <linearGradient id="colorIniciadas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="fecha" 
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
                    cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="visitas" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorIniciadas)"
                    strokeWidth={2}
                    activeDot={{ r: 6, fill: '#3b82f6' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Postulaciones Completadas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Postulaciones Completadas
              </CardTitle>
              <CardDescription>
                Últimos 30 días
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={completadosPorDia}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="fecha" 
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

        {/* Abandonos y Edades */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Abandonos por Step */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Abandonos por Step
              </CardTitle>
              <CardDescription>
                Puntos críticos del formulario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={abandonoPorStep}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="label" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
            </CardContent>
          </Card>

          {/* Distribución por Edades - Compacto */}
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
        </div>
      </div>
    </div>
  )
}