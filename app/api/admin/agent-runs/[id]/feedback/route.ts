// app/api/admin/agent-runs/[id]/feedback/route.ts
//
// Permite al admin marcar si la decisión del agente coincidió con la suya.
// Usado para medir accuracy y alimentar el cron de análisis semanal (Fase 2).

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import type { AgentFeedback } from '@prisma/client'

const VALID_FEEDBACKS: AgentFeedback[] = ['MATCHES', 'DOES_NOT_MATCH', 'PARTIAL']

interface Body {
  feedback: AgentFeedback | null
  note?: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = (await request.json()) as Body

    // Permitir limpiar feedback pasando null
    if (body.feedback !== null && !VALID_FEEDBACKS.includes(body.feedback as AgentFeedback)) {
      return NextResponse.json(
        { error: `feedback debe ser ${VALID_FEEDBACKS.join(' | ')} o null` },
        { status: 400 },
      )
    }

    const existing = await prisma.agentRun.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'AgentRun no encontrado' }, { status: 404 })
    }

    const updated = await prisma.agentRun.update({
      where: { id },
      data:
        body.feedback === null
          ? {
              humanFeedback: null,
              humanFeedbackNote: null,
              humanFeedbackBy: null,
              humanFeedbackAt: null,
            }
          : {
              humanFeedback: body.feedback,
              humanFeedbackNote: body.note?.trim() || null,
              humanFeedbackBy: userId,
              humanFeedbackAt: new Date(),
            },
      select: {
        id: true,
        humanFeedback: true,
        humanFeedbackNote: true,
        humanFeedbackBy: true,
        humanFeedbackAt: true,
      },
    })

    return NextResponse.json({ success: true, run: updated })
  } catch (err: any) {
    console.error('[agent-run-feedback] Error:', err)
    return NextResponse.json(
      { error: 'Error al guardar feedback', detail: err?.message ?? 'unknown' },
      { status: 500 },
    )
  }
}
