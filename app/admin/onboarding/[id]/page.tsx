// app/admin/onboarding/[id]/page.tsx

import { notFound } from 'next/navigation'
import { onboardingService } from '@/lib/services/onboarding.service'
import { OnboardingEventContent } from '@/components/admin/onboarding/onboarding-event-content'

export const revalidate = 30

async function getEvent(eventId: string) {
  try {
    const event = await onboardingService.getEventById(eventId)
    
    if (!event) {
      return null
    }

    // Serializar fechas para el cliente
    return {
      ...event,
      scheduledDate: event.scheduledDate.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      completedAt: event.completedAt?.toISOString() || null,
      reminderSentAt: event.reminderSentAt?.toISOString() || null,
      attendees: event.attendees.map(attendee => ({
        ...attendee,
        invitedAt: attendee.invitedAt.toISOString(),
        confirmedAt: attendee.confirmedAt?.toISOString() || null,
        checkedInAt: attendee.checkedInAt?.toISOString() || null,
        markedNoShowAt: attendee.markedNoShowAt?.toISOString() || null,
        cancelledAt: attendee.cancelledAt?.toISOString() || null,
        rescheduledAt: attendee.rescheduledAt?.toISOString() || null,
        createdAt: attendee.createdAt.toISOString(),
        updatedAt: attendee.updatedAt.toISOString(),
      }))
    }
  } catch (error) {
    console.error('Error al obtener evento:', error)
    return null
  }
}

export default async function OnboardingEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getEvent(id)

  if (!event) {
    notFound()
  }

  return <OnboardingEventContent event={event} />
}