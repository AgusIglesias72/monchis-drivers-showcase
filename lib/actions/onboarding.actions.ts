// lib/actions/onboarding.actions.ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { onboardingService } from '@/lib/services/onboarding.service'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import type { 
  OnboardingEventStatus,
  CreateEventRequest,
  UpdateEventRequest
} from '@/types/onboarding'

/**
 * Obtiene todos los eventos de onboarding
 */
export async function getAllOnboardingEvents(filters?: {
  status?: OnboardingEventStatus
  upcoming?: boolean
  past?: boolean
}) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const events = await onboardingService.getAllEvents(filters)
    return { success: true, events }
  } catch (error: any) {
    console.error('Error al obtener eventos:', error)
    return { success: false, error: error.message || 'Error al cargar eventos', events: [] }
  }
}

/**
 * Obtiene un evento por ID
 */
export async function getOnboardingEventById(eventId: string) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const event = await onboardingService.getEventById(eventId)
    
    if (!event) {
      throw new Error('Evento no encontrado')
    }

    return { success: true, event }
  } catch (error: any) {
    console.error('Error al obtener evento:', error)
    return { success: false, error: error.message || 'Error al cargar evento' }
  }
}

/**
 * Crea un nuevo evento de onboarding
 */
export async function createOnboardingEvent(data: CreateEventRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const event = await onboardingService.createEvent(userId, data)

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'ONBOARDING_EVENT_CREATED',
        actionType: 'CREATE',
        entityType: 'OnboardingEvent',
        entityId: event.id,
        description: `Evento creado: ${event.title}`,
        metadata: { eventId: event.id, title: event.title }
      }
    })

    revalidatePath('/admin/onboarding')
    
    return { success: true, event, message: 'Evento creado exitosamente' }
  } catch (error: any) {
    console.error('Error al crear evento:', error)
    return { success: false, error: error.message || 'Error al crear evento' }
  }
}

/**
 * Actualiza un evento de onboarding
 */
export async function updateOnboardingEvent(eventId: string, data: UpdateEventRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const event = await onboardingService.updateEvent(eventId, data)

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'ONBOARDING_EVENT_UPDATED',
        actionType: 'UPDATE',
        entityType: 'OnboardingEvent',
        entityId: event.id,
        description: `Evento actualizado: ${event.title}`,
        metadata: { eventId: event.id, changes: data }
      }
    })

    revalidatePath('/admin/onboarding')
    revalidatePath(`/admin/onboarding/${eventId}`)
    
    return { success: true, event, message: 'Evento actualizado exitosamente' }
  } catch (error: any) {
    console.error('Error al actualizar evento:', error)
    return { success: false, error: error.message || 'Error al actualizar evento' }
  }
}

/**
 * Elimina un evento de onboarding
 */
export async function deleteOnboardingEvent(eventId: string) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    await onboardingService.deleteEvent(eventId)

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'ONBOARDING_EVENT_CANCELLED', // Usamos CANCELLED en lugar de DELETED
        actionType: 'DELETE',
        entityType: 'OnboardingEvent',
        entityId: eventId,
        description: 'Evento de onboarding eliminado',
        metadata: { eventId }
      }
    })

    revalidatePath('/admin/onboarding')
    
    return { success: true, message: 'Evento eliminado exitosamente' }
  } catch (error: any) {
    console.error('Error al eliminar evento:', error)
    return { success: false, error: error.message || 'Error al eliminar evento' }
  }
}

/**
 * Obtiene eventos disponibles para onboarding
 */
export async function getAvailableOnboardingEvents() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const events = await onboardingService.getAvailableEvents()
    return { success: true, events }
  } catch (error: any) {
    console.error('Error al obtener eventos:', error)
    return { success: false, error: error.message || 'Error al cargar eventos' }
  }
}

/**
 * Asigna un driver a un evento de onboarding
 */
export async function assignDriverToOnboardingEvent({
  eventId,
  driverId,
  notes
}: {
  eventId: string
  driverId: string
  notes?: string
}) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    if (!eventId || !driverId) {
      throw new Error('eventId y driverId son requeridos')
    }

    const attendee = await onboardingService.assignDriverToEvent({
      eventId,
      driverId,
      assignedBy: userId,
      notes
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'ONBOARDING_ATTENDEE_INVITED', // Cambio a INVITED
        actionType: 'CREATE',
        entityType: 'OnboardingAttendee',
        entityId: attendee.id,
        description: `Driver asignado a evento de onboarding`,
        metadata: { eventId, driverId, attendeeId: attendee.id }
      }
    })

    // Revalidar las páginas relevantes
    revalidatePath('/admin/postulaciones')
    revalidatePath(`/admin/postulaciones/${driverId}`)
    revalidatePath('/admin/onboarding')
    revalidatePath(`/admin/onboarding/${eventId}`)

    return { 
      success: true, 
      attendee,
      message: 'Driver asignado exitosamente al evento'
    }
  } catch (error: any) {
    console.error('Error al asignar driver:', error)
    return { 
      success: false, 
      error: error.message || 'Error al asignar driver al evento' 
    }
  }
}

/**
 * Obtiene el estado de onboarding de un driver
 */
export async function getDriverOnboardingStatus(driverId: string) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const status = await onboardingService.getDriverOnboardingStatus(driverId)
    return { success: true, status }
  } catch (error: any) {
    console.error('Error al obtener estado:', error)
    return { success: false, error: error.message || 'Error al obtener estado' }
  }
}

