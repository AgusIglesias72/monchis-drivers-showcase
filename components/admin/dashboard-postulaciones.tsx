"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Users,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  TestTube,
  Database,
  Calendar,
  RotateCcw
} from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Pie, PieChart, Legend } from "recharts"
import { AdminHeader } from "@/components/admin/admin-header"


// ============ DATOS MOCK ============
const MOCK_STATS = {
  totalPostulaciones: 48,
  completadas: 12,
  enProgreso: 28,
  abandonadas: 8,
  nuevasUltimaSemana: 15,
  completadasUltimaSemana: 4,
  tasaCompletado: 25,
}

const MOCK_FUNNEL = [
  { step: 1, count: 48, label: 'Contacto' },
  { step: 2, count: 42, label: 'Datos Personales' },
  { step: 3, count: 38, label: 'Trabajo y Vehículo' },
  { step: 4, count: 32, label: 'Documentos' },
  { step: 5, count: 25, label: 'Info Adicional' },
]

const MOCK_VISITAS = [
  { fecha: '30/09', visitas: 8 },
  { fecha: '01/10', visitas: 12 },
  { fecha: '02/10', visitas: 6 },
  { fecha: '03/10', visitas: 15 },
  { fecha: '04/10', visitas: 10 },
  { fecha: '05/10', visitas: 14 },
  { fecha: '06/10', visitas: 9 },
]

const MOCK_COMPLETADOS = [
  { fecha: '30/09', completados: 2 },
  { fecha: '01/10', completados: 3 },
  { fecha: '02/10', completados: 1 },
  { fecha: '03/10', completados: 4 },
  { fecha: '04/10', completados: 2 },
  { fecha: '05/10', completados: 3 },
  { fecha: '06/10', completados: 2 },
]

const MOCK_ABANDONO = [
  { step: 1, abandonos: 6, label: 'Contacto' },
  { step: 2, abandonos: 4, label: 'Datos Personales' },
  { step: 3, abandonos: 6, label: 'Trabajo y Vehículo' },
  { step: 4, abandonos: 7, label: 'Documentos' },
  { step: 5, abandonos: 6, label: 'Info Adicional' },
]

const MOCK_EDADES = [
  { rango: '18-24', cantidad: 12, porcentaje: 25, fill: '#dc2626' },
  { rango: '25-34', cantidad: 18, porcentaje: 37.5, fill: '#ef4444' },
  { rango: '35-44', cantidad: 10, porcentaje: 20.8, fill: '#f87171' },
  { rango: '45-54', cantidad: 6, porcentaje: 12.5, fill: '#fca5a5' },
  { rango: '55+', cantidad: 2, porcentaje: 4.2, fill: '#fecaca' },
]

interface DashboardPostulacionesProps {
  stats: any
  funnelData: any[]
  visitasPorDia: any[]
  completadosPorDia: any[]
  abandonoPorStep: any[]
  edadesPorRango?: any[]
}

