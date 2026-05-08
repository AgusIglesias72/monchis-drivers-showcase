// app/admin/onboarding/page.tsx
//
// Página unificada: capacitaciones (reglas) + eventos generados, en tabs.
// La página vieja /admin/onboarding/reglas redirige acá con ?tab=capacitaciones.

import { onboardingService } from '@/lib/services/onboarding.service'
import { prisma } from '@/lib/prisma'
import { UnifiedOnboardingTabs } from '@/components/admin/onboarding/unified-onboarding-tabs'
import type { OnboardingEventWithRelations } from '@/types/onboarding'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    status?: string
    tab?: string
  }>
}

export default async function OnboardingPage({ searchParams }: PageProps) {
  const params = await searchParams

  const [events, rules] = await Promise.all([
    onboardingService.getAllEvents({ status: params.status as any }),
    prisma.onboardingScheduleRule.findMany({
      include: {
        _count: { select: { events: true, exceptions: true } },
        organizerUser: { select: { fullName: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <UnifiedOnboardingTabs
      rules={rules}
      events={events as OnboardingEventWithRelations[]}
      currentStatus={params.status}
    />
  )
}
