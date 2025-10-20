// app/api/onboarding/actions/send-reminders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'


// ============================================================
// app/api/onboarding/actions/send-reminders/route.ts
// ============================================================

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
    const { eventId } = body

    if (!eventId) {
      return NextResponse.json({ error: 'eventId es requerido' }, { status: 400 })
    }

    const event = await prisma.onboardingEvent.findUnique({
      where: { id: eventId },
      include: {
        attendees: {
          where: {
            status: { in: ['INVITED', 'CONFIRMED'] },
            reminderSent: false
          },
          include: {
            formDriver: {
              select: {
                fullName: true,
                phoneNumber: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    if (event.reminderSent) {
      return NextResponse.json({ error: 'Los recordatorios ya fueron enviados' }, { status: 400 })
    }

    // TODO: Aquí integrarías con tu servicio de mensajería (WhatsApp, SMS, Email)
    // Por ahora solo marcaremos como enviados
    
    const attendeeIds = event.attendees.map(a => a.id)
    
    if (attendeeIds.length > 0) {
      await prisma.onboardingAttendee.updateMany({
        where: {
          id: { in: attendeeIds }
        },
        data: {
          reminderSent: true,
          reminderSentAt: new Date()
        }
      })

      await prisma.onboardingEvent.update({
        where: { id: eventId },
        data: {
          reminderSent: true,
          reminderSentAt: new Date()
        }
      })
    }

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: adminUser.clerkId,
        userEmail: adminUser.email,
        action: 'ONBOARDING_EVENT_UPDATED',
        actionType: 'UPDATE',
        entityType: 'OnboardingEvent',
        entityId: eventId,
        description: `Recordatorios enviados: ${event.title}`,
        metadata: {
          remindersSent: attendeeIds.length
        }
      }
    })

    return NextResponse.json({
      success: true,
      remindersSent: attendeeIds.length,
      message: `Se enviaron ${attendeeIds.length} recordatorio(s)`
    })
  } catch (error) {
    console.error('Error al enviar recordatorios:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}