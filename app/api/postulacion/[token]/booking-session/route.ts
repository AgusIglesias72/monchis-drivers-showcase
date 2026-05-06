// app/api/postulacion/[token]/booking-session/route.ts
//
// POST: emite o reusa un PublicBookingSession para el postulante autenticado vía
// el accessToken legacy del portal viejo. Es el camino de recovery cuando el
// postulante pierde el link de WhatsApp. Devuelve `{ shareToken, redirectUrl }`
// con la URL pública del nuevo flow de capacitaciones.

import { NextRequest, NextResponse } from 'next/server'
import { validateAccessToken } from '@/lib/services/portal-access.service'
import { getOrCreateActiveSession } from '@/lib/services/public-booking-session.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    if (!token) return NextResponse.json({ error: 'token requerido' }, { status: 400 })

    const formDriver = await validateAccessToken(token)

    // Eligibility (mismo criterio que el resto del flujo).
    if (formDriver.status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Tu postulación fue rechazada' },
        { status: 403 },
      )
    }
    const cedulaOk = formDriver.documents.some(
      (d) => d.documentType === 'CEDULA' && d.status === 'APPROVED',
    )
    const criminalOk = formDriver.documents.some(
      (d) => d.documentType === 'CRIMINAL_RECORD' && d.status === 'APPROVED',
    )
    if (!cedulaOk || !criminalOk || !formDriver.firstName || !formDriver.lastName) {
      return NextResponse.json(
        { error: 'Completá tus datos y tené cédula y antecedentes aprobados antes de agendar' },
        { status: 403 },
      )
    }

    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      undefined
    const userAgent = request.headers.get('user-agent') || undefined

    const { shareToken, expiresAt, reused } = await getOrCreateActiveSession(
      formDriver.id,
      30,
      ipAddress,
      userAgent,
    )

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const redirectUrl = `${baseUrl}/capacitaciones?session=${shareToken}`

    return NextResponse.json({
      shareToken,
      expiresAt: expiresAt.toISOString(),
      reused,
      redirectUrl,
    })
  } catch (err: any) {
    if (err?.message === 'Token inválido' || err?.message === 'Token no encontrado') {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 401 })
    }
    console.error('[booking-session] error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Error desconocido' },
      { status: 500 },
    )
  }
}
