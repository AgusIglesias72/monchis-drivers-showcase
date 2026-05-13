// components/postulacion/active-booking-card.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Loader2,
  MapPin,
  Pencil,
  Trash2,
  Video,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { AssignedCapacitacionInfo } from '@/lib/types/portal.types'

interface Props {
  booking: AssignedCapacitacionInfo
  onUpdate: () => void
}

const MODALITY_ICON = {
  IN_PERSON: MapPin,
  VIRTUAL: Video,
  HYBRID: Zap,
} as const

const MODALITY_LABEL = {
  IN_PERSON: 'Presencial',
  VIRTUAL: 'Virtual',
  HYBRID: 'Híbrida',
} as const

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('es-PY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function ActiveBookingCard({ booking, onUpdate }: Props) {
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Deadline para cancelar — si ya pasó, ocultamos el botón y mostramos copy.
  const deadline = new Date(
    new Date(booking.scheduledDate).getTime() -
      booking.cancelDeadlineHours * 60 * 60 * 1000,
  )
  const canCancel = Date.now() < deadline.getTime()

  const Icon = booking.modality ? MODALITY_ICON[booking.modality] : Calendar
  const modalityLabel = booking.modality ? MODALITY_LABEL[booking.modality] : null

  // Reschedule via UI solo es viable cuando tenemos slug — la landing no lee
  // el query reschedule, así que el fallback genérico crearía una reserva
  // nueva en lugar de reagendar. Para legacy sin rule, exponemos un botón
  // explícito que abre WhatsApp con texto pre-llenado, en vez de ocultar
  // silenciosamente la acción y dejar al postulante sin path para cambiar.
  const canReschedule = Boolean(booking.ruleSlug)
  const reschedHref = canReschedule
    ? `/capacitaciones/${booking.ruleSlug}?reschedule=${booking.confirmationToken}`
    : null

  const detailHref = `/capacitaciones/reserva/${booking.confirmationToken}`

  // WhatsApp pre-llenado para cambios fuera de la UI (legacy o post-deadline)
  const whatsappChangeHref = `https://wa.me/15754194027?text=${encodeURIComponent(
    `Hola, quiero cambiar mi capacitación del ${formatDate(booking.scheduledDate)} a las ${booking.startTime}.`,
  )}`

  async function handleCancel() {
    setCancelling(true)
    try {
      const res = await fetch(
        `/api/public/booking/${booking.confirmationToken}/cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'self-portal' }),
        },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No pudimos cancelar')
      }
      toast.success('Reserva cancelada')
      setShowCancelDialog(false)
      onUpdate()
    } catch (err: any) {
      toast.error(err?.message || 'No pudimos cancelar')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-green-600 text-white flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-green-700">
              Capacitación reservada
            </p>
            <p className="text-sm font-bold text-gray-900 leading-tight first-letter:uppercase">
              {booking.ruleTitle || 'Tu capacitación'}
            </p>
          </div>
        </div>
        {modalityLabel && (
          <Badge className="bg-white text-green-700 border border-green-300 hover:bg-white shrink-0">
            <Icon className="h-3 w-3 mr-1" />
            {modalityLabel}
          </Badge>
        )}
      </div>

      {/* Detalles */}
      <div className="space-y-2 text-sm text-gray-800 mb-4">
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 mt-0.5 text-green-700 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium first-letter:uppercase">
              {formatDate(booking.scheduledDate)}
            </p>
            <p className="text-xs text-gray-600 tabular-nums">
              {booking.startTime} — {booking.endTime}
              {booking.durationMinutes ? ` · ${booking.durationMinutes} min` : ''}
            </p>
          </div>
        </div>
        {booking.modality !== 'VIRTUAL' && booking.locationAddress && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-green-700 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium">{booking.location}</p>
              <p className="text-xs text-gray-600 break-words">
                {booking.locationAddress}
              </p>
            </div>
          </div>
        )}
        {booking.modality === 'VIRTUAL' && booking.meetingLink && (
          <div className="flex items-start gap-2">
            <Video className="h-4 w-4 mt-0.5 text-green-700 shrink-0" />
            <a
              href={booking.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-700 hover:underline break-all"
            >
              {booking.meetingLink}
            </a>
          </div>
        )}
      </div>

      {/* Acciones — siempre exponemos 3 paths: ver detalles, cambiar, cancelar.
          Si canReschedule=false (legacy sin slug), el "Cambiar" abre WhatsApp en
          vez de ocultarse — así el postulante siempre tiene un camino. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="border-green-300 text-green-800 hover:bg-green-50"
        >
          <Link href={detailHref}>
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Ver detalles
          </Link>
        </Button>

        {canReschedule && reschedHref ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-green-300 text-green-800 hover:bg-green-50"
          >
            <Link href={reschedHref}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Cambiar fecha
            </Link>
          </Button>
        ) : (
          <a
            href={whatsappChangeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-green-300 bg-white text-xs font-medium text-green-800 hover:bg-green-50 h-9 px-3"
          >
            <Pencil className="h-3.5 w-3.5" />
            Cambiar por WhatsApp
          </a>
        )}

        {canCancel ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCancelDialog(true)}
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Cancelar
          </Button>
        ) : (
          <a
            href="https://wa.me/15754194027?text=Hola%2C%20necesito%20cancelar%20mi%20capacitaci%C3%B3n"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 h-9 px-3"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Cancelar por WhatsApp
          </a>
        )}
      </div>

      {/* Footer info — copy honesto sobre qué se puede hacer self-service vs por
          WhatsApp, para no prometer "cambio gratis" cuando en realidad va por chat. */}
      <div className="mt-3 pt-3 border-t border-green-100 flex items-center gap-1.5 text-[11px] text-gray-500">
        <Clock className="h-3 w-3" />
        {canCancel
          ? canReschedule
            ? `Cambio o cancelación online hasta ${booking.cancelDeadlineHours}h antes. Después, escribinos por WhatsApp.`
            : `Cancelación online hasta ${booking.cancelDeadlineHours}h antes. Para cambiar fecha, escribinos por WhatsApp.`
          : 'Ya pasó el plazo online — escribinos por WhatsApp.'}
      </div>

      {/* Confirm cancel */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar tu reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a perder el cupo del{' '}
              <strong className="first-letter:uppercase">
                {formatDate(booking.scheduledDate)}
              </strong>{' '}
              a las <strong>{booking.startTime}</strong>. Después podés volver a
              reservar otro día si seguís siendo elegible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>
              Mantener mi reserva
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleCancel()
              }}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
