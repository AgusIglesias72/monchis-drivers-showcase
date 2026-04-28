// app/api/cron/process-completed-postulations/route.ts
//
// Cron que dispara el agente IA sobre postulaciones que ya tienen documentos
// cargados. Procesa dos tipos de candidatos:
//
// 1) Recién completadas (status=COMPLETED): completedAt entre 5 y 60 min atrás.
//    El delay le da margen al postulante a corregir docs en el portal.
//
// 2) En curso, paradas en step 5 o 6 (status=IN_PROGRESS): step 4 es la carga
//    de documentos, así que en step 5/6 los archivos ya están subidos. Usamos
//    lastActivityAt entre 5 min y 24 h atrás para no agarrar postulantes que
//    están todavía interactuando, y procesar el backlog que se quedó sin
//    completar.
//
// Idempotente en ambos casos via `agentRuns: { none: {} }`. Modo REAL: las
// acciones quedan PROPOSED para que el admin las apruebe en la UI.
//
// Schedule sugerido: cada 10 minutos.
// Vercel maxDuration: 300s (5 min) — alcanza para 15 corridas a ~15s c/u.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runAgentForDriver } from '@/lib/services/agent.service'

export const maxDuration = 300

const PROCESSING_DELAY_MINUTES = 5
const MAX_AGE_MINUTES = 60
const IN_PROGRESS_MAX_AGE_HOURS = 24
const BATCH_LIMIT = 15

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const upperBound = new Date(now.getTime() - PROCESSING_DELAY_MINUTES * 60 * 1000)
  const completedLowerBound = new Date(now.getTime() - MAX_AGE_MINUTES * 60 * 1000)
  const inProgressLowerBound = new Date(
    now.getTime() - IN_PROGRESS_MAX_AGE_HOURS * 60 * 60 * 1000,
  )

  console.log('[cron:process-completed-postulations] Buscando candidatos', {
    completedBetween: {
      from: completedLowerBound.toISOString(),
      to: upperBound.toISOString(),
    },
    inProgressStep5_6Between: {
      from: inProgressLowerBound.toISOString(),
      to: upperBound.toISOString(),
    },
    delay: `${PROCESSING_DELAY_MINUTES}min`,
    completedMaxAge: `${MAX_AGE_MINUTES}min`,
    inProgressMaxAge: `${IN_PROGRESS_MAX_AGE_HOURS}h`,
  })

  const candidates = await prisma.formDriver.findMany({
    where: {
      agentRuns: { none: {} },
      OR: [
        {
          status: 'COMPLETED',
          completedAt: { gte: completedLowerBound, lte: upperBound },
        },
        {
          status: 'IN_PROGRESS',
          currentStep: { in: [5, 6] },
          lastActivityAt: { gte: inProgressLowerBound, lte: upperBound },
        },
      ],
    },
    select: {
      id: true,
      fullName: true,
      firstName: true,
      cedula: true,
      status: true,
      currentStep: true,
      completedAt: true,
      lastActivityAt: true,
    },
    orderBy: { lastActivityAt: 'asc' },
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
    const tag = driver.status === 'COMPLETED' ? 'completed' : `step${driver.currentStep}`
    try {
      const r = await runAgentForDriver({
        driverId: driver.id,
        mode: 'REAL',
        triggeredBy: 'cron:process-completed-postulations',
      })
      totalCostMicroUsd += r.metrics.costMicroUsd
      results.push({ id: driver.id, name, decision: r.decision })
      console.log(
        `[cron:${tag}] ${name} (${driver.cedula}) → ${r.decision} (${r.actions.length} acciones)`,
      )
    } catch (err: any) {
      const errMsg = err?.message ?? 'Error desconocido'
      results.push({ id: driver.id, name, decision: null, error: errMsg })
      console.error(`[cron:${tag}] ${name} (${driver.cedula}) → FAIL: ${errMsg}`)
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
