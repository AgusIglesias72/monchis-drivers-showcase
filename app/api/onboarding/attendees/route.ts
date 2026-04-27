// app/api/onboarding/attendees/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { AuditAction } from '@prisma/client'

// 📋 GET - Listar asistentes de un evento
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const formDriverId = searchParams.get('formDriverId')

    const where: any = {}
    if (eventId) where.eventId = eventId
    if (formDriverId) where.formDriverId = formDriverId

    const attendees = await prisma.onboardingAttendee.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            scheduledDate: true,
            startTime: true,
            location: true,
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
          }
        },
        invitedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        }
      },
      orderBy: { invitedAt: 'desc' }
    })

    return NextResponse.json(attendees)
  } catch (error) {
    console.error('Error al obtener asistentes:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ➕ POST - Agregar asistente(s) a evento
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { clerkId: userId }
    })

    if (!adminUser) {
      return NextResponse.json({ error: 'Usuario admin no encontrado' }, { status: 403 })
    }

    const body = await request.json()
    const { eventId, formDriverIds, attendeeNotes } = body

    // Validaciones
    if (!eventId || !formDriverIds || !Array.isArray(formDriverIds) || formDriverIds.length === 0) {
      return NextResponse.json(
        { error: 'eventId y formDriverIds (array) son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el evento existe y está en estado válido
    const event = await prisma.onboardingEvent.findUnique({
      where: { id: eventId },
      include: {
        attendees: {
          where: {
            status: { in: ['INVITED', 'CONFIRMED', 'ATTENDED'] }
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    if (!['DRAFT', 'SCHEDULED'].includes(event.status)) {
      return NextResponse.json(
        { error: 'No se pueden agregar asistentes a eventos en este estado' },
        { status: 400 }
      )
    }

    // Verificar capacidad disponible
    if (event.maxCapacity) {
      const currentCapacity = event.attendees.length
      const availableSlots = event.maxCapacity - currentCapacity

      if (formDriverIds.length > availableSlots) {
        return NextResponse.json(
          { error: `Solo hay ${availableSlots} espacios disponibles` },
          { status: 400 }
        )
      }
    }

    // Verificar que los drivers existen
    const drivers = await prisma.formDriver.findMany({
      where: {
        id: { in: formDriverIds }
      }
    })

    if (drivers.length !== formDriverIds.length) {
      return NextResponse.json(
        { error: 'Algunos drivers no existen' },
        { status: 400 }
      )
    }

    // Verificar que no estén ya asignados a este evento
    const existingAttendees = await prisma.onboardingAttendee.findMany({
      where: {
        eventId,
        formDriverId: { in: formDriverIds },
        status: { in: ['INVITED', 'CONFIRMED', 'ATTENDED', 'RESCHEDULED'] }
      }
    })

    if (existingAttendees.length > 0) {
      return NextResponse.json(
        { error: 'Algunos drivers ya están asignados a este evento' },
        { status: 400 }
      )
    }

    // Crear o reactivar asistentes (puede existir uno cancelado por unique constraint)
    const attendees = await Promise.all(
      formDriverIds.map(async (formDriverId) => {
        const attendee = await prisma.onboardingAttendee.upsert({
          where: {
            eventId_formDriverId: { eventId, formDriverId },
          },
          update: {
            status: 'INVITED',
            invitedBy: adminUser.id,
            attendeeNotes,
            invitedAt: new Date(),
            cancelledAt: null,
            cancelledBy: null,
            cancelledReason: null,
          },
          create: {
            eventId,
            formDriverId,
            status: 'INVITED',
            invitedBy: adminUser.id,
            attendeeNotes,
          },
          include: {
            formDriver: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
              }
            },
            event: {
              select: {
                title: true,
                scheduledDate: true,
                startTime: true,
                location: true,
              }
            }
          }
        })

        // Actualizar estado del driver
        await prisma.formDriver.update({
          where: { id: formDriverId },
          data: {
            onboardingStatus: 'SCHEDULED',
            onboardingScheduledAt: event.scheduledDate,
          }
        })

        // Log de auditoría
        await prisma.auditLog.create({
          data: {
            userId: adminUser.clerkId,
            userEmail: adminUser.email,
            action: 'ONBOARDING_ATTENDEE_INVITED',
            actionType: 'CREATE',
            entityType: 'OnboardingAttendee',
            entityId: attendee.id,
            description: `Driver ${attendee.formDriver.fullName} invitado al evento ${event.title}`,
            metadata: {
              eventId,
              formDriverId,
              eventDate: event.scheduledDate
            }
          }
        })

        return attendee
      })
    )

    // Actualizar capacidad actual del evento
    await prisma.onboardingEvent.update({
      where: { id: eventId },
      data: {
        currentCapacity: {
          increment: formDriverIds.length
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      attendees,
      message: `${attendees.length} driver(s) agregado(s) al evento`
    }, { status: 201 })
  } catch (error) {
    console.error('Error al agregar asistentes:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// 🔄 PATCH - Actualizar estado de asistente
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { clerkId: userId }
    })

    if (!adminUser) {
      return NextResponse.json({ error: 'Usuario admin no encontrado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const attendeeId = searchParams.get('id')

    if (!attendeeId) {
      return NextResponse.json({ error: 'ID de asistente requerido' }, { status: 400 })
    }

    const body = await request.json()
    const { action, attendeeNotes, newEventId } = body

    const attendee = await prisma.onboardingAttendee.findUnique({
      where: { id: attendeeId },
      include: {
        event: true,
        formDriver: true,
      }
    })

    if (!attendee) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    }

    let updateData: any = {}
    let auditAction = 'ONBOARDING_ATTENDEE_UPDATED'
    let auditDescription = ''

    switch (action) {
      case 'CHECK_IN':
        updateData = {
          status: 'ATTENDED',
          checkedInAt: new Date(),
          checkedInBy: adminUser.id,
        }
        auditAction = 'ONBOARDING_ATTENDEE_CHECKED_IN'
        auditDescription = `Check-in realizado para ${attendee.formDriver.fullName}`
        
        await prisma.formDriver.update({
          where: { id: attendee.formDriverId },
          data: {
            onboardingStatus: 'IN_PROGRESS',
          }
        })
        break

      case 'MARK_NO_SHOW':
        updateData = {
          status: 'NO_SHOW',
          markedNoShowAt: new Date(),
          markedNoShowBy: adminUser.id,
        }
        auditAction = 'ONBOARDING_ATTENDEE_NO_SHOW'
        auditDescription = `Marcado como no show: ${attendee.formDriver.fullName}`
        
        await prisma.formDriver.update({
          where: { id: attendee.formDriverId },
          data: {
            onboardingStatus: 'NO_SHOW',
          }
        })
        break

      case 'CANCEL':
        updateData = {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: adminUser.id,
          cancelledReason: attendeeNotes,
        }
        auditAction = 'ONBOARDING_ATTENDEE_CANCELLED'
        auditDescription = `Asistencia cancelada: ${attendee.formDriver.fullName}`

        // Liberar capacidad del evento
        await prisma.onboardingEvent.update({
          where: { id: attendee.eventId },
          data: { currentCapacity: { decrement: 1 } },
        })

        await prisma.formDriver.update({
          where: { id: attendee.formDriverId },
          data: {
            onboardingStatus: 'READY',
            onboardingScheduledAt: null,
          }
        })
        break

      case 'RESCHEDULE':
        if (!newEventId) {
          return NextResponse.json({ error: 'newEventId es requerido para reagendar' }, { status: 400 })
        }

        const newEvent = await prisma.onboardingEvent.findUnique({
          where: { id: newEventId }
        })

        if (!newEvent) {
          return NextResponse.json({ error: 'Nuevo evento no encontrado' }, { status: 404 })
        }

        updateData = {
          status: 'RESCHEDULED',
          rescheduledAt: new Date(),
          rescheduledBy: adminUser.id,
          rescheduledFrom: attendee.eventId,
          rescheduledToEventId: newEventId,
        }
        auditAction = 'ONBOARDING_ATTENDEE_RESCHEDULED'
        auditDescription = `Reagendado de "${attendee.event.title}" a "${newEvent.title}"`

        // Liberar capacidad del evento anterior, incrementar nuevo
        await prisma.onboardingEvent.update({
          where: { id: attendee.eventId },
          data: { currentCapacity: { decrement: 1 } },
        })
        await prisma.onboardingEvent.update({
          where: { id: newEventId },
          data: { currentCapacity: { increment: 1 } },
        })

        await prisma.onboardingAttendee.upsert({
          where: {
            eventId_formDriverId: { eventId: newEventId, formDriverId: attendee.formDriverId },
          },
          update: {
            status: 'INVITED',
            invitedBy: adminUser.id,
            attendeeNotes: `Reagendado desde evento anterior`,
            invitedAt: new Date(),
            cancelledAt: null,
            cancelledBy: null,
            cancelledReason: null,
          },
          create: {
            eventId: newEventId,
            formDriverId: attendee.formDriverId,
            status: 'INVITED',
            invitedBy: adminUser.id,
            attendeeNotes: `Reagendado desde evento anterior`,
          },
        })

        await prisma.formDriver.update({
          where: { id: attendee.formDriverId },
          data: {
            onboardingScheduledAt: newEvent.scheduledDate,
          }
        })
        break

      case 'CONFIRM':
        updateData = {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        }
        auditAction = 'ONBOARDING_ATTENDEE_CONFIRMED'
        auditDescription = `Asistencia confirmada: ${attendee.formDriver.fullName}`
        break

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

    if (attendeeNotes) {
      updateData.attendeeNotes = attendeeNotes
    }

    const updatedAttendee = await prisma.onboardingAttendee.update({
      where: { id: attendeeId },
      data: updateData,
      include: {
        event: true,
        formDriver: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
          }
        }
      }
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: adminUser.clerkId,
        userEmail: adminUser.email,
        action: auditAction as AuditAction,
        actionType: 'UPDATE',
        entityType: 'OnboardingAttendee',
        entityId: attendeeId,
        description: auditDescription,
        metadata: {
          action,
          formDriverId: attendee.formDriverId,
          eventId: attendee.eventId,
        }
      }
    })

    return NextResponse.json(updatedAttendee)
  } catch (error) {
    console.error('Error al actualizar asistente:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}