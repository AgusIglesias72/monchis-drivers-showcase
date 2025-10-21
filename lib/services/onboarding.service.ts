// lib/services/onboarding.service.ts

import { prisma } from '@/lib/prisma'

export class OnboardingService {
  
  /**
   * Obtiene eventos de onboarding disponibles (upcoming)
   */
  async getAvailableEvents() {
    const now = new Date()
    
    const events = await prisma.onboardingEvent.findMany({
      where: {
        scheduledDate: {
          gte: now
        },
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        }
      },
      select: {
        id: true,
        title: true,
        description: true,
        scheduledDate: true,
        startTime: true,
        endTime: true,
        location: true,
        locationAddress: true,
        meetingLink: true,
        maxCapacity: true,
        currentCapacity: true,
        status: true,
        _count: {
          select: {
            attendees: {
              where: {
                status: {
                  in: ['INVITED', 'CONFIRMED', 'SCHEDULED', 'ATTENDED']
                }
              }
            }
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    })
    
    // Calcular slots disponibles
    return events.map(event => ({
      ...event,
      availableSlots: event.maxCapacity 
        ? event.maxCapacity - (event.currentCapacity || 0)
        : null, // null = sin límite
      hasCapacity: !event.maxCapacity || (event.currentCapacity || 0) < event.maxCapacity
    }))
  }
  
  /**
   * Asigna un driver a un evento de onboarding
   */
  async assignDriverToEvent({
    eventId,
    driverId,
    assignedBy,
    notes
  }: {
    eventId: string
    driverId: string
    assignedBy: string // clerkId del admin
    notes?: string
  }) {
    // Verificar que el evento existe y tiene capacidad
    const event = await prisma.onboardingEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        scheduledDate: true,
        maxCapacity: true,
        currentCapacity: true,
        status: true
      }
    })
    
    if (!event) {
      throw new Error('Evento no encontrado')
    }
    
    if (event.status !== 'SCHEDULED' && event.status !== 'IN_PROGRESS') {
      throw new Error('El evento no está disponible para asignación')
    }
    
    if (event.maxCapacity && event.currentCapacity >= event.maxCapacity) {
      throw new Error('El evento no tiene cupos disponibles')
    }
    
    // Verificar que el driver existe
    const driver = await prisma.formDriver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        email: true
      }
    })
    
    if (!driver) {
      throw new Error('Driver no encontrado')
    }
    
    // Verificar si ya está asignado a este evento
    const existingAttendance = await prisma.onboardingAttendee.findFirst({
      where: {
        eventId,
        formDriverId: driverId,
        status: {
          in: ['INVITED', 'CONFIRMED', 'SCHEDULED', 'ATTENDED']
        }
      }
    })
    
    if (existingAttendance) {
      throw new Error('El driver ya está asignado a este evento')
    }
    
    // Crear la asistencia
    const attendee = await prisma.onboardingAttendee.create({
      data: {
        eventId,
        formDriverId: driverId,
        status: 'SCHEDULED',
        invitedBy: assignedBy,
        attendeeNotes: notes,
        // Generar token de confirmación
        confirmationToken: `${driverId}-${eventId}-${Date.now()}`
      },
      include: {
        formDriver: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true
          }
        },
        event: {
          select: {
            title: true,
            scheduledDate: true,
            startTime: true,
            location: true
          }
        }
      }
    })
    
    // Actualizar estado del driver
    await prisma.formDriver.update({
      where: { id: driverId },
      data: {
        onboardingStatus: 'SCHEDULED',
        onboardingScheduledAt: event.scheduledDate
      }
    })
    
    // Incrementar capacidad del evento
    await prisma.onboardingEvent.update({
      where: { id: eventId },
      data: {
        currentCapacity: {
          increment: 1
        }
      }
    })
    
    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: assignedBy,
        userEmail: 'system', // Se actualizará con el email del admin
        action: 'ONBOARDING_ATTENDEE_INVITED',
        actionType: 'CREATE',
        entityType: 'OnboardingAttendee',
        entityId: attendee.id,
        description: `Driver ${driver.fullName} asignado al evento ${event.title}`,
        metadata: {
          eventId,
          formDriverId: driverId,
          eventDate: event.scheduledDate
        }
      }
    })
    
    return attendee
  }
  
  /**
   * Obtiene el estado de onboarding de un driver
   */
  async getDriverOnboardingStatus(driverId: string) {
    const attendance = await prisma.onboardingAttendee.findFirst({
      where: {
        formDriverId: driverId,
        status: {
          in: ['INVITED', 'CONFIRMED', 'SCHEDULED', 'ATTENDED']
        }
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            scheduledDate: true,
            startTime: true,
            location: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return attendance
  }
}

export const onboardingService = new OnboardingService()