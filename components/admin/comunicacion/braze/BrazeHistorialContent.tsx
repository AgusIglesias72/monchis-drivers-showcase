// components/admin/comunicacion/braze/BrazeHistorialContent.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface BrazeExecution {
  id: string
  recipientCount: number
  status: string
  brazeMessageId: string | null
  errorMessage: string | null
  executedAt: string
  trigger: {
    id: string
    title: string
    triggerType: string
  }
  executedByUser: {
    fullName: string | null
    email: string
  }
  formDriver: {
    fullName: string | null
    phoneNumber: string
  } | null
}

export function BrazeHistorialContent() {
  const [executions, setExecutions] = useState<BrazeExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchExecutions()
  }, [])

  async function fetchExecutions() {
    try {
      const response = await fetch('/api/braze/executions?limit=100')
      const data = await response.json()

      if (data.success) {
        setExecutions(data.executions)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Error fetching executions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Ejecuciones</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Exitosas</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {executions.filter((e) => e.status === 'SENT').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Fallidas</CardDescription>
            <CardTitle className="text-3xl text-destructive">
              {executions.filter((e) => e.status === 'FAILED').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Ejecuciones</CardTitle>
          <CardDescription>
            Últimas {executions.length} ejecuciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No hay ejecuciones registradas aún
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Destinatarios</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Dispatch ID</TableHead>
                    <TableHead>Ejecutado Por</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((execution) => (
                    <TableRow key={execution.id}>
                      <TableCell>
                        <div className="font-medium">{execution.trigger.title}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            execution.trigger.triggerType === 'CAMPAIGN' ? 'default' : 'secondary'
                          }
                        >
                          {execution.trigger.triggerType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
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
                        {execution.status === 'FAILED' && execution.errorMessage && (
                          <div className="text-xs text-destructive mt-1">
                            {execution.errorMessage.substring(0, 50)}...
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {execution.brazeMessageId ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {execution.brazeMessageId.substring(0, 12)}...
                          </code>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {execution.executedByUser.fullName || execution.executedByUser.email}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(execution.executedAt), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
