// app/api/onboarding/events/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// 📋 GET - Listar eventos con filtros
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    console.log('🔐 User ID from auth:', userId)
    
    if (!userId) {
      console.log('❌ No user ID found')
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { clerkId: userId }
    })
    console.log('👤 Admin user found:', adminUser ? { id: adminUser.id, email: adminUser.email, role: adminUser.role } : null)

    if (!adminUser) {
      console.log('❌ Admin user not found for clerkId:', userId)
      return NextResponse.json({ error: 'Usuario admin no encontrado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming') === 'true'
    const past = searchParams.get('past') === 'true'

    // Construir filtros
    const where: any = {}
    
    if (status) {
      where.status = status
    }

    if (upcoming) {
      where.scheduledDate = { gte: new Date() }
      where.status = { in: ['SCHEDULED', 'IN_PROGRESS'] }
    }

    if (past) {
      where.scheduledDate = { lt: new Date() }
      where.status = { in: ['COMPLETED', 'CANCELLED'] }
    }

    const events = await prisma.onboardingEvent.findMany({
      where,
      include: {
        organizerUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            fullName: true,
          }
        },
        attendees: {
          include: {
            formDriver: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
              }
            }
          }
        },
        _count: {
          select: {
            attendees: true
          }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    })

    // Calcular capacidad actual para cada evento
    const eventsWithCapacity = events.map(event => ({
      ...event,
      currentCapacity: event.attendees.filter(
        a => ['INVITED', 'CONFIRMED', 'ATTENDED'].includes(a.status)
      ).length,
      availableSlots: event.maxCapacity 
        ? event.maxCapacity - event.attendees.filter(
            a => ['INVITED', 'CONFIRMED', 'ATTENDED'].includes(a.status)
          ).length
        : null
    }))

    return NextResponse.json(eventsWithCapacity)
  } catch (error) {
    console.error('Error al obtener eventos:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ✨ POST - Crear evento
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

    // Solo ADMIN y SUPER_ADMIN pueden crear
    if (!['ADMIN', 'SUPER_ADMIN'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      scheduledDate,
      startTime,
      endTime,
      location,
      locationAddress,
      meetingLink,
      maxCapacity,
      reminderHoursBefore = 24,
      status = 'DRAFT',
      notes
    } = body

    // Validaciones
    if (!title || !scheduledDate || !startTime) {
      return NextResponse.json(
        { error: 'title, scheduledDate y startTime son requeridos' },
        { status: 400 }
      )
    }

    // Validar que la fecha sea futura
    const eventDate = new Date(scheduledDate)
    if (eventDate < new Date()) {
      return NextResponse.json(
        { error: 'La fecha del evento debe ser futura' },
        { status: 400 }
      )
    }

    // Crear evento
    const event = await prisma.onboardingEvent.create({
      data: {
        title,
        description,
        scheduledDate: eventDate,
        startTime,
        endTime,
        location,
        locationAddress,
        meetingLink,
        maxCapacity,
        reminderHoursBefore,
        status,
        notes,
        organizer: adminUser.id,
        reminderScheduled: true,
      },
      include: {
        organizerUser: {
          select: {
            id: true,
            email: true,
            fullName: true,
          }
        }
      }
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: adminUser.clerkId,
        userEmail: adminUser.email,
        action: 'ONBOARDING_EVENT_CREATED',
        actionType: 'CREATE',
        entityType: 'OnboardingEvent',
        entityId: event.id,
        description: `Evento creado: ${title}`,
        metadata: {
          eventDate: scheduledDate,
          capacity: maxCapacity
        }
      }
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error al crear evento:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// 🔄 PATCH - Actualizar evento
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
    const eventId = searchParams.get('id')

    if (!eventId) {
      return NextResponse.json({ error: 'ID de evento requerido' }, { status: 400 })
    }

    // Verificar que el evento existe
    const existingEvent = await prisma.onboardingEvent.findUnique({
      where: { id: eventId }
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    // Solo el organizador o SUPER_ADMIN puede editar
    if (existingEvent.organizer !== adminUser.id && adminUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Sin permisos para editar este evento' }, { status: 403 })
    }

    const body = await request.json()

    // Si se cambia la fecha, validar que sea futura
    if (body.scheduledDate) {
      const newDate = new Date(body.scheduledDate)
      if (newDate < new Date()) {
        return NextResponse.json(
          { error: 'La fecha del evento debe ser futura' },
          { status: 400 }
        )
      }
    }

    const updatedEvent = await prisma.onboardingEvent.update({
      where: { id: eventId },
      data: body,
      include: {
        organizerUser: {
          select: {
            id: true,
            email: true,
            fullName: true,
          }
        },
        attendees: {
          include: {
            formDriver: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
              }
            }
          }
        }
      }
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: adminUser.clerkId,
        userEmail: adminUser.email,
        action: 'ONBOARDING_EVENT_UPDATED',
        actionType: 'UPDATE',
        entityType: 'OnboardingEvent',
        entityId: eventId,
        description: `Evento actualizado: ${updatedEvent.title}`,
        changes: body
      }
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error('Error al actualizar evento:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// 🗑️ DELETE - Eliminar evento
export async function DELETE(request: NextRequest) {
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
    const eventId = searchParams.get('id')

    if (!eventId) {
      return NextResponse.json({ error: 'ID de evento requerido' }, { status: 400 })
    }

    const event = await prisma.onboardingEvent.findUnique({
      where: { id: eventId },
      include: {
        attendees: true
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    // Solo SUPER_ADMIN puede eliminar eventos
    if (adminUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Solo SUPER_ADMIN puede eliminar eventos' }, { status: 403 })
    }

    // No permitir eliminar eventos con asistentes confirmados o que ya ocurrieron
    const hasConfirmedAttendees = event.attendees.some(
      a => ['CONFIRMED', 'ATTENDED'].includes(a.status)
    )

    if (hasConfirmedAttendees || ['COMPLETED', 'IN_PROGRESS'].includes(event.status)) {
      return NextResponse.json(
        { error: 'No se puede eliminar un evento con asistentes confirmados o completado' },
        { status: 400 }
      )
    }

    await prisma.onboardingEvent.delete({
      where: { id: eventId }
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: adminUser.clerkId,
        userEmail: adminUser.email,
        action: 'ONBOARDING_EVENT_CANCELLED',
        actionType: 'DELETE',
        entityType: 'OnboardingEvent',
        entityId: eventId,
        description: `Evento eliminado: ${event.title}`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar evento:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}