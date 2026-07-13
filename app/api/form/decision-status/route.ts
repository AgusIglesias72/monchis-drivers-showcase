// app/api/form/decision-status/route.ts
//
// Polling de solo-lectura del estado de la decisión IA post-submit del form
// público. No dispara trabajo LLM (eso vive en after() de /api/form/complete).
// El sessionId es el mismo UUID secreto que ya autentica submit-step/complete.

import { NextRequest, NextResponse } from 'next/server'
import { getDecisionStatusForSession } from '@/lib/services/realtime-decision.service'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Session ID requerido' }, { status: 400 })
    }

    const result = await getDecisionStatusForSession(sessionId)
    if (!result) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error en decision-status:', error)
    return NextResponse.json(
      { error: error.message || 'Error al consultar el estado' },
      { status: 500 },
    )
  }
}
