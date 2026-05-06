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

export default async function CapacitacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session } = await searchParams
  const [rules, initialSlots] = await Promise.all([getRules(), getInitialCombinedSlots()])

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 lg:py-10">
      {/* Identificación silenciosa: si el driver ya pasó por /postulacion/[token],
          intercambiamos su accessToken por un shareToken sin pedirle nada. */}
      {!session && <AutoIdentify />}
      {session && <LandingBanner sessionToken={session} />}

      <LandingHero availableCount={rules.length} />

      {rules.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <RulesGrid rules={rules} sessionToken={session} />
          <LandingCalendar initialSlots={initialSlots} sessionToken={session} />
        </>
      )}

      <HowItWorks />

      <LandingFooter />
    </div>
  )
}
