// app/api/cron/process-completed-postulations/route.ts
//
// Cron que dispara el agente IA sobre postulaciones recién completadas.
// - Espera 5 minutos desde el complete para darle margen al postulante (puede
//   estar todavía corrigiendo/subiendo documentos en el portal).
// - Solo procesa las que NO tienen AgentRun previo (idempotente).
// - Cota superior de 1 hora atrás: si el cron se cae más tiempo, no procesa
//   un backlog viejo automáticamente. Usar el script `run-agent-on-recent`
//   para procesar manualmente postulaciones más antiguas.
// - Modo REAL: las acciones quedan persistidas como PROPOSED para que el
//   admin las apruebe en la UI.
//
// Schedule sugerido: cada 10 minutos.
// Vercel maxDuration: 300s (5 min) — alcanza para 15 corridas a ~15s c/u.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runAgentForDriver } from '@/lib/services/agent.service'

export const maxDuration = 300

const PROCESSING_DELAY_MINUTES = 5
const MAX_AGE_MINUTES = 60
const BATCH_LIMIT = 15

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const upperBound = new Date(now.getTime() - PROCESSING_DELAY_MINUTES * 60 * 1000)
  const lowerBound = new Date(now.getTime() - MAX_AGE_MINUTES * 60 * 1000)

  console.log('[cron:process-completed-postulations] Buscando candidatos', {
    completedBetween: { from: lowerBound.toISOString(), to: upperBound.toISOString() },
    delay: `${PROCESSING_DELAY_MINUTES}min`,
    maxAge: `${MAX_AGE_MINUTES}min`,
  })

  const candidates = await prisma.formDriver.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: lowerBound, lte: upperBound },
      agentRuns: { none: {} },
    },
    select: { id: true, fullName: true, firstName: true, cedula: true, completedAt: true },
    orderBy: { completedAt: 'asc' },
    take: BATCH_LIMIT,
  })

  if (candidates.length === 0) {
    console.log('[cron:process-completed-postulations] Sin candidatos.')
    return NextResponse.json({ success: true, processed: 0, message: 'Sin candidatos' })
  }

  console.log(`[cron:process-completed-postulations] ${candidates.length} candidatos a procesar`)

  const results: Array<{ id: string; name: string; decision: string | null; error?: string }> = []
  let totalCostMicroUsd = 0

  for (const driver of candidates) {
    const name = (driver.fullName || driver.firstName || '').trim()
    try {
      const r = await runAgentForDriver({
        driverId: driver.id,
        mode: 'REAL',
        triggeredBy: 'cron:process-completed-postulations',
      })
      totalCostMicroUsd += r.metrics.costMicroUsd
      results.push({ id: driver.id, name, decision: r.decision })
      console.log(`[cron] ${name} (${driver.cedula}) → ${r.decision} (${r.actions.length} acciones)`)
    } catch (err: any) {
      const errMsg = err?.message ?? 'Error desconocido'
      results.push({ id: driver.id, name, decision: null, error: errMsg })
      console.error(`[cron] ${name} (${driver.cedula}) → FAIL: ${errMsg}`)
    }
  }

  // Resumen para el log
  const decisionCounts: Record<string, number> = {}
  for (const r of results) {
    const k = r.decision ?? 'ERROR'
    decisionCounts[k] = (decisionCounts[k] ?? 0) + 1
  }

  console.log('[cron:process-completed-postulations] Resumen', {
    total: results.length,
    byDecision: decisionCounts,
    costUsd: (totalCostMicroUsd / 1_000_000).toFixed(4),
  })

  return NextResponse.json({
    success: true,
    processed: results.length,
    decisionCounts,
    costUsd: totalCostMicroUsd / 1_000_000,
    results,
  })
}
