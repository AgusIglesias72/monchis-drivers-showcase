// lib/actions/onboarding.actions.ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { after } from 'next/server'
import { onboardingService } from '@/lib/services/onboarding.service'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { sendTemplateByKey } from '@/lib/services/whatsapp-messenger.service'
import { recordMessageSent } from '@/lib/services/messaging-frequency.service'
import { WhatsAppMessageSource, WhatsAppMessageType } from '@prisma/client'
import type { 
  OnboardingEventStatus,
  OnboardingAttendeeStatus,
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
        description: `Evento de onboarding creado: ${event.title || event.scheduledDate}`,
        metadata: JSON.stringify(data)
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
 * Actualiza un evento existente
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
        entityId: eventId,
        description: `Evento actualizado`,
        metadata: data
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
 * Elimina un evento
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
        action: 'ONBOARDING_EVENT_CANCELLED',
        actionType: 'DELETE',
        entityType: 'OnboardingEvent',
        entityId: eventId,
        description: `Evento eliminado`
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
 * Obtiene eventos disponibles
 */
export async function getAvailableEvents() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const events = await onboardingService.getAvailableEvents()
    return { success: true, events }
  } catch (error: any) {
    console.error('Error al obtener eventos disponibles:', error)
    return { success: false, error: error.message || 'Error al cargar eventos disponibles', events: [] }
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
 * Asigna un driver individual a un evento
 */
export async function assignDriver({
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

    const attendee = await onboardingService.assignDriver({
      eventId,
      driverId,
      invitedBy: userId,
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
        entityId: attendee.id,
        description: `Driver asignado a evento`,
        metadata: { eventId, driverId, notes }
      }
    })

    revalidatePath('/admin/onboarding')
    revalidatePath(`/admin/onboarding/${eventId}`)
    revalidatePath(`/admin/postulaciones/${driverId}`)

    return { success: true, attendee, message: 'Driver asignado exitosamente' }
  } catch (error: any) {
    console.error('Error al asignar driver:', error)
    return { success: false, error: error.message || 'Error al asignar driver' }
  }
}

/**
 * Asigna un driver a un evento de onboarding (mismo que assignDriver pero con nombre diferente)
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

    const attendee = await onboardingService.assignDriver({
      eventId,
      driverId,
      invitedBy: userId,
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
        entityId: attendee.id,
        description: `Driver asignado a evento de onboarding`,
        metadata: { eventId, driverId, notes }
      }
    })

    revalidatePath('/admin/onboarding')
    revalidatePath(`/admin/onboarding/${eventId}`)
    revalidatePath(`/admin/postulaciones/${driverId}`)

    return { success: true, attendee, message: 'Driver asignado exitosamente' }
  } catch (error: any) {
    console.error('Error al asignar driver:', error)
    return { success: false, error: error.message || 'Error al asignar driver' }
  }
}

/**
 * Asigna múltiples drivers a un evento
 * ✅ CORREGIDO: Ahora usa assignDriversToEvent y pasa invitedBy
 */
export async function assignDriversToEvent({
  eventId,
  formDriverIds,
  attendeeNotes
}: {
  eventId: string
  formDriverIds: string[]
  attendeeNotes?: string
}) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    // ✅ Pasar userId como invitedBy (requerido por Prisma)
    const attendees = await onboardingService.assignDriversToEvent({
      eventId,
      formDriverIds,
      invitedBy: userId,
      attendeeNotes
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'OTHER',
        actionType: 'CREATE',
        entityType: 'OnboardingAttendee',
        entityId: eventId,
        description: `${formDriverIds.length} drivers asignados a evento`,
        metadata: { 
          eventId, 
          formDriverIds, 
          attendeeNotes,
          actionDetail: 'BULK_DRIVERS_ASSIGNED'
        }
      }
    })

    revalidatePath('/admin/onboarding')
    revalidatePath(`/admin/onboarding/${eventId}`)

    return { 
      success: true, 
      attendees, 
      message: `${formDriverIds.length} driver(s) asignado(s) exitosamente` 
    }
  } catch (error: any) {
    console.error('Error al asignar drivers:', error)
    return { success: false, error: error.message || 'Error al asignar drivers' }
  }
}

/**
 * Remueve un driver de un evento (elimina el registro completamente)
 */
export async function removeDriverFromEvent(eventId: string, driverId: string) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    await onboardingService.removeDriver({ eventId, driverId })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'OTHER',
        actionType: 'DELETE',
        entityType: 'OnboardingAttendee',
        entityId: eventId,
        description: `Driver removido del evento`,
        metadata: { eventId, driverId, actionDetail: 'DRIVER_REMOVED_FROM_EVENT' }
      }
    })

    revalidatePath(`/admin/postulaciones/${driverId}`)
    revalidatePath('/admin/onboarding')
    revalidatePath(`/admin/onboarding/${eventId}`)

    return { 
      success: true, 
      message: 'Driver removido del onboarding exitosamente'
    }
  } catch (error: any) {
    console.error('Error al remover driver:', error)
    return { 
      success: false, 
      error: error.message || 'Error al remover driver del evento' 
    }
  }
}

/**
 * Remueve completamente un driver de un evento de onboarding por attendeeId
 * ELIMINA el registro en lugar de marcarlo como cancelado
 */
