// app/api/onboarding/actions/complete-event/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

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
    const { eventId, notes } = body

    if (!eventId) {
      return NextResponse.json({ error: 'eventId es requerido' }, { status: 400 })
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

    if (event.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Este evento ya está completado' }, { status: 400 })
    }

    // Actualizar estado del evento
    const updatedEvent = await prisma.onboardingEvent.update({
      where: { id: eventId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedBy: adminUser.id,
        notes: notes || event.notes,
      }
    })

    // Actualizar estado de drivers que asistieron
    const attendedDriverIds = event.attendees
      .filter(a => a.status === 'ATTENDED')
      .map(a => a.formDriverId)

    if (attendedDriverIds.length > 0) {
      await prisma.formDriver.updateMany({
        where: {
          id: { in: attendedDriverIds }
        },
        data: {
          onboardingStatus: 'COMPLETED',
          onboardingCompletedAt: new Date(),
        }
      })
    }

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: adminUser.clerkId,
        userEmail: adminUser.email,
        action: 'ONBOARDING_EVENT_COMPLETED',
        actionType: 'UPDATE',
        entityType: 'OnboardingEvent',
        entityId: eventId,
        description: `Evento completado: ${event.title}`,
        metadata: {
          attendedCount: attendedDriverIds.length,
          totalAttendees: event.attendees.length
        }
      }
    })

    return NextResponse.json({
      success: true,
      event: updatedEvent,
      driversCompleted: attendedDriverIds.length
    })
  } catch (error) {
    console.error('Error al completar evento:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

