// app/admin/reportes/components/jobs/ProcessingMonitor.tsx
"use client"

import { useEffect, useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  X,
  AlertTriangle,
  StopCircle,
} from "lucide-react"
import { toast } from "sonner"
import { cancelJob, getJobDetails } from '@/app/admin/reportes/actions'

interface ProcessingMonitorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  jobType?: string
  onJobComplete?: () => void
}

const STATUS_CONFIG = {
  QUEUED: {
    label: 'En Cola',
    icon: Clock,
    color: 'bg-warning',
    variant: 'secondary' as const,
  },
  PROCESSING: {
    label: 'Procesando',
    icon: Loader2,
    color: 'bg-info',
    variant: 'default' as const,
  },
  COMPLETED: {
    label: 'Completado',
    icon: CheckCircle,
    color: 'bg-success',
    variant: 'default' as const,
  },
  FAILED: {
    label: 'Fallido',
    icon: XCircle,
    color: 'bg-destructive',
    variant: 'destructive' as const,
  },
  CANCELLED: {
    label: 'Cancelado',
    icon: AlertTriangle,
    color: 'bg-warning',
    variant: 'secondary' as const,
  },
}

export function ProcessingMonitor({
  open,
  onOpenChange,
  jobId,
  jobType = 'Conductores Externos',
  onJobComplete,
}: ProcessingMonitorProps) {
  const [status, setStatus] = useState<keyof typeof STATUS_CONFIG>('QUEUED')
  const [progress, setProgress] = useState(0)
  const [current, setCurrent] = useState(0)
  const [total, setTotal] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [isCancelling, setIsCancelling] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)

  // Polling del estado del job
  useEffect(() => {
    if (!open || !jobId) return

    const pollJobStatus = async () => {
      try {
        const job = await getJobDetails(jobId)
        
        setStatus(job.status as keyof typeof STATUS_CONFIG)
        setProgress(job.progress)
        setCurrent(job.current)
        setTotal(job.total)
        setLogs(Array.isArray(job.logs) ? job.logs.map(log => log as string) : [])
        setResult(job.result)
        setError(job.error)

        // Si terminó, detener polling
        if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current)
            pollingInterval.current = null
          }

          if (job.status === 'COMPLETED') {
            toast.success('Proceso completado exitosamente')
            onJobComplete?.()
          } else if (job.status === 'FAILED') {
            toast.error('El proceso falló')
          }
        }
      } catch (error: any) {
        console.error('Error polling job:', error)
      }
    }

    // Polling inicial inmediato
    pollJobStatus()

    // Polling cada 2 segundos
    pollingInterval.current = setInterval(pollJobStatus, 2000)

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
      }
    }
  }, [open, jobId, onJobComplete])

  // Auto-scroll en logs
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [logs])

  const handleCancel = async () => {
    if (!jobId) return
    
    setIsCancelling(true)
    try {
      await cancelJob(jobId)
      toast.success('Proceso cancelado')
      setStatus('CANCELLED')
    } catch (error: any) {
      toast.error(error.message || 'Error al cancelar el proceso')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleClose = () => {
    if (status === 'PROCESSING') {
      const confirm = window.confirm(
        '¿Cerrar el monitor? El proceso seguirá ejecutándose en segundo plano.'
      )
      if (!confirm) return
    }
    onOpenChange(false)
  }

  const StatusIcon = STATUS_CONFIG[status]?.icon || Clock
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.QUEUED

  const canCancel = status === 'QUEUED' || status === 'PROCESSING'
  const isFinished = status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center justify-between pr-8">
            <span className="flex items-center gap-2.5 text-lg">
              <StatusIcon 
                className={`h-5 w-5 ${status === 'PROCESSING' ? 'animate-spin text-primary' : ''}`}
              />
              {jobType}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Actualización automática cada 2 segundos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Estado */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
            <span className="text-sm font-medium">Estado</span>
            <Badge variant={statusConfig.variant} className="gap-1.5">
              <StatusIcon className={`h-3 w-3 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Progreso */}
          {total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progreso</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {current} / {total} ({progress}%)
                </span>
              </div>
              <Progress value={progress} className="h-2.5" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm">
              <p className="font-semibold text-destructive flex items-center gap-1.5">
                <XCircle className="h-4 w-4" />
                Error
              </p>
              <p className="mt-1.5 text-destructive/90 text-xs">{error}</p>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="rounded-lg bg-success-soft border border-success p-3">
              <p className="font-semibold text-success flex items-center gap-1.5 text-sm mb-3">
                <CheckCircle className="h-4 w-4" />
                Resultado
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-success-soft">
                  <p className="text-success font-bold text-2xl">{result.successful}</p>
                  <p className="text-success text-xs mt-1">Exitosos</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-danger-soft">
                  <p className="text-destructive font-bold text-2xl">{result.failed}</p>
                  <p className="text-destructive text-xs mt-1">Fallidos</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-info-soft">
                  <p className="text-info font-bold text-2xl">{result.total}</p>
                  <p className="text-info text-xs mt-1">Total</p>
                </div>
              </div>
              {(result.jsFolder || result.mgFolder) && (
                <div className="mt-3 space-y-1 text-xs text-success bg-success-soft p-2 rounded">
                  {result.jsFolder && <p>📁 JS: {result.jsFolder}</p>}
                  {result.mgFolder && <p>📁 M&G: {result.mgFolder}</p>}
                </div>
              )}
            </div>
          )}

          {/* Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Logs de Ejecución</span>
              <span className="text-xs text-muted-foreground">{logs.length} entradas</span>
            </div>
            <ScrollArea 
              ref={scrollAreaRef}
              className="h-[280px] rounded-lg border bg-slate-950 p-3"
            >
              {logs.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-slate-500">
                    Esperando logs del proceso...
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5 font-mono text-[11px] leading-relaxed">
                  {logs.map((log, index) => {
                    // Limpiar timestamp del log
                    const cleanLog = log.replace(/^\[.*?\]\s*/, '')
                    
                    // Determinar color según el contenido
                    let colorClass = 'text-slate-300'
                    if (cleanLog.includes('✅')) colorClass = 'text-green-400'
                    else if (cleanLog.includes('❌')) colorClass = 'text-red-400'
                    else if (cleanLog.includes('📊') || cleanLog.includes('📁') || cleanLog.includes('🤖') || cleanLog.includes('🚀')) colorClass = 'text-blue-400 font-semibold'
                    else if (cleanLog.includes('═══')) colorClass = 'text-slate-600'
                    else if (cleanLog.includes('⚠️')) colorClass = 'text-orange-400'
                    else if (cleanLog.includes('💡')) colorClass = 'text-yellow-400'
                    
                    return (
                      <div key={index} className={colorClass}>
                        {cleanLog}
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 justify-end pt-2 border-t">
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancel}
                disabled={isCancelling}
                className="gap-2"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <StopCircle className="h-4 w-4" />
                    Cancelar Proceso
                  </>
                )}
              </Button>
            )}
            {isFinished && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cerrar
              </Button>
            )}
          </div>

          {/* Info adicional */}
          {status === 'PROCESSING' && !isFinished && (
            <div className="text-center py-2 px-3 rounded-lg bg-info-soft border border-info">
              <p className="text-xs text-info">
                💡 El proceso continúa en segundo plano si cierras esta ventana
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}