// app/capacitaciones/reserva/[token]/page.tsx

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { CheckCircle2, Calendar, Clock, MapPin, Video, Download, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ModalityBadge } from '@/components/capacitaciones/modality-badge'
import { BookingActions } from '@/components/capacitaciones/booking-actions'
import { formatPYLong } from '@/lib/utils/onboarding-time'
import { formatInTimeZone } from 'date-fns-tz'
import type { BookingDetail } from '@/lib/types/onboarding-rules.types'

export const dynamic = 'force-dynamic'

async function getBooking(token: string): Promise<BookingDetail | null> {
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host')
  const proto = h.get('x-forwarded-proto') || 'http'
  const base = host ? `${proto}://${host}` : ''
  const res = await fetch(`${base}/api/public/booking/${token}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

function gcalLink(b: BookingDetail): string {
  const start = new Date(b.scheduledDateUTC)
  // Wraparound: si endTime < startTime numéricamente (capacitación cruza
  // medianoche), sumamos 24h. Mismo tratamiento que el endpoint .ics.
  const [endH, endM] = b.endTime.split(':').map(Number)
  const [startH, startM] = b.startTime.split(':').map(Number)
  let minutesAdded = endH * 60 + endM - (startH * 60 + startM)
  if (minutesAdded < 0) minutesAdded += 24 * 60
  const duration = minutesAdded > 0 ? minutesAdded : 120
  const end = new Date(start.getTime() + duration * 60 * 1000)
  const fmt = (d: Date) => formatInTimeZone(d, 'UTC', "yyyyMMdd'T'HHmmss'Z'")
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: b.ruleTitle,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: b.instructions || '',
    location: b.location || b.locationAddress || b.meetingLink || '',
  })
  return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`
}

export default async function ReservaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const booking = await getBooking(token)
  if (!booking) return notFound()

  const start = new Date(booking.scheduledDateUTC)
  const isCancelled = booking.status === 'CANCELLED' || booking.status === 'NO_SHOW'
  const reschedTarget = booking.ruleSlug || ''

  // Distinguimos 3 casos de "no activa" para que el copy sea claro y el driver
  // entienda qué hacer ahora. Sin esta distinción todos terminan en "ya no está
  // activa" — engañoso para alguien que viene de WhatsApp viejo post-reschedule.
  const inactiveCase: 'reschedule' | 'noshow' | 'cancelled' | null = isCancelled
    ? booking.status === 'NO_SHOW'
      ? 'noshow'
      : booking.cancelledReason === 'reschedule'
        ? 'reschedule'
        : 'cancelled'
    : null

  const inactiveCopy =
    inactiveCase === 'reschedule'
      ? {
          title: 'Cambiaste a otra fecha',
          body: 'Esta reserva ya no está activa porque elegiste otro día. Volvé al portal para ver tu reserva actualizada.',
          cta: 'Ver mi reserva actual',
          href: '/postulacion',
        }
      : inactiveCase === 'noshow'
        ? {
            title: 'No asististe a esta capacitación',
            body: 'Quedó marcada como ausente. Podés reagendar eligiendo otra fecha cuando quieras.',
            cta: 'Reagendar capacitación',
            href: '/capacitaciones',
          }
        : {
            title: 'Reserva cancelada',
            body: 'Esta reserva ya no está activa. Podés volver a reservar otro día cuando quieras.',
            cta: 'Ver capacitaciones disponibles',
            href: '/capacitaciones',
          }

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
      {isCancelled ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="text-2xl font-semibold">{inactiveCopy.title}</div>
            <p className="text-muted-foreground">{inactiveCopy.body}</p>
            <Button asChild className="bg-brand text-brand-foreground hover:bg-brand-hover">
              <Link href={inactiveCopy.href}>{inactiveCopy.cta}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="flex items-center gap-3 text-success">
              <CheckCircle2 className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-bold">
                  ¡Listo{booking.driverFirstName ? `, ${booking.driverFirstName.split(' ')[0]}` : ''}!
                </h1>
                <p className="text-sm text-muted-foreground">Tu lugar está reservado.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <ModalityBadge modality={booking.modality} />
            </div>

            <div className="space-y-3 border-t pt-5">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Fecha</div>
                  <div className="font-medium capitalize">{formatPYLong(start)}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Horario</div>
                  <div className="font-medium">
                    {booking.startTime} — {booking.endTime} (Asunción)
                  </div>
                </div>
              </div>
              {booking.modality !== 'VIRTUAL' && (booking.location || booking.locationAddress) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Lugar</div>
                    <div className="font-medium">{booking.location || 'Por confirmar'}</div>
                    {booking.locationAddress && (
                      <div className="text-sm text-muted-foreground">{booking.locationAddress}</div>
                    )}
                  </div>
                </div>
              )}
              {booking.meetingLink && (
                <div className="flex items-start gap-3">
                  <Video className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Link</div>
                    <a
                      href={booking.meetingLink}
                      target="_blank"
                      rel="noopener"
                      className="text-brand hover:underline text-sm break-all"
                    >
                      {booking.meetingLink}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" asChild size="sm">
                <a href={gcalLink(booking)} target="_blank" rel="noopener">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Agregar a Google Calendar
                </a>
              </Button>
              <Button variant="outline" asChild size="sm">
                <a href={`/api/public/booking/${token}/ics`}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar .ics
                </a>
              </Button>
            </div>

            {booking.instructions && (
              <div className="border-t pt-5">
                <div className="text-sm font-semibold mb-2">¿Qué necesitás llevar?</div>
                <div className="text-sm text-muted-foreground whitespace-pre-line">
                  {booking.instructions}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground pt-2">
              Recibirás un recordatorio por WhatsApp antes del evento.
            </p>

            <BookingActions
              confirmationToken={token}
              ruleSlug={reschedTarget}
              canCancel={booking.canCancel}
              canReschedule={booking.canReschedule}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
