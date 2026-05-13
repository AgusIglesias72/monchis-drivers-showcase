// app/api/admin/postulaciones/[id]/run-agent/route.ts
//
// Dispara el agente IA sobre una postulación puntual.
// - Modo DRY_RUN (default): simula, no persiste acciones ni ejecuta tools reales.
// - Modo REAL: crea AgentActions con status=PROPOSED para que un admin apruebe.

import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runAgentForDriver } from '@/lib/services/agent.service'

interface Body {
  mode?: 'DRY_RUN' | 'REAL'
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireAdminApi()
    if (!guard.ok) return guard.response
    const adminUser = guard.user

    const { id } = await params
    let body: Body = {}
    try {
      body = (await request.json()) as Body
    } catch {
      // body vacío → defaults
    }

    const mode = body.mode === 'REAL' ? 'REAL' : 'DRY_RUN'

    // Validar que la postulación existe antes de invocar al agente
    const driver = await prisma.formDriver.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!driver) {
      return NextResponse.json({ error: 'Postulación no encontrada' }, { status: 404 })
    }

    const result = await runAgentForDriver({
      driverId: id,
      mode,
      triggeredBy: adminUser.clerkId,
    })

    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error('[run-agent] Error:', err)
    return NextResponse.json(
      { error: 'Error al correr el agente', detail: err?.message ?? 'unknown' },
      { status: 500 },
    )
  }
}
