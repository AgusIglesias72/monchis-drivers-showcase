"use client"

import { useState } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  CheckCircle, 
  Clock, 
  XCircle,
  TrendingUp,
  TestTube,
  Database,
  Calendar as CalendarIcon,
  RotateCcw
} from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

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
  { step: 1, count: 48, label: 'Datos Personales' },
  { step: 2, count: 42, label: 'Ubicación' },
  { step: 3, count: 38, label: 'Vehículo' },
  { step: 4, count: 32, label: 'Documentos' },
  { step: 5, count: 25, label: 'Contacto Emergencia' },
  { step: 6, count: 18, label: 'Zona de Trabajo' },
  { step: 7, count: 12, label: 'Info Adicional' },
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
  { step: 1, abandonos: 6, label: 'Step 1' },
  { step: 2, abandonos: 4, label: 'Step 2' },
  { step: 3, abandonos: 6, label: 'Step 3' },
  { step: 4, abandonos: 7, label: 'Step 4' },
  { step: 5, abandonos: 4, label: 'Step 5' },
  { step: 6, abandonos: 2, label: 'Step 6' },
  { step: 7, abandonos: 1, label: 'Step 7' },
]

interface DashboardPostulacionesProps {
  stats: any
  funnelData: any[]
  visitasPorDia: any[]
  completadosPorDia: any[]
  abandonoPorStep: any[]
}

export function DashboardPostulaciones({ 
  stats: realStats,
  funnelData: realFunnel,
  visitasPorDia: realVisitas,
  completadosPorDia: realCompletados,
  abandonoPorStep: realAbandono
}: DashboardPostulacionesProps) {
  const [useMockData, setUseMockData] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Decidir qué datos usar
  const stats = useMockData ? MOCK_STATS : realStats
  const funnelData = useMockData ? MOCK_FUNNEL : realFunnel.map((item, index) => ({
    ...item,
    label: ['Datos Personales', 'Ubicación', 'Vehículo', 'Documentos', 'Contacto', 'Zona', 'Info'][index]
  }))
  const visitasPorDia = useMockData ? MOCK_VISITAS : realVisitas
  const completadosPorDia = useMockData ? MOCK_COMPLETADOS : realCompletados
  const abandonoPorStep = useMockData ? MOCK_ABANDONO : realAbandono

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
    <div className="flex flex-1 flex-col">
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
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              useMockData ? 'bg-amber-500' : 'bg-green-500'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                useMockData ? 'translate-x-1' : 'translate-x-6'
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

      {/* Filtros de Fecha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Filtros de Fecha
          </CardTitle>
          <CardDescription>
            Filtra los datos del dashboard por rango de fechas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="startDate">Fecha de inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="endDate">Fecha de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleApplyFilters} className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Aplicar Filtros
            </Button>
            <Button variant="outline" onClick={handleResetFilters} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Resetear
            </Button>
          </div>
        </CardContent>
      </Card>

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
      <Card>
        <CardHeader>
          <CardTitle>Funnel de Conversión del Formulario</CardTitle>
          <CardDescription>
            Progresión de usuarios a través de los 7 pasos del formulario
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
                          <span className="text-xs text-red-500">
                            -{dropoff}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative h-10 bg-muted rounded-lg overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-400 flex items-center justify-end pr-3 text-white font-medium text-sm transition-all"
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
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
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
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
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
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
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