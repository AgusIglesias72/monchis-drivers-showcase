// components/admin/comunicacion/braze/BrazeTriggerExecuteContent.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, PlayCircle, ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface BrazeTrigger {
  id: string
  title: string
  description: string | null
  triggerType: 'CAMPAIGN' | 'CANVAS'
  campaignId: string | null
  canvasId: string | null
  targetAudience: string | null
  defaultProperties: any
  tags: string[]
  executions: Array<{
    id: string
    recipientCount: number
    status: string
    brazeMessageId: string | null
    executedAt: string
    executedByUser: {
      fullName: string | null
      email: string
    }
  }>
  _count: {
    executions: number
  }
}

interface ExecutionResult {
  success: boolean
  sendId?: string
  dispatchId?: string
  error?: string
}

export function BrazeTriggerExecuteContent({ triggerId }: { triggerId: string }) {
  const [trigger, setTrigger] = useState<BrazeTrigger | null>(null)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)

  useEffect(() => {
    fetchTrigger()
  }, [triggerId])

  async function fetchTrigger() {
    try {
      const response = await fetch(`/api/braze/triggers/${triggerId}`)
      const data = await response.json()

      if (data.success) {
        setTrigger(data.trigger)
      }
    } catch (error) {
      console.error('Error fetching trigger:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleExecute() {
    setExecuting(true)
    setExecutionResult(null)

    try {
      // Ejecutar trigger en modo broadcast
      const response = await fetch('/api/braze/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          triggerId,
        }),
      })

      const data = await response.json()

      setExecutionResult(data)

      if (data.success) {
        // Refrescar para ver la nueva ejecución
        fetchTrigger()
      }
    } catch (error) {
      console.error('Error executing trigger:', error)
      setExecutionResult({
        success: false,
        error: 'Error al ejecutar el disparador',
      })
    } finally {
      setExecuting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!trigger) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Disparador no encontrado</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{trigger.title}</h1>
          <p className="text-muted-foreground mt-1">
            {trigger.description || 'Ejecuta este disparador'}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/comunicaciones/braze?tab=triggers">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Disparadores
          </Link>
        </Button>
      </div>

      {/* Info del trigger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información del Disparador</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Tipo</p>
            <Badge variant={trigger.triggerType === 'CAMPAIGN' ? 'default' : 'secondary'}>
              {trigger.triggerType}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {trigger.triggerType === 'CAMPAIGN' ? 'Campaign ID' : 'Canvas ID'}
            </p>
            <code className="text-sm bg-muted px-2 py-1 rounded">
              {trigger.campaignId || trigger.canvasId}
            </code>
          </div>
          {trigger.targetAudience && (
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Audiencia Objetivo</p>
              <p className="text-sm mt-1">{trigger.targetAudience}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Total de Ejecuciones</p>
            <p className="text-lg font-semibold">{trigger._count.executions}</p>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de ejecución */}
      <Card>
        <CardHeader>
          <CardTitle>Ejecutar Disparador en Modo Broadcast</CardTitle>
          <CardDescription>
            Este disparador se enviará a todos los usuarios configurados en la audiencia de Braze.
            La gestión de audiencias se realiza directamente en Braze.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info sobre broadcast */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Al ejecutar este trigger, se enviará a todos los usuarios que cumplan con los criterios de la campaña/canvas en Braze.
              No es necesario especificar destinatarios individuales.
            </AlertDescription>
          </Alert>

          {/* Resultado */}
          {executionResult && (
            <Alert variant={executionResult.success ? 'default' : 'destructive'}>
              {executionResult.success ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Trigger ejecutado exitosamente</strong>
                    {executionResult.sendId && (
                      <>
                        <br />
                        <strong>Send ID:</strong> <code className="ml-2 bg-muted px-2 py-1 rounded">{executionResult.sendId}</code>
                      </>
                    )}
                    {executionResult.dispatchId && (
                      <>
                        <br />
                        <strong>Dispatch ID:</strong> <code className="ml-2 bg-muted px-2 py-1 rounded">{executionResult.dispatchId}</code>
                      </>
                    )}
                  </AlertDescription>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Error:</strong> {executionResult.error}
                  </AlertDescription>
                </>
              )}
            </Alert>
          )}

          {/* Botón */}
          <Button onClick={handleExecute} disabled={executing} size="lg" className="w-full">
            {executing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ejecutando...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Ejecutar {trigger.triggerType === 'CAMPAIGN' ? 'Campaña' : 'Canvas'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Últimas ejecuciones */}
      {trigger.executions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Últimas 5 Ejecuciones</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinatarios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Dispatch ID</TableHead>
                  <TableHead>Ejecutado Por</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trigger.executions.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell>
                      {execution.recipientCount > 0 ? execution.recipientCount : 'Broadcast'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          execution.status === 'SENT'
                            ? 'default'
                            : execution.status === 'FAILED'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {execution.status === 'SENT' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {execution.status === 'FAILED' && <XCircle className="h-3 w-3 mr-1" />}
                        {execution.status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                        {execution.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {execution.brazeMessageId ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {execution.brazeMessageId}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {execution.executedByUser.fullName || execution.executedByUser.email}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(execution.executedAt), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