export async function removeDriverFromOnboardingEvent({
  attendeeId,
  reason
}: {
  attendeeId: string
  reason?: string
}) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    // Obtener el attendee para tener eventId y driverId
    const attendee = await prisma.onboardingAttendee.findUnique({
      where: { id: attendeeId },
      select: {
        eventId: true,
        formDriverId: true
      }
    })

    if (!attendee) {
      throw new Error('Asistente no encontrado')
    }

    // Remover usando el servicio
    await onboardingService.removeDriver({
      eventId: attendee.eventId,
      driverId: attendee.formDriverId
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'OTHER',
        actionType: 'DELETE',
        entityType: 'OnboardingAttendee',
        entityId: attendeeId,
        description: `Driver removido del evento de onboarding${reason ? `: ${reason}` : ''}`,
        metadata: { 
          attendeeId, 
          eventId: attendee.eventId, 
          formDriverId: attendee.formDriverId,
          reason,
          actionDetail: 'DRIVER_REMOVED_FROM_ONBOARDING_EVENT' 
        }
      }
    })

    revalidatePath(`/admin/postulaciones/${attendee.formDriverId}`)
    revalidatePath('/admin/onboarding')
    revalidatePath(`/admin/onboarding/${attendee.eventId}`)

    return { 
      success: true, 
      message: 'Driver removido del onboarding exitosamente'
    }
  } catch (error: any) {
    console.error('Error al remover driver:', error)
    return { 
      success: false, 
      error: error.message || 'Error al remover driver del evento' 
    }
  }
}

/**
 * Actualiza el estado de un attendee
 */
export async function updateAttendeeStatus(
  attendeeId: string, 
  status: OnboardingAttendeeStatus, 
  notes?: string
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const attendee = await onboardingService.updateAttendeeStatus(attendeeId, status, notes)

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'OTHER',
        actionType: 'UPDATE',
        entityType: 'OnboardingAttendee',
        entityId: attendeeId,
        description: `Estado de asistente actualizado a ${status}`,
        metadata: { attendeeId, status, notes, actionDetail: 'ATTENDEE_STATUS_UPDATED' }
      }
    })

    revalidatePath('/admin/onboarding')
    revalidatePath(`/admin/onboarding/${attendee.event.id}`)
    revalidatePath(`/admin/postulaciones/${attendee.formDriver.id}`)

    return { success: true, attendee, message: 'Estado actualizado exitosamente' }
  } catch (error: any) {
    console.error('Error al actualizar estado:', error)
    return { success: false, error: error.message || 'Error al actualizar estado' }
  }
}

/**
 * Realiza check-in de un asistente
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
        description: `Check-in realizado para ${attendee.formDriver.fullName}`,
        metadata: { attendeeId, notes }
      }
    })

    revalidatePath('/admin/onboarding')
    revalidatePath(`/admin/postulaciones/${attendee.formDriver.id}`)

    return { success: true, attendee, message: 'Check-in realizado exitosamente' }
  } catch (error: any) {
    console.error('Error al realizar check-in:', error)
    return { success: false, error: error.message || 'Error al realizar check-in' }
  }
}

/**
 * Marca un asistente como no-show
 */
export async function markAttendeeNoShow(attendeeId: string) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const attendee = await onboardingService.markNoShow(attendeeId, userId)

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'ONBOARDING_ATTENDEE_NO_SHOW',
        actionType: 'UPDATE',
        entityType: 'OnboardingAttendee',
        entityId: attendeeId,
        description: `No-show marcado`,
        metadata: { attendeeId }
      }
    })

    // Re-enganche best-effort: avisamos por WhatsApp que no asistió y puede
    // reagendar. markNoShow ya reseteó el backoff; registramos este envío con
    // recordMessageSent para fijar el próximo noContactBefore y que el cron no
    // duplique el mensaje el mismo día. Si el template está inactivo, se skipea
    // sin romper la action.
    const driver = attendee.formDriver
    if (driver?.phoneNumber) {
      after(async () => {
        try {
          const result = await sendTemplateByKey(
            {
              id: driver.id,
              phoneNumber: driver.phoneNumber,
              firstName: null,
              lastName: null,
              fullName: driver.fullName,
            },
            'capacitacion_no_show',
            {
              source: WhatsAppMessageSource.TRIGGER,
              messageType: WhatsAppMessageType.CAPACITATION_NO_SHOW,
              step: 'no_show_reenganche',
            },
          )
          if (result.status === 'sent') {
            await recordMessageSent(driver.id).catch(() => undefined)
          }
        } catch (err) {
          console.error('[NO_SHOW] Error enviando re-enganche WhatsApp', {
            driverId: driver.id,
            error: err instanceof Error ? err.message : err,
          })
        }
      })
    }

    revalidatePath('/admin/onboarding')
    revalidatePath(`/admin/postulaciones/${attendee.formDriver.id}`)

    return { success: true, attendee, message: 'No-show marcado' }
  } catch (error: any) {
    console.error('Error al marcar no-show:', error)
    return { success: false, error: error.message || 'Error al marcar no-show' }
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
 * Cancela la asistencia de un driver (marca como cancelado, no elimina)
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
    return { success: false, error: error.message || 'Error al obtener estado', status: null }
  }
}