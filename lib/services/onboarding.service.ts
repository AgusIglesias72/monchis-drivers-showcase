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
        scheduleRule: {
          select: {
            id: true,
            slug: true,
            title: true,
            modality: true
          }
        },
        attendees: {
          include: {
            formDriver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                fullName: true,
                phoneNumber: true,
                email: true
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
        }
      },
      orderBy: {
        scheduledDate: 'asc' // Ordenar de más próximo a más lejano (ascendente)
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
        scheduleRule: {
          select: {
            id: true,
            slug: true,
            title: true,
            modality: true
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
                onboardingStatus: true,
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
            },
            invitedByUser: {
              select: {
                id: true,
                fullName: true,
                email: true
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
        scheduleRule: {
          select: {
            id: true,
            slug: true,
            title: true,
            modality: true
          }
        },
        attendees: {
          include: {
            formDriver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                fullName: true,
                phoneNumber: true,
                email: true
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
        }
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
    if (data.organizer !== undefined) updateData.organizer = data.organizer

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
        scheduleRule: {
          select: {
            id: true,
            slug: true,
            title: true,
            modality: true
          }
        },
        attendees: {
          include: {
            formDriver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                fullName: true,
                phoneNumber: true,
                email: true
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

    // Crear o reactivar attendee (puede existir uno cancelado por la unique constraint)
    const attendee = await prisma.onboardingAttendee.upsert({
      where: {
        eventId_formDriverId: { eventId, formDriverId: driverId },
      },
      update: {
        status: 'INVITED',
        invitedBy,
        attendeeNotes: notes,
        invitedAt: new Date(),
        cancelledAt: null,
        cancelledBy: null,
        cancelledReason: null,
      },
      create: {
        eventId,
        formDriverId: driverId,
        status: 'INVITED',
        invitedBy,
        attendeeNotes: notes,
        invitedAt: new Date(),
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

    // Actualizar capacidad del evento
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
   * Asigna múltiples drivers a un evento
   */
  async assignDriversToEvent(params: {
    eventId: string
    formDriverIds: string[]
    invitedBy: string // ✅ Ahora requerido (clerkId del usuario)
    attendeeNotes?: string
  }) {
    const { eventId, formDriverIds, invitedBy, attendeeNotes } = params

    // Verificar que el evento existe
    const event = await prisma.onboardingEvent.findUnique({
      where: { id: eventId },
      include: { attendees: true }
    })

    if (!event) {
      throw new Error('Evento no encontrado')
    }

    // Verificar capacidad si hay máximo
    if (event.maxCapacity) {
      const currentCount = event.attendees.filter(a => 
        !['CANCELLED'].includes(a.status)
      ).length
      
      if (currentCount + formDriverIds.length > event.maxCapacity) {
        throw new Error('Se excedería la capacidad máxima del evento')
      }
    }

    // Crear o reactivar attendees en batch
    const attendees = await prisma.$transaction(
      formDriverIds.map(driverId =>
        prisma.onboardingAttendee.upsert({
          where: {
            eventId_formDriverId: { eventId, formDriverId: driverId },
          },
          update: {
            status: 'INVITED',
            invitedBy,
            attendeeNotes: attendeeNotes || null,
            invitedAt: new Date(),
            cancelledAt: null,
            cancelledBy: null,
            cancelledReason: null,
          },
          create: {
            eventId,
            formDriverId: driverId,
            status: 'INVITED',
            invitedBy,
            attendeeNotes: attendeeNotes || null,
            invitedAt: new Date(),
          },
          include: {
            formDriver: true
          }
        })
      )
    )

    // Actualizar contador de capacidad
    await prisma.onboardingEvent.update({
      where: { id: eventId },
      data: {
        currentCapacity: {
          increment: formDriverIds.length
        }
      }
    })

    // Actualizar estado de onboarding de los drivers
    await prisma.formDriver.updateMany({
      where: {
        id: { in: formDriverIds }
      },
      data: {
        onboardingStatus: 'SCHEDULED',
        onboardingScheduledAt: event.scheduledDate
      }
    })

    return attendees
  }

  /**
   * Remueve un driver de un evento (elimina el registro)
   */
  async removeDriver(params: {
    eventId: string
    driverId: string
  }) {
    const { eventId, driverId } = params

    const attendee = await prisma.onboardingAttendee.findFirst({
      where: {
        eventId,
        formDriverId: driverId
      }
    })

    if (!attendee) {
      throw new Error('Asistente no encontrado')
    }

    // Eliminar el attendee
    await prisma.onboardingAttendee.delete({
      where: { id: attendee.id }
    })

    // Decrementar capacidad
    await prisma.onboardingEvent.update({
      where: { id: eventId },
      data: {
        currentCapacity: {
          decrement: 1
        }
      }
    })

    // Actualizar estado del driver si no tiene otros eventos pendientes
    const otherAttendances = await prisma.onboardingAttendee.count({
      where: {
        formDriverId: driverId,
        status: {
          in: ['INVITED', 'CONFIRMED', 'ATTENDED']
        }
      }
    })

    if (otherAttendances === 0) {
      await prisma.formDriver.update({
        where: { id: driverId },
        data: {
          onboardingStatus: null,
          onboardingScheduledAt: null
        }
      })
    }

    return { success: true }
  }

  /**
   * Actualiza el estado de un attendee
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
   * ✅ TOTALMENTE CORREGIDO: 
   * - Muestra TODOS los drivers (sin filtros restrictivos)
   * - Los ordena priorizando: documentos aprobados > formulario completado > más recientes
   * - Los filtros se aplican en el cliente
   */
  async getEligibleDrivers(params: {
    eventId?: string
    search?: string
    page?: number
    limit?: number
  }) {
    const { eventId, search = '', page = 1, limit = 20 } = params
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

    // ✅ CORREGIDO: SIN FILTROS RESTRICTIVOS
    // Mostrar TODOS los drivers, solo excluir los ya asignados a este evento
    const where: any = {
      ...searchFilter,
      ...(eventId && assignedIds.size > 0 ? { id: { notIn: Array.from(assignedIds) } } : {}),
      // ❌ REMOVIDO: documentsStatus: 'APPROVED'
      // ❌ REMOVIDO: status: 'ACTIVE'
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
          currentStep: true,
          completedAt: true,
          // ✅ Incluir conteo de documentos para mejor ordenamiento
          documents: {
            select: {
              status: true
            }
          },
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
        // ✅ ORDENAMIENTO INTELIGENTE:
        // 1. Documentos aprobados primero
        // 2. Formulario completado primero
        // 3. Más recientes
        orderBy: [
          { documentsStatus: 'desc' }, // APPROVED > IN_REVIEW > PENDING > INCOMPLETE
          { completedAt: 'desc' },     // Completados primero
          { lastActivityAt: 'desc' }   // Más recientes
        ],
        skip,
        take: limit
      }),
      prisma.formDriver.count({ where })
    ])

    // Mapear drivers con información de asignación y métricas
    const eligibleDrivers = drivers.map(driver => {
      const latestAttendance = driver.onboardingAttendances[0]
      const isAssignedToOtherEvent = !!latestAttendance && latestAttendance.event.id !== eventId
      
      // ✅ Solo deshabilitar si está asignado a otro evento
      let canBeSelected = !isAssignedToOtherEvent
      let disabledReason = null

      if (isAssignedToOtherEvent) {
        canBeSelected = false
        disabledReason = `Ya asignado a: ${latestAttendance.event.title || 'otro evento'}`
      }

      // Calcular métricas de documentos
      const approvedDocs = driver.documents.filter(d => d.status === 'APPROVED').length
      const totalDocs = driver.documents.length

      return {
        id: driver.id,
        fullName: driver.fullName,
        phoneNumber: driver.phoneNumber,
        email: driver.email,
        cedula: driver.cedula,
        documentsStatus: driver.documentsStatus,
        onboardingStatus: driver.onboardingStatus,
        onboardingScheduledAt: driver.onboardingScheduledAt,
        status: driver.status,
        createdAt: driver.createdAt,
        lastActivityAt: driver.lastActivityAt,
        currentStep: driver.currentStep,
        completedAt: driver.completedAt,
        // Información adicional útil
        approvedDocuments: approvedDocs,
        totalDocuments: totalDocs,
        isFormComplete: !!driver.completedAt,
        // Información de asignación
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