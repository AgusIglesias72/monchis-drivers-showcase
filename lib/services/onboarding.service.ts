// lib/services/onboarding.service.ts

import { prisma } from '@/lib/prisma'
import type { 
  OnboardingEventStatus,
  OnboardingAttendeeStatus,
  CreateEventRequest,
  UpdateEventRequest
} from '@/types/onboarding'

class OnboardingService {
  /**
   * Obtiene todos los eventos con sus relaciones
   */
  async getAllEvents(filters?: {
    status?: OnboardingEventStatus
    upcoming?: boolean
    past?: boolean
  }) {
    const where: any = {}
    
    if (filters?.status) {
      where.status = filters.status
    }
    
    if (filters?.upcoming) {
      where.scheduledDate = {
        gte: new Date()
      }
      where.status = {
        in: ['DRAFT', 'SCHEDULED', 'IN_PROGRESS']
      }
    }
    
    if (filters?.past) {
      where.OR = [
        {
          scheduledDate: {
            lt: new Date()
          }
        },
        {
          status: {
            in: ['COMPLETED', 'CANCELLED']
          }
        }
      ]
    }

    return await prisma.onboardingEvent.findMany({
      where,
      include: {
        organizerUser: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        },
        attendees: true
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    })
  }

  /**
   * Obtiene un evento por ID con todas sus relaciones
   * ✅ CORREGIDO: Incluye equipmentPayments
   */
  async getEventById(eventId: string) {
    return await prisma.onboardingEvent.findUnique({
      where: { id: eventId },
      include: {
        organizerUser: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        },
        attendees: {
          include: {
            formDriver: {
              select: {
                id: true,
                fullName: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
                cedula: true,
                status: true,
                documentsStatus: true,
                // ✅ AGREGADO: Include de equipmentPayments
                equipmentPayments: {
                  select: {
                    id: true,
                    status: true,
                    amount: true,
                    paymentMethod: true,
                    createdAt: true
                  },
                  orderBy: {
                    createdAt: 'desc'
                  },
                  take: 1
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })
  }

  /**
   * Crea un nuevo evento
   */
  async createEvent(organizerId: string, data: CreateEventRequest) {
    const currentCapacity = 0

    return await prisma.onboardingEvent.create({
      data: {
        title: data.title,
        description: data.description,
        scheduledDate: new Date(data.scheduledDate),
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        locationAddress: data.locationAddress,
        meetingLink: data.meetingLink,
        maxCapacity: data.maxCapacity,
        currentCapacity,
        reminderHoursBefore: data.reminderHoursBefore || 24,
        status: data.status || 'DRAFT',
        notes: data.notes,
        organizer: organizerId  
      },
      include: {
        organizerUser: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        },
        attendees: true
      }
    })
  }

  /**
   * Actualiza un evento existente
   */
  async updateEvent(eventId: string, data: UpdateEventRequest) {
    const updateData: any = {}
    
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.scheduledDate !== undefined) updateData.scheduledDate = new Date(data.scheduledDate)
    if (data.startTime !== undefined) updateData.startTime = data.startTime
    if (data.endTime !== undefined) updateData.endTime = data.endTime
    if (data.location !== undefined) updateData.location = data.location
    if (data.locationAddress !== undefined) updateData.locationAddress = data.locationAddress
    if (data.meetingLink !== undefined) updateData.meetingLink = data.meetingLink
    if (data.maxCapacity !== undefined) updateData.maxCapacity = data.maxCapacity
    if (data.reminderHoursBefore !== undefined) updateData.reminderHoursBefore = data.reminderHoursBefore
    if (data.status !== undefined) updateData.status = data.status
    if (data.notes !== undefined) updateData.notes = data.notes

    return await prisma.onboardingEvent.update({
      where: { id: eventId },
      data: updateData,
      include: {
        organizerUser: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        },
        attendees: {
          include: {
            formDriver: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true
              }
            }
          }
        }
      }
    })
  }

