// app/api/onboarding/actions/dashboard/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'


export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Eventos próximos (siguientes 30 días)
    const upcomingEvents = await prisma.onboardingEvent.findMany({
      where: {
        scheduledDate: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      },
      include: {
        attendees: {
          where: {
            status: { in: ['INVITED', 'CONFIRMED', 'ATTENDED'] }
          }
        },
        organizerUser: {
          select: {
            fullName: true,
            email: true
          }
        }
      },
      orderBy: { scheduledDate: 'asc' },
      take: 10
    })

    // Eventos completados recientes
    const recentCompleted = await prisma.onboardingEvent.count({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: thirtyDaysAgo }
      }
    })

    // Drivers pendientes de onboarding
    // ✅ CORREGIDO: Manejar null correctamente
    const pendingDrivers = await prisma.formDriver.count({
      where: {
        documentsStatus: 'APPROVED',
        OR: [
          { onboardingStatus: null },
          { onboardingStatus: { in: ['READY', 'NOT_READY'] } }
        ]
      }
    })

    // Drivers en proceso de onboarding
    const inProgressDrivers = await prisma.formDriver.count({
      where: {
        onboardingStatus: 'SCHEDULED'
      }
    })

    // Tasa de asistencia (últimos 30 días)
    const completedEvents = await prisma.onboardingEvent.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: thirtyDaysAgo }
      },
      include: {
        attendees: true
      }
    })

    const totalInvited = completedEvents.reduce(
      (sum, event) => sum + event.attendees.length, 0
    )
    const totalAttended = completedEvents.reduce(
      (sum, event) => sum + event.attendees.filter(a => a.status === 'ATTENDED').length, 0
    )
    const attendanceRate = totalInvited > 0 
      ? Math.round((totalAttended / totalInvited) * 100) 
      : 0

    // No shows recientes
    const recentNoShows = await prisma.onboardingAttendee.count({
      where: {
        status: 'NO_SHOW',
        markedNoShowAt: { gte: thirtyDaysAgo }
      }
    })

    return NextResponse.json({
      upcomingEvents,
      stats: {
        recentCompleted,
        pendingDrivers,
        inProgressDrivers,
        attendanceRate,
        recentNoShows,
      }
    })
  } catch (error) {
    console.error('Error al obtener dashboard:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
