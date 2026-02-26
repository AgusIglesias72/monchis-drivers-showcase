// app/api/postulacion/[token]/capacitaciones/route.ts
// GET - Listar eventos de capacitación disponibles

import { NextRequest, NextResponse } from 'next/server'
import { getAvailableCapacitaciones } from '@/lib/services/portal-postulacion.service'

// Rate limiting
const requestCounts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(token: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const record = requestCounts.get(`capacitaciones:${token}`)

  if (!record || now > record.resetAt) {
    requestCounts.set(`capacitaciones:${token}`, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

export async function GET(
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

    // Obtener eventos disponibles
    const result = await getAvailableCapacitaciones(token)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('Error en GET /api/postulacion/[token]/capacitaciones:', error)

    // Token inválido
    if (error.message === 'Token inválido' || error.message === 'Token no encontrado') {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 401 })
    }

    return NextResponse.json(
      { error: error.message || 'Error al obtener capacitaciones' },
      { status: 500 }
    )
  }
}
