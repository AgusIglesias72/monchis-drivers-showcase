// app/admin/reportes/components/jobs/JobsHistoryTable.tsx
"use client"

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  AlertTriangle,
  MoreVertical,
  Eye,
  Ban,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { ProcessingMonitor } from './ProcessingMonitor'
import { cancelJob } from '@/app/admin/reportes/actions'

interface Job {
  id: string
  type: string
  status: string
  progress: {
    current: number
    total: number
    percentage: number
  } | null
  metadata: {
    startDate?: string
    endDate?: string
    weekName?: string
  } | null
  result: {
    exitosos?: number
    fallidos?: number
    duracionMinutos?: number
  } | null
  error: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

interface JobsHistoryTableProps {
  jobs: Job[]
  onRefresh?: () => void
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pendiente',
    icon: Clock,
    variant: 'secondary' as const,
  },
  PROCESSING: {
    label: 'Procesando',
    icon: Loader2,
    variant: 'default' as const,
  },
  COMPLETED: {
    label: 'Completado',
    icon: CheckCircle,
    variant: 'default' as const,
  },
  FAILED: {
    label: 'Fallido',
    icon: XCircle,
    variant: 'destructive' as const,
  },
  CANCELLED: {
    label: 'Cancelado',
    icon: AlertTriangle,
    variant: 'secondary' as const,
  },
}

const JOB_TYPE_LABELS: Record<string, string> = {
  DRIVER_PROCESSING: 'Procesamiento Conductores',
  REPORT_GENERATION: 'Generación Reportes',
  DATA_IMPORT: 'Importación Datos',
}

export function JobsHistoryTable({ jobs, onRefresh }: JobsHistoryTableProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [monitorOpen, setMonitorOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState<string | null>(null)

  const handleViewDetails = (jobId: string) => {
    setSelectedJobId(jobId)
    setMonitorOpen(true)
  }

  const handleCancelJob = async (jobId: string) => {
    if (!confirm('¿Estás seguro de cancelar este proceso?')) return

    setIsCancelling(jobId)
    try {
      await cancelJob(jobId)
      toast.success('Proceso cancelado')
      onRefresh?.()
    } catch (error) {
      toast.error('Error al cancelar el proceso')
    } finally {
      setIsCancelling(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt || !completedAt) return '-'
    const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime()
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Procesos</CardTitle>
          <CardDescription>No hay procesos registrados aún</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Los procesos aparecerán aquí una vez que inicies el procesamiento
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Historial de Procesos</CardTitle>
            <CardDescription>
              {jobs.length} proceso{jobs.length !== 1 ? 's' : ''} registrado{jobs.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const StatusIcon = STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG]?.icon || Clock
                  const statusConfig = STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING
                  const canCancel = job.status === 'PENDING' || job.status === 'PROCESSING'

                  return (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">
                        {JOB_TYPE_LABELS[job.type] || job.type}
                      </TableCell>
                      
                      <TableCell>
                        {job.metadata?.startDate && job.metadata?.endDate ? (
                          <div className="text-sm">
                            <div>{job.metadata.startDate}</div>
                            <div className="text-muted-foreground">
                              al {job.metadata.endDate}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant={statusConfig.variant} className="gap-1">
                          <StatusIcon 
                            className={`h-3 w-3 ${job.status === 'PROCESSING' ? 'animate-spin' : ''}`}
                          />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {job.progress && job.progress.total > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="text-sm">
                              {job.progress.current}/{job.progress.total}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ({Math.round(job.progress.percentage)}%)
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>

                      <TableCell>
                        {job.result ? (
                          <div className="text-sm space-y-1">
                            {job.result.exitosos !== undefined && (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                {job.result.exitosos}
                              </div>
                            )}
                            {job.result.fallidos !== undefined && job.result.fallidos > 0 && (
                              <div className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-3 w-3" />
                                {job.result.fallidos}
                              </div>
                            )}
                          </div>
                        ) : job.error ? (
                          <div className="text-xs text-destructive truncate max-w-[150px]" title={job.error}>
                            {job.error}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>

                      <TableCell className="text-sm">
                        {formatDate(job.createdAt)}
                      </TableCell>

                      <TableCell className="text-sm">
                        {formatDuration(job.startedAt, job.completedAt)}
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(job.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </DropdownMenuItem>
                            {canCancel && (
                              <DropdownMenuItem
                                onClick={() => handleCancelJob(job.id)}
                                disabled={isCancelling === job.id}
                                className="text-destructive"
                              >
                                {isCancelling === job.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Cancelando...
                                  </>
                                ) : (
                                  <>
                                    <Ban className="mr-2 h-4 w-4" />
                                    Cancelar
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Monitor de Procesamiento */}
      {selectedJobId && (
        <ProcessingMonitor
          open={monitorOpen}
          onOpenChange={setMonitorOpen}
          jobId={selectedJobId}
          onJobComplete={() => {
            onRefresh?.()
          }}
        />
      )}
    </>
  )
}