  /**
   * Elimina un evento
   */
  async deleteEvent(eventId: string) {
    // Verificar si tiene asistentes
    const event = await prisma.onboardingEvent.findUnique({
      where: { id: eventId },
      include: {
        attendees: true
      }
    })

    if (!event) {
      throw new Error('Evento no encontrado')
    }

    if (event.attendees.length > 0) {
      throw new Error('No se puede eliminar un evento con asistentes asignados')
    }

    await prisma.onboardingEvent.delete({
      where: { id: eventId }
    })

    return { success: true }
  }

  /**
   * Obtiene eventos disponibles para asignar drivers
   */
  async getAvailableEvents() {
    return await prisma.onboardingEvent.findMany({
      where: {
        status: {
          in: ['DRAFT', 'SCHEDULED']
        },
        scheduledDate: {
          gte: new Date()
        }
      },
      include: {
        organizerUser: {
          select: {
            id: true,
            fullName: true
          }
        },
        attendees: {
          where: {
            status: {
              in: ['INVITED', 'CONFIRMED', 'ATTENDED']
            }
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    })
  }

  /**
   * Asigna un driver a un evento
   */
  async assignDriver(params: {
    eventId: string
    driverId: string
    invitedBy: string
    notes?: string
  }) {
    const { eventId, driverId, invitedBy, notes } = params

    // Verificar que el evento existe y tiene capacidad
    const event = await prisma.onboardingEvent.findUnique({
      where: { id: eventId },
      include: {
        attendees: {
          where: {
            status: {
              in: ['INVITED', 'CONFIRMED', 'ATTENDED']
            }
          }
        }
      }
    })

    if (!event) {
      throw new Error('Evento no encontrado')
    }

    if (event.currentCapacity >= (event.maxCapacity || 0)) {
      throw new Error('El evento ha alcanzado su capacidad máxima')
    }

    // Verificar que el driver no esté ya asignado
    const existingAttendee = await prisma.onboardingAttendee.findFirst({
      where: {
        eventId,
        formDriverId: driverId,
        status: {
          in: ['INVITED', 'CONFIRMED', 'ATTENDED']
        }
      }
    })

    if (existingAttendee) {
      throw new Error('El driver ya está asignado a este evento')
    }

    // Crear attendee
    const attendee = await prisma.onboardingAttendee.create({
      data: {
        eventId,
        formDriverId: driverId,
        status: 'INVITED',
        invitedBy,
        attendeeNotes: notes
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            scheduledDate: true,
            startTime: true,
            location: true
          }
        },
        formDriver: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true
          }
        }
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

    // Actualizar estado del driver
    await prisma.formDriver.update({
      where: { id: driverId },
      data: {
        onboardingStatus: 'SCHEDULED',
        onboardingScheduledAt: event.scheduledDate
      }
    })

    return attendee
  }

  /**
   * Asigna múltiples drivers a un evento en batch
   */
  async assignDriversBatch(params: {
    eventId: string
    driverIds: string[]
    assignedBy: string
    notes?: string
  }) {
    const { eventId, driverIds, assignedBy, notes } = params

    // Verificar evento y capacidad
    const event = await prisma.onboardingEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        scheduledDate: true,
        maxCapacity: true,
        currentCapacity: true
      }
    })

    if (!event) {
      throw new Error('Evento no encontrado')
    }

    const newDriversCount = driverIds.length
    if (event.currentCapacity + newDriversCount > (event.maxCapacity || 0))   {
      throw new Error(`No hay suficiente capacidad. Actualmente hay ${event.currentCapacity} asistentes. No puedes agregar ${newDriversCount} drivers.`)
    }

