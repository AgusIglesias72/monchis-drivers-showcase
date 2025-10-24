// app/admin/onboarding/[id]/page.tsx

import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { onboardingService } from '@/lib/services/onboarding.service'
import { OnboardingEventContent } from '@/components/admin/onboarding/onboarding-event-content'

// Aumentar revalidación para mejor performance
export const revalidate = 60

// Loading component
function EventPageLoading() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Cargando evento...</p>
      </div>
    </div>
  )
}

// Optimización: Cargar solo datos necesarios
async function getEvent(eventId: string) {
  try {
    const event = await onboardingService.getEventById(eventId)
    
    if (!event) {
      return null
    }

    // FILTRAR CANCELADOS - Solo incluir asistentes activos
    const activeAttendees = event.attendees.filter(
      attendee => attendee.status !== 'CANCELLED'
    )

    // Serializar fechas para el cliente
    return {
      ...event,
      scheduledDate: event.scheduledDate.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      completedAt: event.completedAt?.toISOString() || null,
      reminderSentAt: event.reminderSentAt?.toISOString() || null,
      // Solo pasar asistentes activos (sin cancelados)
      attendees: activeAttendees.map(attendee => ({
        ...attendee,
        invitedAt: attendee.invitedAt.toISOString(),
        confirmedAt: attendee.confirmedAt?.toISOString() || null,
        checkedInAt: attendee.checkedInAt?.toISOString() || null,
        markedNoShowAt: attendee.markedNoShowAt?.toISOString() || null,
        cancelledAt: attendee.cancelledAt?.toISOString() || null,
        rescheduledAt: attendee.rescheduledAt?.toISOString() || null,
        createdAt: attendee.createdAt.toISOString(),
        updatedAt: attendee.updatedAt.toISOString(),
        // ✅ Serializar equipmentPayments dentro de formDriver
        formDriver: {
          ...attendee.formDriver,
          equipmentPayments: attendee.formDriver.equipmentPayments?.map(payment => ({
            ...payment,
            createdAt: payment.createdAt.toISOString(),
          })) || []
        }
      })),
      // Actualizar contador considerando solo activos
      currentCapacity: activeAttendees.length,
    }
  } catch (error) {
    console.error('Error al obtener evento:', error)
    return null
  }
}

// Optimización: Paginación más pequeña para carga inicial más rápida
async function getEligibleDrivers(eventId: string) {
  try {
    const result = await onboardingService.getEligibleDrivers({
      eventId,
      page: 1,
      limit: 10, // Reducido de 20 a 10 para carga más rápida
    })

    // Serializar fechas (solo lo necesario)
    return {
      drivers: result.drivers.map(driver => ({
        id: driver.id,
        fullName: driver.fullName,
        phoneNumber: driver.phoneNumber,
        email: driver.email,
        cedula: driver.cedula,
        documentsStatus: driver.documentsStatus,
        onboardingStatus: driver.onboardingStatus,
        onboardingScheduledAt: driver.onboardingScheduledAt?.toISOString() || null,
        status: driver.status,
        createdAt: driver.createdAt.toISOString(),
        lastActivityAt: driver.lastActivityAt?.toISOString() || null,
        isAssignedToOtherEvent: driver.isAssignedToOtherEvent,
        canBeSelected: driver.canBeSelected,
        disabledReason: driver.disabledReason,
        assignedEvent: driver.assignedEvent ? {
          id: driver.assignedEvent.id,
          title: driver.assignedEvent.title,
          scheduledDate: driver.assignedEvent.scheduledDate.toISOString(),
        } : null,
      })),
      pagination: result.pagination,
    }
  } catch (error) {
    console.error('Error al obtener drivers elegibles:', error)
    return {
      drivers: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasMore: false,
      }
    }
  }
}

export default async function OnboardingEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // Optimización: Cargar en paralelo para mejor performance
  const [event, eligibleDriversData] = await Promise.all([
    getEvent(id),
    getEligibleDrivers(id),
  ])

  if (!event) {
    notFound()
  }

  return (
    <Suspense fallback={<EventPageLoading />}>
      <OnboardingEventContent 
        event={event} 
        initialEligibleDrivers={eligibleDriversData.drivers}
        initialPagination={eligibleDriversData.pagination}
      />
    </Suspense>
  )
}