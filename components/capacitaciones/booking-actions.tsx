'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarClock, X, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Props {
  confirmationToken: string
  ruleSlug: string
  canCancel: boolean
  canReschedule: boolean
}

export function BookingActions({ confirmationToken, ruleSlug, canCancel, canReschedule }: Props) {
  const router = useRouter()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  async function doCancel() {
    setBusy(true)
    try {
      const res = await fetch(`/api/public/booking/${confirmationToken}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No pudimos cancelar')
      }
      toast.success('Reserva cancelada')
      setCancelOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Error al cancelar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-6 border-t">
      <p className="text-sm text-muted-foreground flex-1">¿No vas a poder asistir?</p>
      {canReschedule && (
        <Button variant="outline" size="sm" onClick={() => router.push(`/capacitaciones/${ruleSlug}?reschedule=${confirmationToken}`)}>
          <CalendarClock className="mr-2 h-4 w-4" />
          Cambiar fecha
        </Button>
      )}
      {canCancel && (
        <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>
          <X className="mr-2 h-4 w-4" />
          Cancelar reserva
        </Button>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cancelar tu reserva?</DialogTitle>
            <DialogDescription>
              Liberamos el cupo para otro postulante. Podés volver a reservar en cualquier momento.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Ej: Tengo otro compromiso..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={busy}>
              Volver
            </Button>
            <Button onClick={doCancel} disabled={busy} variant="destructive">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sí, cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