/**
 * Obtiene asistentes de un evento
 */
export async function getEventAttendees(eventId: string) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const attendees = await onboardingService.getEventAttendees(eventId)
    return { success: true, attendees }
  } catch (error: any) {
    console.error('Error al obtener asistentes:', error)
    return { success: false, error: error.message || 'Error al cargar asistentes', attendees: [] }
  }
}

/**
 * Check-in de un asistente
 */
export async function checkInAttendee(attendeeId: string, notes?: string) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const attendee = await onboardingService.checkInAttendee(attendeeId, notes)

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'ONBOARDING_ATTENDEE_CHECKED_IN',
        actionType: 'UPDATE',
        entityType: 'OnboardingAttendee',
        entityId: attendeeId,
        description: `Check-in realizado`,
        metadata: { attendeeId, notes }
      }
    })

    revalidatePath('/admin/onboarding')
    revalidatePath(`/admin/postulaciones/${attendee.formDriver.id}`)

    return { success: true, attendee, message: 'Check-in realizado exitosamente' }
  } catch (error: any) {
    console.error('Error en check-in:', error)
    return { success: false, error: error.message || 'Error en check-in' }
  }
}

/**
 * Marca un asistente como no show
 */
export async function markAttendeeNoShow(attendeeId: string) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const attendee = await onboardingService.markNoShow(attendeeId)

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'ONBOARDING_ATTENDEE_NO_SHOW',
        actionType: 'UPDATE',
        entityType: 'OnboardingAttendee',
        entityId: attendeeId,
        description: `Asistente marcado como no show`,
        metadata: { attendeeId }
      }
    })

    revalidatePath('/admin/onboarding')
    revalidatePath(`/admin/postulaciones/${attendee.formDriver.id}`)

    return { success: true, attendee, message: 'Marcado como no show' }
  } catch (error: any) {
    console.error('Error al marcar no show:', error)
    return { success: false, error: error.message || 'Error al marcar no show' }
  }
}

/**
 * Cancela la asistencia de un driver
 */
export async function cancelAttendee(attendeeId: string, reason?: string) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    await onboardingService.cancelAttendee(attendeeId, reason)

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'ONBOARDING_ATTENDEE_CANCELLED',
        actionType: 'UPDATE',
        entityType: 'OnboardingAttendee',
        entityId: attendeeId,
        description: `Asistencia cancelada`,
        metadata: { attendeeId, reason }
      }
    })

    revalidatePath('/admin/onboarding')

    return { success: true, message: 'Asistencia cancelada exitosamente' }
  } catch (error: any) {
    console.error('Error al cancelar asistencia:', error)
    return { success: false, error: error.message || 'Error al cancelar asistencia' }
  }
}

/**
 * Confirma la asistencia de un driver
 */
export async function confirmAttendee(attendeeId: string) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const attendee = await onboardingService.confirmAttendee(attendeeId)

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'ONBOARDING_ATTENDEE_CONFIRMED',
        actionType: 'UPDATE',
        entityType: 'OnboardingAttendee',
        entityId: attendeeId,
        description: `Asistencia confirmada`,
        metadata: { attendeeId }
      }
    })

    revalidatePath('/admin/onboarding')
    revalidatePath(`/admin/postulaciones/${attendee.formDriver.id}`)

    return { success: true, attendee, message: 'Asistencia confirmada' }
  } catch (error: any) {
    console.error('Error al confirmar asistencia:', error)
    return { success: false, error: error.message || 'Error al confirmar asistencia' }
  }
}

/**
 * Obtiene drivers elegibles para agregar a un evento
 */
export async function getEligibleDrivers(params: {
  eventId?: string
  search?: string
  page?: number
  limit?: number
}) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const result = await onboardingService.getEligibleDrivers(params)
    return { success: true, ...result }
  } catch (error: any) {
    console.error('Error al obtener drivers elegibles:', error)
    return { 
      success: false, 
      error: error.message || 'Error al cargar drivers',
      drivers: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasMore: false
      }
    }
  }
}

/**
 * Asigna múltiples drivers a un evento
 */
export async function assignDriversToEvent({
  eventId,
  driverIds,
  notes
}: {
  eventId: string
  driverIds: string[]
  notes?: string
}) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    if (!eventId || !driverIds || driverIds.length === 0) {
      throw new Error('eventId y driverIds son requeridos')
    }

    const attendees = await onboardingService.assignDriversToEvent({
      eventId,
      driverIds,
      assignedBy: userId,
      notes
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'ONBOARDING_ATTENDEE_INVITED',
        actionType: 'CREATE',
        entityType: 'OnboardingAttendee',
        entityId: eventId,
        description: `${driverIds.length} driver(s) asignados al evento`,
        metadata: { eventId, driverIds, count: driverIds.length }
      }
    })

    // Revalidar las páginas relevantes
    revalidatePath('/admin/onboarding')
    revalidatePath(`/admin/onboarding/${eventId}`)
    
    // Revalidar cada postulación de driver
    driverIds.forEach(driverId => {
      revalidatePath(`/admin/postulaciones/${driverId}`)
    })

    return { 
      success: true, 
      attendees,
      message: `${driverIds.length} driver(s) agregados exitosamente`
    }
  } catch (error: any) {
    console.error('Error al asignar drivers:', error)
    return { 
      success: false, 
      error: error.message || 'Error al asignar drivers' 
    }
  }
}