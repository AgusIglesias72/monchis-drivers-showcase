// app/api/postulacion/[token]/route.ts
// GET - Obtener datos completos del portal

import { NextRequest, NextResponse } from 'next/server'
import { getPostulacionByToken } from '@/lib/services/portal-postulacion.service'

// Rate limiting simple en memoria
const requestCounts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(token: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const record = requestCounts.get(token)

  if (!record || now > record.resetAt) {
    requestCounts.set(token, { count: 1, resetAt: now + windowMs })
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

    // Rate limit: 60 requests por minuto
    if (!checkRateLimit(token, 60, 60000)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta nuevamente en un momento.' },
        { status: 429 }
      )
    }

    // Obtener datos del portal
    const data = await getPostulacionByToken(token)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('Error en GET /api/postulacion/[token]:', error)

    // Token inválido o no encontrado
    if (error.message === 'Token inválido' || error.message === 'Token no encontrado') {
      return NextResponse.json(
        { error: 'Acceso no autorizado. El link no es válido.' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Error al obtener datos' },
      { status: 500 }
    )
  }
}
