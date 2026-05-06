'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Calendar, X, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatPYShort, ymdInTZ } from '@/lib/utils/onboarding-time'
import { DAY_NAMES_ES } from '@/lib/types/onboarding-rules.types'

interface EventRow {
  id: string
  scheduledDate: Date
  startTime: string
  endTime: string | null
  currentCapacity: number
  maxCapacity: number | null
  status: string
}

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  SCHEDULED: { className: 'bg-info-soft text-info', label: 'Agendado' },
  IN_PROGRESS: { className: 'bg-warning-soft text-warning', label: 'En curso' },
  COMPLETED: { className: 'bg-success-soft text-success', label: 'Completado' },
  CANCELLED: { className: 'bg-danger-soft text-danger', label: 'Cancelado' },
  POSTPONED: { className: 'bg-muted text-foreground', label: 'Pospuesto' },
  DRAFT: { className: 'bg-muted text-muted-foreground', label: 'Borrador' },
}

export function RuleEventsTable({ ruleId, events }: { ruleId: string; events: EventRow[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function cancelInstance(eventId: string, dateISO: string) {
    setBusy(eventId)
    try {
      const ymd = dateISO.slice(0, 10)
      const res = await fetch(`/api/admin/onboarding/rules/${ruleId}/exceptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleId,
          date: ymd,
          type: 'CANCELLED',
          reason: 'Cancelado desde panel admin',
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Fecha cancelada — se creó una excepción')
      router.refresh()
    } catch {
      toast.error('No se pudo cancelar')
    } finally {
      setBusy(null)
    }
  }

  if (events.length === 0) {
    return (
      <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-8 text-center space-y-2">
        <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50" />
        <div className="font-medium text-foreground">Sin cupos próximos</div>
        <div>
          Los slots se generan automáticamente cada noche. Si querés generarlos ahora, usá
          "Materializar" desde la lista de eventos.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Día</TableHead>
            <TableHead>Hora</TableHead>
            <TableHead>Cupo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-32"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((e) => {
            const date = new Date(e.scheduledDate)
            const ymd = ymdInTZ(date)
            const dow = new Date(ymd + 'T12:00:00').getDay()
            const ratio = e.maxCapacity ? e.currentCapacity / e.maxCapacity : 0
            return (
              <TableRow key={e.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {formatPYShort(date)}
                  </div>
                </TableCell>
                <TableCell className="capitalize">{DAY_NAMES_ES[dow]}</TableCell>
                <TableCell>
                  {e.startTime}
                  {e.endTime && <span className="text-muted-foreground"> — {e.endTime}</span>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-muted rounded overflow-hidden">
                      <div
                        className={`h-full ${ratio >= 1 ? 'bg-danger' : ratio >= 0.7 ? 'bg-warning' : 'bg-success'}`}
                        style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs">
                      {e.currentCapacity}/{e.maxCapacity ?? '—'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={STATUS_BADGE[e.status]?.className || 'bg-muted'}
                    variant="secondary"
                  >
                    {STATUS_BADGE[e.status]?.label || e.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/onboarding/${e.id}`}>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                    {e.status === 'SCHEDULED' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={busy === e.id}>
                            <X className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Cancelar esta fecha?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se creará una excepción y los asistentes ya reservados deberán reagendar.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Volver</AlertDialogCancel>
                            <AlertDialogAction onClick={() => cancelInstance(e.id, e.scheduledDate.toString())}>
                              Cancelar fecha
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
