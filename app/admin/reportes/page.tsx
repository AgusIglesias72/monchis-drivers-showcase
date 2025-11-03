// app/admin/reportes/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalDriversReportCard } from './components/ExternalDriversReportCard'
import { JobsHistoryTable } from './components/jobs/JobsHistoryTable'
import { getJobsHistory } from './actions'
import { CheckCircle, XCircle, Loader2, Clock, FileText } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ReportesPage() {
  const [jobs, setJobs] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  })
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const jobsData = await getJobsHistory({ limit: 20 })
      setJobs(jobsData as any)
      
      // Calcular stats manualmente
      const newStats = {
        total: jobsData.length,
        pending: jobsData.filter((j: any) => j.status === 'QUEUED').length,
        processing: jobsData.filter((j: any) => j.status === 'PROCESSING').length,
        completed: jobsData.filter((j: any) => j.status === 'COMPLETED').length,
        failed: jobsData.filter((j: any) => j.status === 'FAILED').length,
      }
      setStats(newStats)
      
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reportes Automatizados</h1>
        <p className="text-muted-foreground mt-2">
          Genera y gestiona reportes automáticos del sistema
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Procesos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Cola</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Esperando iniciar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Procesando</CardTitle>
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processing}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En ejecución
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Finalizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fallidos</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Con errores
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Reportes Disponibles y Historial */}
      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="reports">Reportes Disponibles</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Tab: Reportes Disponibles */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {/* Card de Conductores Externos */}
            <ExternalDriversReportCard onJobStart={loadData} />

            {/* Placeholder para futuros reportes */}
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-xl text-muted-foreground">
                  Más Reportes Próximamente
                </CardTitle>
                <CardDescription>
                  Estamos trabajando en agregar más reportes automatizados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-40 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Próximos reportes en desarrollo...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Ejecuciones</CardTitle>
              <CardDescription>
                Últimos 20 procesos ejecutados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JobsHistoryTable 
                jobs={jobs} 
                onRefresh={loadData}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}