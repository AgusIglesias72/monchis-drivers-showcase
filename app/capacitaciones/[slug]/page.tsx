// app/capacitaciones/[slug]/page.tsx

import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { Calendar, Clock, MapPin, Users, Video, Zap } from 'lucide-react'
import { ModalityBadge } from '@/components/capacitaciones/modality-badge'
import { BookingCalendar } from '@/components/capacitaciones/booking-calendar'
import { AutoIdentify } from '@/components/capacitaciones/auto-identify'
import { LandingBanner } from '@/components/capacitaciones/landing-banner'
import { resolveIdentityFromCookie } from '@/lib/services/onboarding-identity'
import LocationMap from '@/components/capacitaciones/location-map-lazy'
import { Badge } from '@/components/ui/badge'
import { RichTextDisplay } from '@/components/ui/rich-text-editor'
import type { Metadata } from 'next'
import type { RuleSummary, SlotResponse } from '@/lib/types/onboarding-rules.types'

export const dynamic = 'force-dynamic'

async function getRule(slug: string): Promise<RuleSummary | null> {
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host')
  const proto = h.get('x-forwarded-proto') || 'http'
  const base = host ? `${proto}://${host}` : ''
  const res = await fetch(`${base}/api/public/capacitaciones/${slug}`, {
    next: { revalidate: 60, tags: [`capacitaciones-rule-${slug}`] },
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.rule || null
}

/**
 * Pre-carga los slots desde hoy hasta el final del próximo mes (cubre el mes
 * actual + el siguiente). El cliente arranca con esta data ya hidratada y solo
 * hace fetch si el usuario navega más allá. Cache de 30s vía Next data cache.
 */
async function getInitialSlots(slug: string): Promise<SlotResponse[]> {
  try {
    const h = await headers()
    const host = h.get('x-forwarded-host') || h.get('host')
    const proto = h.get('x-forwarded-proto') || 'http'
    const base = host ? `${proto}://${host}` : ''

    const today = new Date()
    const ymd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const from = ymd(today)
    // Final del mes siguiente
    const endNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0)
    const to = ymd(endNextMonth)

    const res = await fetch(
      `${base}/api/public/capacitaciones/${slug}/slots?from=${from}&to=${to}`,
      { next: { revalidate: 30, tags: [`capacitaciones-slots-${slug}`] } },
    )
    if (!res.ok) return []
    const json = await res.json()
    return json.slots || []
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const rule = await getRule(slug)
  if (!rule) return { title: 'Capacitación — Monchis Drivers' }
  // metadata.description debe ser texto plano (sin HTML del rich text editor)
  const plainDescription = rule.description
    ? rule.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : ''
  return {
    title: `${rule.title} — Monchis Drivers`,
    description: plainDescription || 'Agendá tu capacitación con Monchis Drivers.',
  }
}

function renderInstructions(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const isList = lines.every((l) => /^[-•]/.test(l)) && lines.length > 1
  if (isList) {
    return (
      <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
        {lines.map((l, i) => (
          <li key={i}>{l.replace(/^[-•]\s*/, '')}</li>
        ))}
      </ul>
    )
  }
  return (
    <div className="text-sm text-muted-foreground space-y-2">
      {lines.map((l, i) => (
        <p key={i}>{l.replace(/^[-•]\s*/, '')}</p>
      ))}
    </div>
  )
}

export default async function RuleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ session?: string; reschedule?: string }>
}) {
  const { slug } = await params
  const { session: sessionFromUrl, reschedule: rescheduleToken } = await searchParams
  const rule = await getRule(slug)

  if (!rule) return notFound()

  // SSR identity: si el browser tiene cookie del portal, resolvemos acá y le
  // pasamos el shareToken al BookingCalendar sin pasar por AutoIdentify cliente.
  // ?session= en URL gana sobre cookie (link compartido).
  const identity = sessionFromUrl
    ? { found: false, shareToken: null, portalToken: null, driver: null }
    : await resolveIdentityFromCookie()
  const session = sessionFromUrl || identity.shareToken || undefined

  // Pre-cargamos los slots de los próximos 2 meses para evitar el round-trip
  // inicial al renderizar el calendario en cliente.
  const initialSlots = rule.isActive && rule.isPublic ? await getInitialSlots(slug) : []

  // Resolvemos la dirección desde la ubicación guardada o los campos legacy.
  const resolvedAddress = rule.savedLocation?.address || rule.locationAddress || ''
  const resolvedGmapsUrl = rule.savedLocation?.googleMapsUrl || rule.googleMapsUrl || null
  const resolvedNotes = rule.savedLocation?.notes || null
  const resolvedPlaceName = rule.savedLocation?.name || rule.location
  const showMap = rule.modality !== 'VIRTUAL' && Boolean(resolvedAddress)

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 lg:py-10 pb-24 md:pb-10">
      {/* Identity SSR */}
      {identity.found && identity.driver && (
        <LandingBanner
          ssrIdentity={{
            firstName: identity.driver.firstName,
            isEligible: identity.driver.isEligible,
            notEligibleReason: identity.driver.notEligibleReason,
            postulationStatus: identity.driver.postulationStatus,
            portalToken: identity.portalToken,
          }}
        />
      )}
      {!identity.found && !sessionFromUrl && <AutoIdentify />}
      {/* Hero gradient (sin imagen) */}
      <div className="rounded-xl overflow-hidden mb-6 border">
        <div className="h-24 bg-gradient-to-br from-brand to-brand-hover" />
        <div className="p-6 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{rule.title}</h1>
            <ModalityBadge modality={rule.modality} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-muted">
              <Clock className="h-3 w-3 mr-1" />
              {rule.durationMinutes} min
            </Badge>
            <Badge variant="secondary" className="bg-muted">
              <Users className="h-3 w-3 mr-1" />
              Hasta {rule.maxCapacity}
            </Badge>
          </div>
        </div>
      </div>

      {rule.description && (
        <section className="mb-8">
          <RichTextDisplay
            html={rule.description}
            className="prose-base text-foreground/90"
          />
        </section>
      )}

      {rule.instructions && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">📋 ¿Qué necesitás llevar?</h2>
          {renderInstructions(rule.instructions)}
        </section>
      )}

      {showMap && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ubicación
            {resolvedPlaceName && (
              <span className="text-sm font-normal text-muted-foreground">— {resolvedPlaceName}</span>
            )}
          </h2>
          <LocationMap
            address={resolvedAddress}
            googleMapsUrl={resolvedGmapsUrl}
            notes={resolvedNotes}
          />
        </section>
      )}

      {!showMap && rule.modality === 'VIRTUAL' && (
        <section className="mb-8">
          <div className="border rounded-lg p-4 flex items-center gap-3 bg-info-soft">
            <Video className="h-5 w-5 text-info" />
            <div className="text-sm">
              <div className="font-medium">Capacitación virtual</div>
              <div className="text-muted-foreground">
                {rule.meetingPlatform || 'Online'} — el link se envía al confirmar la reserva.
              </div>
            </div>
          </div>
        </section>
      )}

      {rule.modality === 'HYBRID' && (
        <section className="mb-8">
          <div className="border rounded-lg p-4 flex items-center gap-3 bg-violet-50">
            <Zap className="h-5 w-5 text-violet-700" />
            <div className="text-sm">
              <div className="font-medium">Capacitación híbrida</div>
              <div className="text-muted-foreground">
                Podés asistir presencial o conectarte por {rule.meetingPlatform || 'Online'}.
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Elegí tu fecha
        </h2>
        <BookingCalendar
          slug={slug}
          initialSession={session}
          initialSlots={initialSlots}
          ruleTitle={rule.title}
          rescheduleToken={rescheduleToken}
        />
      </section>
    </div>
  )
}