export function DashboardPostulaciones({
  stats: realStats,
  funnelData: realFunnel,
  visitasPorDia: realVisitas,
  completadosPorDia: realCompletados,
  abandonoPorStep: realAbandono,
  edadesPorRango: realEdades
}: DashboardPostulacionesProps) {
  const [useMockData, setUseMockData] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Decidir qué datos usar
  const stats = useMockData ? MOCK_STATS : (realStats || MOCK_STATS)
  const funnelData = useMockData ? MOCK_FUNNEL : (realFunnel || []).map((item, index) => ({
    ...item,
    label: ['Contacto', 'Datos Personales', 'Trabajo y Vehículo', 'Documentos', 'Info Adicional'][index] || item.label
  }))
  const visitasPorDia = useMockData ? MOCK_VISITAS : (realVisitas || MOCK_VISITAS)
  const completadosPorDia = useMockData ? MOCK_COMPLETADOS : (realCompletados || MOCK_COMPLETADOS)
  const abandonoPorStep = useMockData ? MOCK_ABANDONO : (realAbandono || MOCK_ABANDONO)
  const edadesPorRango = useMockData ? MOCK_EDADES : (realEdades || MOCK_EDADES)

  // Calcular tasa de conversión del funnel
  const tasaConversion = funnelData.length > 0 && funnelData[0].count > 0
    ? Math.round((funnelData[funnelData.length - 1].count / funnelData[0].count) * 100)
    : 0

  const handleApplyFilters = () => {
    console.log('Aplicar filtros:', { startDate, endDate })
    // Aquí se llamaría a la API con los filtros de fecha
  }

  const handleResetFilters = () => {
    setStartDate('')
    setEndDate('')
    console.log('Resetear filtros')
  }

  return (
    <div className="flex flex-1 flex-col container mx-auto">

      <AdminHeader
        breadcrumbs={[
          { label: "Dashboard" }
        ]}
      />

      <div className="flex-1 p-8 space-y-8">
        {/* Header con Switch */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Vista general del sistema de gestión de postulaciones
            </p>
          </div>

          {/* Switch Mock/Real */}
          <div className="flex items-center gap-3 bg-muted rounded-lg p-2">
            <div className="flex items-center gap-2">
              <TestTube className={`h-4 w-4 ${useMockData ? 'text-amber-600' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-medium ${useMockData ? 'text-foreground' : 'text-muted-foreground'}`}>
                Mock
              </span>
            </div>

            <button
              onClick={() => setUseMockData(!useMockData)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useMockData ? 'bg-amber-500' : 'bg-green-500'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useMockData ? 'translate-x-1' : 'translate-x-6'
                  }`}
              />
            </button>

            <div className="flex items-center gap-2">
              <Database className={`h-4 w-4 ${!useMockData ? 'text-green-600' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-medium ${!useMockData ? 'text-foreground' : 'text-muted-foreground'}`}>
                Real
              </span>
            </div>
          </div>
        </div>

        {/* Badge de modo desarrollo */}
        {useMockData && (
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
            <TestTube className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-900">
              Modo desarrollo: Mostrando datos de prueba
            </span>
          </div>
        )}

        {/* Filtros de Fecha - Versión compacta */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium whitespace-nowrap">Filtrar por fecha:</span>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40 h-9"
            placeholder="Desde"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40 h-9"
            placeholder="Hasta"
          />
          <Button onClick={handleApplyFilters} size="sm" className="gap-2">
            Aplicar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* KPIs principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Postulaciones
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPostulaciones}</div>
              <p className="text-xs text-muted-foreground mt-1">
                +{stats.nuevasUltimaSemana} en la última semana
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completadas
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completadas}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.tasaCompletado}% del total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                En Progreso
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.enProgreso}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Completando formulario
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Abandonadas
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.abandonadas}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Requieren seguimiento
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Funnel de Conversión */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Funnel de Conversión del Formulario</CardTitle>
              <CardDescription>
                Progresión de usuarios a través de los 5 pasos del formulario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Tasa de conversión total */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Tasa de Conversión Total</span>
                  </div>
                  <span className="text-2xl font-bold">{tasaConversion}%</span>
                </div>

                {/* Funnel visual */}
                <div className="space-y-2">
                  {funnelData.map((item, index) => {
                    const porcentaje = funnelData[0].count > 0
                      ? (item.count / funnelData[0].count) * 100
                      : 0
                    const dropoff = index > 0
                      ? funnelData[index - 1].count - item.count
                      : 0

                    // Calcular porcentaje de caída
                    const dropoffPercentage = index > 0 && funnelData[index - 1].count > 0
                      ? (dropoff / funnelData[index - 1].count) * 100
                      : 0

                    // Degradé progresivo de gris claro a negro según el step
                    const gradientColors = [
                      'from-gray-300 to-gray-400',
                      'from-gray-400 to-gray-500',
                      'from-gray-500 to-gray-600',
                      'from-gray-700 to-gray-800',
                      'from-gray-900 to-black',
                    ][index]

                    return (
                      <div key={item.step} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            Step {item.step}: {item.label}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {item.count} usuarios
                            </span>
                            {dropoff > 0 && (
                              <span className="text-xs font-semibold text-red-600">
                                -{dropoff} ({dropoffPercentage.toFixed(1)}%)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="relative h-10 bg-muted rounded-lg overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${gradientColors} flex items-center justify-end pr-3 text-white font-medium text-sm transition-all`}
                            style={{ width: `${porcentaje}%` }}
                          >
                            {porcentaje.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Rango de Edad</CardTitle>
              <CardDescription>
                Segmentación demográfica de los postulantes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="">
                {/* Gráfico de torta */}
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={edadesPorRango}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="cantidad"
                      >
                        {edadesPorRango.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                                <p className="font-semibold text-sm mb-1">{data.rango} años</p>
                                <p className="text-sm text-muted-foreground">{data.cantidad} postulantes</p>
                                <p className="text-sm font-medium">{data.porcentaje.toFixed(1)}% del total</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Leyenda con detalles */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium mb-3 col-span-2">Detalle por Rango</div>
                  {edadesPorRango.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="font-medium text-sm">{item.rango} años</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {item.cantidad} postulantes
                        </span>
                        <span className="text-sm font-semibold min-w-[3rem] text-right">
                          {item.porcentaje.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos de tendencias */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Visitas por día */}
          <Card>
            <CardHeader>
              <CardTitle>Visitas al Formulario</CardTitle>
              <CardDescription>
                Últimos 7 días
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={visitasPorDia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="fecha"
                    style={{ fontSize: '12px' }}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    style={{ fontSize: '12px' }}
                    stroke="#9ca3af"
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                            <p className="font-semibold text-sm mb-1">{payload[0].payload.fecha}</p>
                            <p className="text-sm text-blue-600 font-medium">
                              {payload[0].value} {payload[0].value === 1 ? 'visita' : 'visitas'}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitas"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVisitas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Completados por día */}
          <Card>
            <CardHeader>
              <CardTitle>Formularios Completados</CardTitle>
              <CardDescription>
                Últimos 7 días
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={completadosPorDia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCompletados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="fecha"
                    style={{ fontSize: '12px' }}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    style={{ fontSize: '12px' }}
                    stroke="#9ca3af"
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                            <p className="font-semibold text-sm mb-1">{payload[0].payload.fecha}</p>
                            <p className="text-sm text-green-600 font-medium">
                              {payload[0].value} {payload[0].value === 1 ? 'completado' : 'completados'}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completados"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCompletados)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de abandonos por step */}
        <Card>
          <CardHeader>
            <CardTitle>Abandonos por Step</CardTitle>
            <CardDescription>
              Identifica en qué paso los usuarios abandonan más frecuentemente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={abandonoPorStep} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="step"
                  style={{ fontSize: '12px' }}
                  stroke="#9ca3af"
                  label={{ value: 'Step del Formulario', position: 'insideBottom', offset: -10, style: { fontSize: '12px' } }}
                />
                <YAxis
                  style={{ fontSize: '12px' }}
                  stroke="#9ca3af"
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <p className="font-semibold text-sm mb-1">Step {payload[0].payload.step}</p>
                          <p className="text-sm text-muted-foreground mb-1">{payload[0].payload.label}</p>
                          <p className="text-sm text-red-600 font-medium">
                            {payload[0].value} {payload[0].value === 1 ? 'abandono' : 'abandonos'}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="abandonos" radius={[8, 8, 0, 0]}>
                  {abandonoPorStep.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.abandonos > 4 ? '#ef4444' : '#f59e0b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}