// app/api/onboarding/actions/eligible-drivers/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdminApi()
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    // Construir filtro de búsqueda
    const searchFilter = search ? {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phoneNumber: { contains: search } },
        { cedula: { contains: search } },
      ]
    } : {}

    // Obtener TODOS los drivers (no solo los aprobados)
    const [drivers, total] = await Promise.all([
      prisma.formDriver.findMany({
        where: {
          ...searchFilter,
        },
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          documentsStatus: true,
          onboardingStatus: true,
          onboardingScheduledAt: true,
          onboardingAttendances: {
            where: {
              status: { in: ['INVITED', 'CONFIRMED', 'ATTENDED', 'SCHEDULED'] }
            },
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  scheduledDate: true,
                  status: true,
                }
              }
            },
            orderBy: {
              invitedAt: 'desc'
            },
            take: 1,
          }
        },
        skip,
        take: limit,
        orderBy: [
          // Primero: con documentos aprobados
          { documentsStatus: 'desc' },
          // Segundo: sin onboarding asignado
          { onboardingStatus: 'asc' },
          // Tercero: por fecha de última actividad
          { lastActivityAt: 'desc' }
        ]
      }),
      prisma.formDriver.count({
        where: {
          ...searchFilter,
        }
      })
    ])

    // Formatear respuesta con información de asignación
    const driversWithAssignment = drivers.map(driver => {
      const currentAttendance = driver.onboardingAttendances[0]
      const isAssignedToOtherEvent = currentAttendance && 
        currentAttendance.event.id !== eventId &&
        ['INVITED', 'CONFIRMED', 'ATTENDED', 'SCHEDULED'].includes(currentAttendance.status)

      // Determinar si el driver puede ser seleccionado
      // Solo pueden ser seleccionados si tienen documentos aprobados Y no están asignados a otro evento
      const canBeSelected = driver.documentsStatus === 'APPROVED' && !isAssignedToOtherEvent

      return {
        id: driver.id,
        fullName: driver.fullName,
        phoneNumber: driver.phoneNumber,
        email: driver.email,
        documentsStatus: driver.documentsStatus,
        onboardingStatus: driver.onboardingStatus,
        onboardingScheduledAt: driver.onboardingScheduledAt,
        isAssignedToOtherEvent,
        canBeSelected,
        disabledReason: !canBeSelected 
          ? (driver.documentsStatus !== 'APPROVED' 
              ? 'Documentos no aprobados' 
              : 'Ya asignado a otro evento')
          : null,
        assignedEvent: isAssignedToOtherEvent ? {
          id: currentAttendance.event.id,
          title: currentAttendance.event.title,
          scheduledDate: currentAttendance.event.scheduledDate,
        } : null,
      }
    })

    // Si se proporciona eventId, filtrar los que ya están asignados a ESTE evento
    let filteredDrivers = driversWithAssignment
    if (eventId) {
      const existingAttendees = await prisma.onboardingAttendee.findMany({
        where: {
          eventId,
          status: { in: ['INVITED', 'CONFIRMED', 'ATTENDED', 'SCHEDULED', 'RESCHEDULED'] }
        },
        select: { formDriverId: true }
      })

      const assignedIds = new Set(existingAttendees.map(a => a.formDriverId))
      filteredDrivers = driversWithAssignment.filter(driver => !assignedIds.has(driver.id))
    }

    return NextResponse.json({
      drivers: filteredDrivers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      }
    })
  } catch (error) {
    console.error('Error al obtener drivers elegibles:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}