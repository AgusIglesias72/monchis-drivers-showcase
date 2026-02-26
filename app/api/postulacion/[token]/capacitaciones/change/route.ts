// app/api/postulacion/[token]/capacitaciones/change/route.ts
// PUT - Cambiar evento de capacitación

import { NextRequest, NextResponse } from 'next/server'
import { changeCapacitacion } from '@/lib/services/portal-postulacion.service'
import { SelectCapacitacionSchema } from '@/lib/validators/portal.validators'
import { validateAccessToken } from '@/lib/services/portal-access.service'
import { logCapacitacionChanged } from '@/lib/services/portal-audit.service'
import { sendCapacitacionChanged } from '@/lib/services/portal-whatsapp.service'
import { prisma } from '@/lib/prisma'

// Rate limiting
const requestCounts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(token: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const record = requestCounts.get(`change:${token}`)

  if (!record || now > record.resetAt) {
    requestCounts.set(`change:${token}`, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Rate limit: 30 requests por hora
    if (!checkRateLimit(token, 30, 3600000)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.' },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Validar token y obtener driver
    const driver = await validateAccessToken(token)

    // Obtener la asignación actual
    const currentAssignment = await prisma.onboardingAttendee.findFirst({
      where: {
        formDriverId: driver.id,
        status: { in: ['SCHEDULED', 'ATTENDED'] },
      },
      include: { event: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!currentAssignment) {
      return NextResponse.json(
        { error: 'No tienes una capacitación asignada para cambiar' },
        { status: 400 }
      )
    }

    // Validar datos (reusar el mismo schema que select)
    const { eventId: newEventId } = SelectCapacitacionSchema.parse(body)

    // Obtener info completa del nuevo evento
    const newEvent = await prisma.onboardingEvent.findUnique({
      where: { id: newEventId },
      select: {
        scheduledDate: true,
        startTime: true,
        endTime: true,
        location: true,
        locationAddress: true,
        meetingLink: true,
      },
    })

    if (!newEvent) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    // Cambiar capacitación
    const result = await changeCapacitacion(token, newEventId)

    // Crear audit log
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await logCapacitacionChanged(
      driver.id,
      result.newAssignment.id,
      currentAssignment.eventId,
      newEventId,
      currentAssignment.event.scheduledDate,
      newEvent.scheduledDate,
      ipAddress,
      userAgent
    )

    // Enviar mensaje WhatsApp de confirmación del cambio
    try {
      const firstName = driver.firstName || driver.fullName?.split(' ')[0] || 'Postulante'

      await sendCapacitacionChanged(
        driver.phoneNumber,
        firstName,
        driver.id,
        {
          scheduledDate: currentAssignment.event.scheduledDate,
          startTime: currentAssignment.event.startTime,
        },
        {
          scheduledDate: newEvent.scheduledDate,
          startTime: newEvent.startTime,
          endTime: newEvent.endTime || undefined,
          location: newEvent.location || '',
          locationAddress: newEvent.locationAddress || '',
          meetingLink: newEvent.meetingLink || undefined,
        }
      )

      console.log(`✅ [PORTAL] Mensaje de cambio de capacitación enviado a ${driver.phoneNumber}`)
    } catch (whatsappError) {
      console.error('Error al enviar mensaje de WhatsApp:', whatsappError)
      // No fallar la operación si falla el WhatsApp
    }

    return NextResponse.json({
      success: true,
      message: 'Capacitación cambiada exitosamente',
      ...result,
    })
  } catch (error: any) {
    console.error('Error en PUT /api/postulacion/[token]/capacitaciones/change:', error)

    // Validación fallida
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    // Errores de negocio
    if (
      error.message.includes('No tienes una capacitación asignada') ||
      error.message.includes('Ya estás asignado a este evento') ||
      error.message.includes('no está disponible') ||
      error.message.includes('no tiene cupos')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Evento no encontrado
    if (error.message === 'Evento no encontrado') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    // Token inválido
    if (error.message === 'Token inválido' || error.message === 'Token no encontrado') {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 401 })
    }

    return NextResponse.json(
      { error: error.message || 'Error al cambiar capacitación' },
      { status: 500 }
    )
  }
}
