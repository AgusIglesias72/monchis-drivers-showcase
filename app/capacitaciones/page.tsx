// app/capacitaciones/page.tsx

import { headers } from 'next/headers'
import { LandingBanner } from '@/components/capacitaciones/landing-banner'
import { LandingHero } from '@/components/capacitaciones/landing-hero'
import { LandingFooter } from '@/components/capacitaciones/landing-footer'
import { LandingCalendar } from '@/components/capacitaciones/landing-calendar'
import { HowItWorks } from '@/components/capacitaciones/how-it-works'
import { RulesGrid } from '@/components/capacitaciones/rules-grid'
import { EmptyState } from '@/components/capacitaciones/empty-state'
import { AutoIdentify } from '@/components/capacitaciones/auto-identify'
import { AnonymousIdentifyCTA } from '@/components/capacitaciones/anonymous-identify-cta'
import { PreviewModeToggle } from '@/components/preview/preview-mode-toggle'
import { resolveIdentityFromCookie } from '@/lib/services/onboarding-identity'
import { getPreviewIdentity, resolvePreviewState } from '@/lib/services/preview-identity'
import type { RuleSummary, SlotResponse } from '@/lib/types/onboarding-rules.types'

export const dynamic = 'force-dynamic'

interface RulePayload extends RuleSummary {
  nextSlots: SlotResponse[]
}

async function fetchPublic<T>(path: string, init?: RequestInit): Promise<T | null> {
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host')
  const proto = h.get('x-forwarded-proto') || 'http'
  const base = host ? `${proto}://${host}` : ''
  try {
    const res = await fetch(`${base}${path}`, init)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function getRules(): Promise<RulePayload[]> {
  // no-store: el calendario tiene que reflejar reglas/cupos en tiempo real.
  // Con cache (revalidate) una capacitación recién publicada no aparecía hasta
  // que vencía el TTL, y los cupos podían quedar desactualizados.
  const json = await fetchPublic<{ rules: RulePayload[] }>('/api/public/capacitaciones', {
    cache: 'no-store',
  })
  return json?.rules || []
}

async function getInitialCombinedSlots(): Promise<SlotResponse[]> {
  const today = new Date()
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const from = ymd(today)
  const endNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0)
  const to = ymd(endNextMonth)

  const json = await fetchPublic<{ slots: SlotResponse[] }>(
    `/api/public/capacitaciones/slots?from=${from}&to=${to}`,
    { cache: 'no-store' },
  )
  return json?.slots || []
}

function hasUsableSlots(rules: RulePayload[]): boolean {
  for (const r of rules) {
    if (r.nextSlots.some((s) => !s.isFull && !s.isPastNotice && !s.isPast)) {
      return true
    }
  }
  return false
}

export default async function CapacitacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; preview?: string }>
}) {
  const { session: sessionFromUrl, preview: previewParam } = await searchParams

  // Preview mode: solo aplica para usuarios autenticados con Clerk (admin/dev).
  // Si pasa el gate, devuelve identidad mockeada y bypaseamos cookie + URL session.
  const previewState = await resolvePreviewState(previewParam)

  // SSR identity: leemos cookie del portal y resolvemos en el server. Esto
  // elimina el flicker del AutoIdentify cliente porque ya llega identificado.
  // Si vino ?session= en URL le damos prioridad (link compartido) y no usamos
  // la cookie — son dos identidades potencialmente distintas.
  const identity = previewState
    ? getPreviewIdentity(previewState)
    : sessionFromUrl
      ? { found: false, shareToken: null, portalToken: null, driver: null }
      : await resolveIdentityFromCookie()
  const sessionToken = previewState
    ? identity.shareToken || undefined
    : sessionFromUrl || identity.shareToken || undefined

  const [rules, initialSlots] = await Promise.all([
    getRules(),
    getInitialCombinedSlots(),
  ])

  // Driver identificado y eligible → ocultamos contenido "para no-postulantes"
  const showOnboardingContent = !identity.found || !identity.driver?.isEligible
  const noUsableSlots = rules.length > 0 && !hasUsableSlots(rules)
  const showBooking = rules.length > 0 && !noUsableSlots
  const isAnonymous = !identity.found && !sessionFromUrl

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 lg:py-10">
      {/* Fallback cliente: si el server no encontró cookie, intentamos
          identificar via localStorage (legacy). En preview mode lo skipeamos
          para que el admin vea el estado mockeado puro. */}
      {!previewState && isAnonymous && <AutoIdentify />}

      {/* CTA explícito para postulantes que llegan en frío via link compartido.
          En preview mode forzamos render para no depender del localStorage. */}
      {(isAnonymous || previewState === 'anonymous') && (
        <AnonymousIdentifyCTA forceShow={previewState === 'anonymous'} />
      )}

      {/* Banner SSR: si el server resolvió la identidad la mostramos al toque */}
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
      {/* Si no hay SSR identity pero sí session en URL, validamos en cliente */}
      {!identity.found && sessionFromUrl && <LandingBanner sessionToken={sessionFromUrl} />}

      <LandingHero availableCount={rules.length} compact={showBooking} />

      {!showBooking ? (
        <EmptyState noSlots={noUsableSlots} />
      ) : (
        <>
          {/* Protagonista: el calendario de fechas para agendar directo */}
          <LandingCalendar initialSlots={initialSlots} sessionToken={sessionToken} />

          {/* Info de la(s) capacitación(es), secundario debajo del calendario */}
          <section className="mt-12 lg:mt-14">
            <div className="text-center mb-6">
              <div className="text-xs uppercase tracking-wider font-semibold text-brand mb-2">
                {rules.length === 1 ? 'Sobre la capacitación' : 'Nuestras capacitaciones'}
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
                {rules.length === 1 ? 'Qué vas a aprender' : 'Elegí tu capacitación'}
              </h2>
            </div>
            <RulesGrid rules={rules} sessionToken={sessionToken} />
          </section>
        </>
      )}

      {/* "Cómo funciona" + footer "¿no postulaste?" → solo para anónimos o
          drivers que aún no completaron postulación. Drivers ya elegibles no
          necesitan ver esto. */}
      {showOnboardingContent && (
        <>
          <HowItWorks />
          <LandingFooter />
        </>
      )}

      <PreviewModeToggle />
    </div>
  )
}
