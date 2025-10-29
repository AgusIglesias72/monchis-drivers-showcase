// app/admin/reportes/components/jobs/ProcessingMonitor.tsx
"use client"

import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
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
} from "lucide-react"
import { toast } from "sonner"
import { cancelJob } from '@/app/admin/reportes/actions'

interface ProcessingMonitorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  jobType?: string
  onJobComplete?: () => void
}

interface JobUpdate {
  id: string
  status: string
  progress?: {
    current: number
    total: number
    percentage: number
  }
  result?: any
  error?: string
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pendiente',
    icon: Clock,
    color: 'bg-gray-500',
    variant: 'secondary' as const,
  },
  PROCESSING: {
    label: 'Procesando',
    icon: Loader2,
    color: 'bg-blue-500',
    variant: 'default' as const,
  },
  COMPLETED: {
    label: 'Completado',
    icon: CheckCircle,
    color: 'bg-green-500',
    variant: 'default' as const,
  },
  FAILED: {
    label: 'Fallido',
    icon: XCircle,
    color: 'bg-red-500',
    variant: 'destructive' as const,
  },
  CANCELLED: {
    label: 'Cancelado',
    icon: AlertTriangle,
    color: 'bg-orange-500',
    variant: 'secondary' as const,
  },
}

export function ProcessingMonitor({
  open,
  onOpenChange,
  jobId,
  jobType = 'DRIVER_PROCESSING',
  onJobComplete,
}: ProcessingMonitorProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [status, setStatus] = useState<keyof typeof STATUS_CONFIG>('PENDING')
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string }>>([])
  const [isCancelling, setIsCancelling] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)

  // Conectar WebSocket
  useEffect(() => {
    if (!open || !jobId) return

    const newSocket = io('/api/socketio', {
      path: '/api/socketio',
    })

    newSocket.on('connect', () => {
      console.log('✅ WebSocket conectado')
      newSocket.emit('subscribe-job', jobId)
    })

    newSocket.on('job-update', (data: JobUpdate) => {
      console.log('📨 Job update:', data)
      if (data.id === jobId) {
        setStatus(data.status as keyof typeof STATUS_CONFIG)
        if (data.progress) {
          setProgress(data.progress)
        }
        if (data.result) {
          setResult(data.result)
        }
      }
    })

    newSocket.on('job-log', (data: { jobId: string; message: string; timestamp: string }) => {
      if (data.jobId === jobId) {
        setLogs(prev => [...prev, { timestamp: data.timestamp, message: data.message }])
      }
    })

    newSocket.on('job-progress', (data: { jobId: string; current: number; total: number; percentage: number }) => {
      if (data.jobId === jobId) {
        setProgress({ current: data.current, total: data.total, percentage: data.percentage })
      }
    })

    newSocket.on('job-completed', (data: { jobId: string; result: any }) => {
      if (data.jobId === jobId) {
        setStatus('COMPLETED')
        setResult(data.result)
        toast.success('Proceso completado exitosamente')
        onJobComplete?.()
      }
    })

    newSocket.on('job-failed', (data: { jobId: string; error: string }) => {
      if (data.jobId === jobId) {
        setStatus('FAILED')
        toast.error('El proceso falló')
      }
    })

    newSocket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error)
      toast.error('Error de conexión en tiempo real')
    })

    setSocket(newSocket)

    return () => {
      newSocket.emit('unsubscribe-job', jobId)
      newSocket.disconnect()
    }
  }, [open, jobId, onJobComplete])

  // Auto-scroll en logs
  useEffect(() => {
    if (shouldAutoScroll.current && scrollAreaRef.current) {
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
    } catch (error) {
      toast.error('Error al cancelar el proceso')
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
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING

  const canCancel = status === 'PENDING' || status === 'PROCESSING'
  const isFinished = status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <StatusIcon 
                className={`h-5 w-5 ${status === 'PROCESSING' ? 'animate-spin' : ''}`}
              />
              Procesamiento: {jobType}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Monitoreando proceso en tiempo real
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Estado */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Estado:</span>
            <Badge variant={statusConfig.variant} className="gap-1">
              <StatusIcon className={`h-3 w-3 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Progress Bar */}
          {progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progreso:</span>
                <span className="text-muted-foreground">
                  {progress.current} / {progress.total} ({Math.round(progress.percentage)}%)
                </span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="rounded-lg border p-3 bg-muted/50">
              <h4 className="text-sm font-semibold mb-2">Resultado:</h4>
              <div className="text-sm space-y-1">
                {result.exitosos !== undefined && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Exitosos: {result.exitosos}</span>
                  </div>
                )}
                {result.fallidos !== undefined && result.fallidos > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>Fallidos: {result.fallidos}</span>
                  </div>
                )}
                {result.duracionMinutos !== undefined && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span>Duración: {result.duracionMinutos} min</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Logs Terminal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Logs:</h4>
              <span className="text-xs text-muted-foreground">
                {logs.length} mensajes
              </span>
            </div>
            
            <ScrollArea 
              ref={scrollAreaRef}
              className="h-64 rounded-lg border bg-black/95 p-3"
            >
              <div className="font-mono text-xs space-y-1">
                {logs.length === 0 ? (
                  <div className="text-gray-500">Esperando logs...</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="text-green-400">
                      <span className="text-gray-500">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      {' '}
                      {log.message}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            {canCancel && (
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  'Cancelar Proceso'
                )}
              </Button>
            )}
            
            <Button
              variant={isFinished ? "default" : "outline"}
              onClick={handleClose}
              className="ml-auto"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}