// components/admin/dashboard-content.tsx
"use client"

import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PostulacionesKPIs } from "@/components/admin/postulaciones-kpis"
import { OnboardingKPIs } from "@/components/admin/onboarding-kpis"
import {
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
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
  Pie, 
  PieChart, 
  Legend 
} from "recharts"

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
  
  // Calcular tasa de conversión del funnel
  const tasaConversion = funnelData.length > 0 && funnelData[0].count > 0
    ? Math.round((funnelData[funnelData.length - 1].count / funnelData[0].count) * 100)
    : 0

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

        {/* KPIs de Postulaciones */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Postulaciones</h2>
          <PostulacionesKPIs stats={postulacionesStats} />
        </div>

        {/* KPIs de Onboarding */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Onboarding</h2>
          <OnboardingKPIs stats={onboardingStats} />
        </div>

        {/* Gráficos - Primera fila */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Funnel de Conversión */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-blue-500" />
                Funnel de Conversión
              </CardTitle>
              <CardDescription>
                Progreso de postulantes por step ({tasaConversion}% tasa de completado)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="label" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6">
                    {funnelData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`hsl(217, 91%, ${70 - index * 10}%)`} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Visitas por Día */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                Nuevas Postulaciones (7 días)
              </CardTitle>
              <CardDescription>
                Visitas al formulario en la última semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={visitasPorDia}>
                  <defs>
                    <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="visitas" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorVisitas)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos - Segunda fila */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Completados por Día */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Postulaciones Completadas (7 días)
              </CardTitle>
              <CardDescription>
                Formularios finalizados por día
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={completadosPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completados" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Abandonos por Step */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Abandonos por Step
              </CardTitle>
              <CardDescription>
                Puntos donde los usuarios abandonan el formulario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={abandonoPorStep}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="abandonos" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Distribución por Edades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Distribución por Edades
            </CardTitle>
            <CardDescription>
              Rangos etarios de los postulantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Gráfico de torta */}
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={edadesPorRango}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.rango}: ${entry.porcentaje.toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="cantidad"
                  >
                    {edadesPorRango.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              {/* Tabla de datos */}
              <div className="space-y-2">
                {edadesPorRango.map((rango, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: rango.fill }}
                      />
                      <span className="font-medium">{rango.rango} años</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{rango.cantidad}</div>
                      <div className="text-xs text-muted-foreground">
                        {rango.porcentaje.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}