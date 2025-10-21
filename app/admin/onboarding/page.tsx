// app/admin/onboarding/page.tsx

import { onboardingService } from '@/lib/services/onboarding.service'
import { OnboardingPageContent } from '@/components/admin/onboarding/onboarding-page-content'
import { OnboardingEventWithRelations } from '@/types/onboarding'

export const revalidate = 60

interface PageProps {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function OnBoardingPage({ searchParams }: PageProps) {
  const params = await searchParams
  
  // Cargar eventos desde el servidor
  const events = await onboardingService.getAllEvents({
    status: params.status as any
  })

  return (
    <OnboardingPageContent
      initialEvents={events as OnboardingEventWithRelations[]}
      currentStatus={params.status}
    />
  )
}