// app/admin/reportes/page.tsx - EJEMPLO DE USO
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProcessWeekButton, JobsHistoryTable } from './components/jobs'
import { getJobsHistory, getJobsStats } from './actions'
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react'

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
      const [jobsData, statsData] = await Promise.all([
        getJobsHistory(),
        getJobsStats(),
      ])
      setJobs(jobsData as any)
      setStats(statsData as any)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reportes Conductores Externos</h1>
        <p className="text-muted-foreground mt-2">
          Procesa y descarga reportes semanales de conductores
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Procesos</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processing}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fallidos</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Acciones</h2>
          <p className="text-sm text-muted-foreground">
            Inicia un nuevo procesamiento de semana
          </p>
        </div>
        <ProcessWeekButton 
          onJobCreated={(jobId) => {
            console.log('Nuevo job creado:', jobId)
            loadData() // Recargar datos
          }}
          processedWeeks={jobs
            .filter((job: any) => job.status === 'COMPLETED')
            .map((job: any) => ({
              startDate: job.metadata?.startDate || '',
              endDate: job.metadata?.endDate || '',
            }))
          }
        />
      </div>

      {/* History Table */}
      <JobsHistoryTable 
        jobs={jobs} 
        onRefresh={loadData}
      />
    </div>
  )
}