    // Crear attendees en batch
    const attendees = await prisma.$transaction(async (tx) => {
      await tx.onboardingAttendee.createMany({
        data: driverIds.map(driverId => ({
          eventId,
          formDriverId: driverId,
          status: 'INVITED' as const,
          invitedBy: assignedBy,
          attendeeNotes: notes
        }))
      })

      // Incrementar capacidad
      await tx.onboardingEvent.update({
        where: { id: eventId },
        data: {
          currentCapacity: {
            increment: newDriversCount
          }
        }
      })

      // Actualizar estado de drivers
      await tx.formDriver.updateMany({
        where: { id: { in: driverIds } },
        data: {
          onboardingStatus: 'SCHEDULED',
          onboardingScheduledAt: new Date()
        }
      })

      // Obtener los attendees creados con sus relaciones
      return await tx.onboardingAttendee.findMany({
        where: {
          eventId,
          formDriverId: { in: driverIds }
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              scheduledDate: true,
              startTime: true,
              location: true
            }
          },
          formDriver: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              email: true,
              documentsStatus: true,
              onboardingStatus: true
            }
          },
          invitedByUser: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      })
    })

    return attendees
  }

  /**
   * Remueve un driver de un evento (eliminación completa)
   */
  async removeDriver(attendeeId: string) {
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

    // Eliminar attendee
    await prisma.onboardingAttendee.delete({
      where: { id: attendeeId }
    })

    // Decrementar capacidad del evento
    await prisma.onboardingEvent.update({
      where: { id: attendee.eventId },
      data: {
        currentCapacity: {
          decrement: 1
        }
      }
    })

    // Actualizar estado del driver si no tiene otros eventos pendientes
    const otherAttendances = await prisma.onboardingAttendee.count({
      where: {
        formDriverId: attendee.formDriverId,
        status: {
          in: ['INVITED', 'CONFIRMED', 'ATTENDED']
        },
        id: {
          not: attendeeId
        }
      }
    })

    if (otherAttendances === 0) {
      await prisma.formDriver.update({
        where: { id: attendee.formDriverId },
        data: {
          onboardingStatus: null,
          onboardingScheduledAt: null
        }
      })
    }

    return { success: true }
  }

  /**
   * Actualiza el estado de un asistente
   * ✅ CORREGIDO: Usa checkedInAt en lugar de attendedAt
   */
  async updateAttendeeStatus(
    attendeeId: string,
    status: OnboardingAttendeeStatus,
    notes?: string
  ) {
    const updateData: any = { status }
    
    if (notes) {
      updateData.attendeeNotes = notes
    }

    if (status === 'CONFIRMED') {
      updateData.confirmedAt = new Date()
    }

    // ✅ CORREGIDO: checkedInAt en lugar de attendedAt
    if (status === 'ATTENDED') {
      updateData.checkedInAt = new Date()
    }

    return await prisma.onboardingAttendee.update({
      where: { id: attendeeId },
      data: updateData,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            scheduledDate: true,
            startTime: true,
            location: true
          }
        },
        formDriver: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            documentsStatus: true,
            onboardingStatus: true,
            // ✅ AGREGADO: Include de equipmentPayments
            equipmentPayments: {
              select: {
                id: true,
                status: true,
                amount: true,
                createdAt: true
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 1
            }
          }
        },
        invitedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    })
  }

  /**
   * Cancela la asistencia de un driver
   * NOTA: Esto MARCA como cancelado, no elimina el registro
   * Usar removeDriver() para eliminar completamente
   */
  async cancelAttendee(attendeeId: string, reason?: string) {
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

    // Actualizar estado del attendee
    await prisma.onboardingAttendee.update({
      where: { id: attendeeId },
      data: {
        status: 'CANCELLED',
        attendeeNotes: reason
      }
    })

    // Decrementar capacidad del evento
    await prisma.onboardingEvent.update({
      where: { id: attendee.eventId },
      data: {
        currentCapacity: {
          decrement: 1
        }
      }
    })

    // Actualizar estado del driver si no tiene otros eventos pendientes
    const otherAttendances = await prisma.onboardingAttendee.count({
      where: {
        formDriverId: attendee.formDriverId,
        status: {
          in: ['INVITED', 'CONFIRMED', 'ATTENDED']
        },
        id: {
          not: attendeeId
        }
      }
    })

    if (otherAttendances === 0) {
      await prisma.formDriver.update({
        where: { id: attendee.formDriverId },
        data: {
          onboardingStatus: null,
          onboardingScheduledAt: null
        }
      })
    }

    return { success: true }
  }

  /**
   * Marca un asistente como check-in
   */
  async checkInAttendee(attendeeId: string, notes?: string) {
    const attendee = await this.updateAttendeeStatus(attendeeId, 'ATTENDED', notes)

    // Actualizar estado del driver
    await prisma.formDriver.update({
      where: { id: attendee.formDriver.id },
      data: {
        onboardingStatus: 'COMPLETED',
        onboardingCompletedAt: new Date()
      }
    })

    return attendee
  }

  /**
   * Marca un asistente como no show
   */
  async markNoShow(attendeeId: string) {
    return await this.updateAttendeeStatus(attendeeId, 'NO_SHOW')
  }

  /**
   * Confirma la asistencia de un driver
   */
  async confirmAttendee(attendeeId: string) {
    return await this.updateAttendeeStatus(attendeeId, 'CONFIRMED')
  }

  /**
   * Obtiene drivers elegibles para agregar a un evento
   */
  async getEligibleDrivers(params: {
    eventId?: string
    search?: string
    page?: number
    limit?: number
  }) {
    const { eventId, search = '', page = 1, limit = 10 } = params
    const skip = (page - 1) * limit

    // Filtro de búsqueda
    const searchFilter = search ? {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phoneNumber: { contains: search } },
        { cedula: { contains: search } },
      ]
    } : {}

    // Obtener drivers ya asignados a este evento específico
    const existingAttendees = eventId ? await prisma.onboardingAttendee.findMany({
      where: {
        eventId,
        status: { in: ['INVITED', 'CONFIRMED', 'ATTENDED', 'SCHEDULED', 'RESCHEDULED'] }
      },
      select: { formDriverId: true }
    }) : []

    const assignedIds = new Set(existingAttendees.map(a => a.formDriverId))

    // Construir where clause
    const where: any = {
      ...searchFilter,
      ...(eventId && assignedIds.size > 0 ? { id: { notIn: Array.from(assignedIds) } } : {}),
      documentsStatus: 'APPROVED',
      status: 'ACTIVE'
    }

    const [drivers, total] = await Promise.all([
      prisma.formDriver.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          cedula: true,
          documentsStatus: true,
          onboardingStatus: true,
          onboardingScheduledAt: true,
          status: true,
          createdAt: true,
          lastActivityAt: true,
          onboardingAttendances: {
            where: {
              status: { in: ['INVITED', 'CONFIRMED', 'ATTENDED', 'SCHEDULED'] }
            },
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  scheduledDate: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.formDriver.count({ where })
    ])

    // Mapear drivers con información de asignación
    const eligibleDrivers = drivers.map(driver => {
      const latestAttendance = driver.onboardingAttendances[0]
      const isAssignedToOtherEvent = !!latestAttendance && latestAttendance.event.id !== eventId
      
      let canBeSelected = true
      let disabledReason = null

      if (isAssignedToOtherEvent) {
        canBeSelected = false
        disabledReason = `Ya asignado a: ${latestAttendance.event.title || 'otro evento'}`
      }

      return {
        ...driver,
        onboardingAttendances: undefined,
        isAssignedToOtherEvent,
        canBeSelected,
        disabledReason,
        assignedEvent: latestAttendance ? latestAttendance.event : null
      }
    })

    return {
      drivers: eligibleDrivers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total
      }
    }
  }

  /**
   * Obtiene el estado de onboarding de un driver
   */
  async getDriverOnboardingStatus(driverId: string) {
    const driver = await prisma.formDriver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        fullName: true,
        onboardingStatus: true,
        onboardingScheduledAt: true,
        onboardingCompletedAt: true,
        onboardingAttendances: {
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
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!driver) {
      throw new Error('Driver no encontrado')
    }

    return driver
  }
}

export const onboardingService = new OnboardingService()