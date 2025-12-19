// components/admin/comunicacion/braze/BonoPorLluviaHistorial.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { History, Loader2, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface BrazeExecution {
  id: string
  triggerId: string
  triggerTitle: string
  recipientCount: number
  triggerProperties: {
    hora_inicio?: string
    hora_final?: string
    monto?: number
  }
  status: string
  brazeMessageId: string | null
  executedAt: string
  executedBy: {
    email: string
    name: string
  }
  errorMessage: string | null
}

interface BonoPorLluviaHistorialProps {
  triggerId: string
  refreshKey?: number
}

export function BonoPorLluviaHistorial({ triggerId, refreshKey = 0 }: BonoPorLluviaHistorialProps) {
  const [executions, setExecutions] = useState<BrazeExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchExecutions = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/braze/executions?triggerId=${triggerId}&limit=10`)
        const data = await response.json()

        if (data.success) {
          setExecutions(data.executions)
        } else {
          setError(data.error || 'Error al cargar historial')
        }
      } catch (err) {
        console.error('Error fetching executions:', err)
        setError('Error al cargar historial')
      } finally {
        setLoading(false)
      }
    }

    fetchExecutions()
  }, [triggerId, refreshKey])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <Badge variant="default" className="bg-green-600">Enviado</Badge>
      case 'PENDING':
        return <Badge variant="secondary">Pendiente</Badge>
      case 'SENDING':
        return <Badge variant="secondary">Enviando...</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Fallido</Badge>
      case 'CANCELLED':
        return <Badge variant="outline">Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Historial de Envíos
        </CardTitle>
        <CardDescription>
          Últimos 10 envíos de bonos por lluvia
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-8 text-destructive justify-center">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        ) : executions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No hay envíos registrados aún</p>
          </div>
        ) : (
          <div className="space-y-3">
            {executions.map((execution) => (
              <div
                key={execution.id}
                className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(execution.status)}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(execution.executedAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enviado por {execution.executedBy.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {new Date(execution.executedAt).toLocaleString('es-PY', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Detalles */}
                {execution.triggerProperties && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Horario</p>
                      <p className="text-sm font-medium">
                        {execution.triggerProperties.hora_inicio} - {execution.triggerProperties.hora_final}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Monto</p>
                      <p className="text-sm font-medium">
                        {execution.triggerProperties.monto?.toLocaleString('es-PY')} Gs
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Destinatarios</p>
                      <p className="text-sm font-medium">{execution.recipientCount}</p>
                    </div>
                  </div>
                )}

                {/* Error message si existe */}
                {execution.errorMessage && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-destructive">{execution.errorMessage}</p>
                  </div>
                )}

                {/* Dispatch ID */}
                {execution.brazeMessageId && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Dispatch ID: <span className="font-mono">{execution.brazeMessageId}</span>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
