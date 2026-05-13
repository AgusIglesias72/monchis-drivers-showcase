// app/api/postulacion/[token]/capacitaciones/select/route.ts
// POST - Seleccionar evento de capacitación

import { NextRequest, NextResponse } from 'next/server'
import { selectCapacitacion } from '@/lib/services/portal-postulacion.service'
import { SelectCapacitacionSchema } from '@/lib/validators/portal.validators'
import { validateAccessToken } from '@/lib/services/portal-access.service'
import { logCapacitacionSelected } from '@/lib/services/portal-audit.service'
import { prisma } from '@/lib/prisma'

// Rate limiting
const requestCounts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(token: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const record = requestCounts.get(`select:${token}`)

  if (!record || now > record.resetAt) {
    requestCounts.set(`select:${token}`, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Rate limit: 30 requests por hora (para prevenir spam)
    if (!checkRateLimit(token, 30, 3600000)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.' },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Validar token y obtener driver
    const driver = await validateAccessToken(token)

    // Validar datos
    const { eventId } = SelectCapacitacionSchema.parse(body)

    // Obtener info del evento completa
    const event = await prisma.onboardingEvent.findUnique({
      where: { id: eventId },
      select: {
        scheduledDate: true,
        startTime: true,
        endTime: true,
        location: true,
        locationAddress: true,
        meetingLink: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    // Seleccionar capacitación
    const assignment = await selectCapacitacion(token, eventId)

    // Crear audit log
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await logCapacitacionSelected(
      driver.id,
      assignment.id,
      eventId,
      event.scheduledDate,
      ipAddress,
      userAgent
    )

    // Decisión de producto: NO mandamos confirmación de reserva por WhatsApp.
    // El cliente ya está en el portal cuando reserva (acción user-initiated) y
    // ve el ActiveBookingCard con fecha/horario/dirección. Para Google Calendar
    // o .ics tiene el link "Ver detalles" → /capacitaciones/reserva/<token>.

    return NextResponse.json({
      success: true,
      message: 'Capacitación seleccionada exitosamente',
      assignment,
    })
  } catch (error: any) {
    console.error('Error en POST /api/postulacion/[token]/capacitaciones/select:', error)

    // Validación fallida
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    // Errores de negocio
    if (
      error.message.includes('documentos aprobados') ||
      error.message.includes('no está disponible') ||
      error.message.includes('no tiene cupos') ||
      error.message.includes('ya asignado')
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
      { error: error.message || 'Error al seleccionar capacitación' },
      { status: 500 }
    )
  }
}
