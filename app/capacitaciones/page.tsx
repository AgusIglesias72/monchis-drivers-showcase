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
import { resolveIdentityFromCookie } from '@/lib/services/onboarding-identity'
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
  const json = await fetchPublic<{ rules: RulePayload[] }>('/api/public/capacitaciones', {
    next: { revalidate: 60, tags: ['capacitaciones-rules'] },
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
    { next: { revalidate: 30, tags: ['capacitaciones-combined-slots'] } },
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
  searchParams: Promise<{ session?: string }>
}) {
  const { session: sessionFromUrl } = await searchParams

  // SSR identity: leemos cookie del portal y resolvemos en el server. Esto
  // elimina el flicker del AutoIdentify cliente porque ya llega identificado.
  // Si vino ?session= en URL le damos prioridad (link compartido) y no usamos
  // la cookie — son dos identidades potencialmente distintas.
  const identity = sessionFromUrl
    ? { found: false, shareToken: null, portalToken: null, driver: null }
    : await resolveIdentityFromCookie()
  const sessionToken = sessionFromUrl || identity.shareToken || undefined

  const [rules, initialSlots] = await Promise.all([
    getRules(),
    getInitialCombinedSlots(),
  ])

  // Driver identificado y eligible → ocultamos contenido "para no-postulantes"
  const showOnboardingContent = !identity.found || !identity.driver?.isEligible
  const noUsableSlots = rules.length > 0 && !hasUsableSlots(rules)

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 lg:py-10">
      {/* Fallback cliente: si el server no encontró cookie, intentamos
          identificar via localStorage (legacy). */}
      {!identity.found && !sessionFromUrl && <AutoIdentify />}

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

      <LandingHero availableCount={rules.length} />

      {rules.length === 0 || noUsableSlots ? (
        <EmptyState noSlots={noUsableSlots} />
      ) : (
        <>
          <RulesGrid rules={rules} sessionToken={sessionToken} />
          <LandingCalendar initialSlots={initialSlots} sessionToken={sessionToken} />
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
    </div>
  )
}
