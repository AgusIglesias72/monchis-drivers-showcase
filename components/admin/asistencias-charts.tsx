// components/admin/asistencias-charts.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Legend,
  Line,
  LineChart,
} from "recharts"
import { UserCheck, UserX, Calendar, TrendingUp, CheckCircle } from "lucide-react"
import { motion } from "motion/react"

interface AsistenciasChartsProps {
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
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-4 min-w-[200px]">
      <div className="font-bold text-sm mb-2 text-gray-900 dark:text-gray-100">
        {label}
      </div>
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-4 min-w-[180px]">
      <div className="font-bold text-sm mb-2 text-gray-900 dark:text-gray-100">
        {data.label}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Cantidad:</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {data.cantidad}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Porcentaje:</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {data.porcentaje}%
          </span>
        </div>
      </div>
    </div>
  )
}

export function AsistenciasCharts({
  asistenciasPorPeriodo,
  distribucionEstadosAsistencias,
  asistenciasProgramadasVsRealizadas,
}: AsistenciasChartsProps) {
  // Datos para el gráfico de programadas vs realizadas
  const programadasVsRealizadasData = [
    {
      name: 'Total',
      value: asistenciasProgramadasVsRealizadas.totalProgramadas,
      fill: '#3b82f6',
    },
    {
      name: 'Asistieron',
      value: asistenciasProgramadasVsRealizadas.asistieron,
      fill: '#10b981',
    },
    {
      name: 'No Asistieron',
      value: asistenciasProgramadasVsRealizadas.noAsistieron,
      fill: '#ef4444',
    },
    {
      name: 'Pendientes',
      value: asistenciasProgramadasVsRealizadas.pendientes,
      fill: '#f59e0b',
    },
  ]

  // KPIs de asistencias
  const asistenciasKpis = [
    {
      title: "Asistencias Realizadas",
      value: asistenciasProgramadasVsRealizadas.asistieron,
      icon: UserCheck,
      description: `${asistenciasProgramadasVsRealizadas.totalProgramadas} programadas`,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20",
    },
    {
      title: "Tasa de Presentismo",
      value: `${asistenciasProgramadasVsRealizadas.tasaPresentismo}%`,
      icon: CheckCircle,
      description: `${asistenciasProgramadasVsRealizadas.resueltas} resueltas`,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      title: "No-Shows",
      value: asistenciasProgramadasVsRealizadas.noAsistieron,
      icon: UserX,
      description: `${((asistenciasProgramadasVsRealizadas.noAsistieron / Math.max(asistenciasProgramadasVsRealizadas.resueltas, 1)) * 100).toFixed(1)}% del total`,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/20",
    },
    {
      title: "Pendientes",
      value: asistenciasProgramadasVsRealizadas.pendientes,
      icon: Calendar,
      description: "Por confirmar asistencia",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="space-y-6">
      {/* KPIs de Asistencias */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {asistenciasKpis.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <motion.div key={index} variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
                  <CardTitle className="text-xs font-medium">
                    {kpi.title}
                  </CardTitle>
                  <div className={`${kpi.bgColor} p-1.5 rounded-md`}>
                    <Icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className={`text-xl font-bold ${kpi.color}`}>
                    {kpi.value}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {kpi.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
      {/* Gráfico de programadas vs realizadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Programadas vs Realizadas
          </CardTitle>
          <CardDescription>
            Comparación de asistencias programadas y su estado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={programadasVsRealizadasData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {programadasVsRealizadasData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Métrica destacada */}
          <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tasa de Presentismo
                </span>
              </div>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {asistenciasProgramadasVsRealizadas.tasaPresentismo}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribución de estados */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Estados</CardTitle>
          <CardDescription>
            Estados de todas las asistencias en el período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={distribucionEstadosAsistencias}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props) => {
                  const p = props as unknown as { porcentaje?: number }
                  return p?.porcentaje != null ? `${p.porcentaje}%` : ''
                }}
                outerRadius={100}
                fill="#8884d8"
                dataKey="cantidad"
              >
                {distribucionEstadosAsistencias.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry: any) => entry.payload.label}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Evolución temporal de asistencias */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Evolución Temporal de Asistencias</CardTitle>
          <CardDescription>
            Comparación de asistencias vs no-shows por período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={asistenciasPorPeriodo}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="periodo"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="asistieron"
                name="Asistieron"
                fill="#10b981"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="noAsistieron"
                name="No Asistieron"
                fill="#ef4444"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="programados"
                name="Programados"
                fill="#f59e0b"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tasa de presentismo por período */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Tasa de Presentismo por Período</CardTitle>
          <CardDescription>
            Porcentaje de asistencia a lo largo del tiempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={asistenciasPorPeriodo}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="periodo"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Presentismo'] as [string, string]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="tasaPresentismo"
                name="Tasa de Presentismo"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
