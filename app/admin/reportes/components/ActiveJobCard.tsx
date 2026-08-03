// app/admin/reportes/components/ActiveJobCard.tsx
"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
} from "lucide-react"
import { getJobDetails } from '@/app/admin/reportes/actions'

interface ActiveJobCardProps {
  jobId: string
  onClose?: () => void
}

const STATUS_CONFIG = {
  QUEUED: {
    label: 'En Cola',
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

export function ActiveJobCard({ jobId, onClose }: ActiveJobCardProps) {
  const [status, setStatus] = useState<keyof typeof STATUS_CONFIG>('QUEUED')
  const [progress, setProgress] = useState(0)
  const [current, setCurrent] = useState(0)
  const [total, setTotal] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)

  useEffect(() => {
    const pollJobStatus = async () => {
      try {
        const job = await getJobDetails(jobId)
        
        setStatus(job.status as keyof typeof STATUS_CONFIG)
        setProgress(job.progress)
        setCurrent(job.current)
        setTotal(job.total)
        setLogs(Array.isArray(job.logs) ? job.logs.map((log: any) => log as string) : [])
        setResult(job.result)
        setError(job.error)
      } catch (error: any) {
        console.error('Error polling job:', error)
      }
    }

    // Polling inicial
    pollJobStatus()

    // Polling cada 2 segundos
    const interval = setInterval(pollJobStatus, 2000)

    return () => clearInterval(interval)
  }, [jobId])

  const StatusIcon = STATUS_CONFIG[status]?.icon || Clock
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.QUEUED
  const isFinished = status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED'

  return (
    <Card className="border-2 border-primary/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <StatusIcon 
                className={`h-5 w-5 ${status === 'PROCESSING' ? 'animate-spin text-primary' : ''}`}
              />
              Proceso en Curso
            </CardTitle>
            <CardDescription className="text-xs">
              Monitoreando procesamiento de conductores externos
            </CardDescription>
          </div>
          {isFinished && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Estado */}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
          <span className="text-xs font-medium">Estado</span>
          <Badge variant={statusConfig.variant} className="gap-1.5">
            <StatusIcon className={`h-3 w-3 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Progreso */}
        {total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Progreso</span>
              <span className="text-muted-foreground font-mono">
                {current} / {total} ({progress}%)
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs">
            <p className="font-semibold text-destructive flex items-center gap-1.5">
              <XCircle className="h-4 w-4" />
              Error
            </p>
            <p className="mt-1.5 text-destructive/90">{error}</p>
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3">
            <p className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-1.5 text-xs">
              <CheckCircle className="h-4 w-4" />
              Completado Exitosamente
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 rounded bg-green-100 dark:bg-green-900/30">
                <p className="text-green-600 dark:text-green-400 font-bold text-lg">{result.successful}</p>
                <p className="text-green-700 dark:text-green-300 text-[10px]">Exitosos</p>
              </div>
              <div className="text-center p-2 rounded bg-red-100 dark:bg-red-900/30">
                <p className="text-red-600 dark:text-red-400 font-bold text-lg">{result.failed}</p>
                <p className="text-red-700 dark:text-red-300 text-[10px]">Fallidos</p>
              </div>
              <div className="text-center p-2 rounded bg-blue-100 dark:bg-blue-900/30">
                <p className="text-blue-600 dark:text-blue-400 font-bold text-lg">{result.total}</p>
                <p className="text-blue-700 dark:text-blue-300 text-[10px]">Total</p>
              </div>
            </div>
            {(result.jsFolder || result.mgFolder) && (
              <div className="mt-2 space-y-1 text-[10px] text-green-700 dark:text-green-300">
                {result.jsFolder && <p>📁 JS: {result.jsFolder}</p>}
                {result.mgFolder && <p>📁 M&G: {result.mgFolder}</p>}
              </div>
            )}
          </div>
        )}

        {/* Toggle Logs */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLogs(!showLogs)}
              className="w-full h-8 text-xs"
            >
              {showLogs ? (
                <>
                  <EyeOff className="mr-2 h-3.5 w-3.5" />
                  Ocultar Logs
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-3.5 w-3.5" />
                  Ver Logs
                </>
              )}
              <span className="ml-1 text-muted-foreground">({logs.length})</span>
            </Button>

            {showLogs && (
              <ScrollArea className="h-[180px] rounded-lg border bg-slate-950 p-2.5">
                <div className="space-y-0.5 font-mono text-[10px] leading-relaxed">
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
              </ScrollArea>
            )}
          </div>
        )}

        {/* Mensaje según estado */}
        {status === 'PROCESSING' && !isFinished && (
          <div className="text-center py-2 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
            <p className="text-[10px] text-blue-700 dark:text-blue-300">
              💡 El proceso continúa en segundo plano. Puedes cerrar esta página.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}