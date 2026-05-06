'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Zap,
  ArrowRight,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { ModalityBadge } from './modality-badge'
import { formatPYShort, dayOfWeekInTZ } from '@/lib/utils/onboarding-time'
import { useBookingFlow } from './use-booking-flow'
import { BookingFlowDialogs } from './booking-flow-dialogs'
import {
  DAY_NAMES_ES_LONG,
  type RuleSummary,
  type SlotResponse,
} from '@/lib/types/onboarding-rules.types'

interface RuleWithSlots extends RuleSummary {
  nextSlots: SlotResponse[]
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

export function RuleCard({ rule, sessionToken }: { rule: RuleWithSlots; sessionToken?: string }) {
  const flow = useBookingFlow(sessionToken)
  const next = rule.nextSlots.find((s) => !s.isFull && !s.isPastNotice && !s.isPast)
  const detailHref = flow.sessionToken
    ? `/capacitaciones/${rule.slug}?session=${flow.sessionToken}`
    : `/capacitaciones/${rule.slug}`

  // Estado de cupos
  let cupoStatus: { label: string; tone: 'low' | 'medium' | 'high' | 'full' } | null = null
  if (next) {
    const remaining = next.availableSlots
    const total = next.maxCapacity
    if (remaining === 0) cupoStatus = { label: 'Sin cupos', tone: 'full' }
    else if (remaining <= 2) cupoStatus = { label: `Quedan ${remaining}`, tone: 'low' }
    else if (remaining / total < 0.4)
      cupoStatus = { label: `${remaining} cupos`, tone: 'medium' }
    else cupoStatus = { label: `${remaining} cupos`, tone: 'high' }
  }

  const plainDescription = rule.description
    ? rule.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : null

  // Datos de ubicación / link según modalidad
  const placeName = rule.savedLocation?.name || rule.location || null
  const address = rule.savedLocation?.address || rule.locationAddress || null
  const gmapsUrl = rule.savedLocation?.googleMapsUrl || rule.googleMapsUrl || null

  const isInPerson = rule.modality === 'IN_PERSON'
  const isVirtual = rule.modality === 'VIRTUAL'
  const isHybrid = rule.modality === 'HYBRID'

  return (
    <Card className="group overflow-hidden flex flex-col h-full transition-all hover:shadow-md hover:-translate-y-0.5">
      {/* Banner top con tinte por modalidad */}
      <div
        className={`h-1.5 ${
          isVirtual
            ? 'bg-gradient-to-r from-info via-info/80 to-info'
            : isHybrid
              ? 'bg-gradient-to-r from-violet-500 via-violet-400 to-violet-500'
              : 'bg-gradient-to-r from-brand via-brand-hover to-brand'
        }`}
      />

      <CardContent className="flex-1 flex flex-col gap-4 p-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <ModalityBadge modality={rule.modality} />
            {rule.frequency === 'ONE_OFF' && (
              <Badge variant="secondary" className="bg-muted text-foreground border-0 text-xs">
                Una sola vez
              </Badge>
            )}
          </div>
          <h3 className="text-lg lg:text-xl font-semibold leading-tight tracking-tight">
            {rule.title}
          </h3>
          {plainDescription && (
            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{plainDescription}</p>
          )}
        </div>

        {/* Bloque de ubicación / link — diferenciado por modalidad */}
        {isInPerson && (placeName || address) && (
          <div className="rounded-lg border bg-muted/30 p-3 flex items-start gap-2.5">
            <div className="shrink-0 h-8 w-8 rounded-md bg-brand-soft text-brand flex items-center justify-center mt-0.5">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              {placeName && (
                <div className="text-sm font-semibold leading-tight truncate">{placeName}</div>
              )}
              {address && (
                <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                  {address}
                </div>
              )}
              {gmapsUrl && (
                <a
                  href={gmapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline mt-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  Abrir en Maps
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {isVirtual && (
          <div className="rounded-lg border bg-info-soft/40 p-3 flex items-start gap-2.5">
            <div className="shrink-0 h-8 w-8 rounded-md bg-info/15 text-info flex items-center justify-center mt-0.5">
              <Video className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-tight">
                {rule.meetingPlatform || 'Online'}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                Te enviamos el link al confirmar tu reserva.
              </div>
            </div>
          </div>
        )}

        {isHybrid && (
          <div className="rounded-lg border bg-muted/30 p-3 flex items-start gap-2.5">
            <div className="shrink-0 h-8 w-8 rounded-md bg-violet-100 text-violet-700 flex items-center justify-center mt-0.5">
              <Zap className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-tight">Presencial u online</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                Podés asistir al lugar o conectarte por {rule.meetingPlatform || 'la plataforma'}.
              </div>
            </div>
          </div>
        )}

        {/* Meta info compacta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(rule.durationMinutes)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Hasta {rule.maxCapacity}
          </span>
        </div>

        {/* Próxima fecha */}
        {next ? (
          <div className="mt-auto rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Próxima fecha
                </div>
                <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                  <span className="font-semibold capitalize">
                    {DAY_NAMES_ES_LONG[dayOfWeekInTZ(new Date(next.scheduledDateUTC))]}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatPYShort(new Date(next.scheduledDateUTC))}
                  </span>
                </div>
                <div className="text-sm font-semibold tabular-nums mt-0.5">
                  {next.startTime} hs
                </div>
              </div>
              {cupoStatus && (
                <Badge
                  variant="secondary"
                  className={`shrink-0 border-0 ${
                    cupoStatus.tone === 'low'
                      ? 'bg-warning-soft text-warning'
                      : cupoStatus.tone === 'medium'
                        ? 'bg-info-soft text-info'
                        : cupoStatus.tone === 'full'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-success-soft text-success'
                  }`}
                >
                  {cupoStatus.label}
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-auto rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground italic">
            Sin fechas próximas disponibles
          </div>
        )}

        {/* CTA: si hay próxima fecha disponible → reservar directo;
            sino → solo permite navegar al detalle. */}
        {next ? (
          <div className="space-y-2">
            <Button
              type="button"
              onClick={() => flow.startBooking(next, rule.title)}
              disabled={flow.booking}
              className="w-full bg-brand text-brand-foreground hover:bg-brand-hover group/btn"
            >
              {flow.booking ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              Reservar esta fecha
              {!flow.booking && (
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
              )}
            </Button>
            <Link
              href={detailHref}
              className="block text-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver todas las fechas disponibles →
            </Link>
          </div>
        ) : (
          <Button
            asChild
            variant="outline"
            className="w-full"
          >
            <Link href={detailHref}>Ver detalle</Link>
          </Button>
        )}
      </CardContent>
      <BookingFlowDialogs flow={flow} />
    </Card>
  )
}
