// lib/services/realtime-decision.service.ts
//
// Orquestador de la decisión IA en tiempo real al completar el form público.
//
// - `runRealtimeDecision` corre server-side dentro de after() en /api/form/complete:
//   dispara el pipeline del agente (o reusa un run existente del cron), deja que
//   el auto-approve haga su trabajo, y decide si corresponde el WhatsApp
//   'form_completed' (solo cuando el resultado NO es aprobado-auto-ejecutado,
//   para no contradecir el mensaje de 'capacitaciones').
// - `getDecisionStatusForSession` es la lectura pura que consume el polling
//   público (/api/form/decision-status). Nunca dispara trabajo LLM.
//
// Degradación garantizada: timeout, run FAILED, APPROVED sin auto-ejecutar o
// cualquier excepción → el postulante ve "en revisión". Nunca se bloquea.

import { WhatsAppMessageSource, WhatsAppMessageType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { runAgentForDriver, type PublicCheck } from '@/lib/services/agent.service'
import { sendTemplateByKey } from '@/lib/services/whatsapp-messenger.service'
import { checkEligibility } from '@/lib/services/onboarding-eligibility'
import { getOrCreateActiveSession } from '@/lib/services/public-booking-session.service'

const FORM_COMPLETED_TEMPLATE_KEY = 'form_completed'
const REALTIME_TRIGGER = 'form:complete'

// Presupuesto para el run del agente dentro de after(). Si se agota, marcamos
// los runs colgados como FAILED (anti-zombie: un run eternamente RUNNING
// bloquearía el retry del cron y la idempotencia lo reusaría para siempre).
const AGENT_RACE_BUDGET_MS = 45_000
// Si el cron arrancó un run justo antes del complete, esperamos su resolución
// con un loop bounded en lugar de duplicar el trabajo (y el costo de Haiku).
const REUSED_RUN_WAIT_BUDGET_MS = 30_000
// Tras la decisión APPROVED, ventana para que el auto-approve termine de
// ejecutar (HTTP loopback + approveAllDocumentsForDriver + bot WhatsApp).
const AUTO_APPROVE_SETTLE_BUDGET_MS = 15_000
const POLL_INTERVAL_MS = 2_500
// Runs PENDING/RUNNING más viejos que esto se consideran zombies (función
// matada por Vercel) y no se reusan.
const STALE_RUN_MAX_AGE_MS = 10 * 60 * 1000

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

type ReusableRun = { id: string; status: string; decision: string | null }

async function findReusableRun(formDriverId: string): Promise<ReusableRun | null> {
  // Preferir siempre un run resuelto sobre uno en vuelo o FAILED: con runs
  // duplicados (cron vs realtime) el más útil es el que ya tiene decisión.
  const resolved = await prisma.agentRun.findFirst({
    where: { formDriverId, mode: 'REAL', status: { in: ['COMPLETED', 'NEEDS_REVIEW'] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, decision: true },
  })
  if (resolved) return resolved

  return prisma.agentRun.findFirst({
    where: {
      formDriverId,
      mode: 'REAL',
      status: { in: ['PENDING', 'RUNNING'] },
      createdAt: { gt: new Date(Date.now() - STALE_RUN_MAX_AGE_MS) },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, decision: true },
  })
}

/** Espera (bounded) a que un run en vuelo resuelva. Devuelve el estado final visto. */
async function waitForRunResolution(runId: string, budgetMs: number): Promise<ReusableRun | null> {
  const deadline = Date.now() + budgetMs
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)
    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
      select: { id: true, status: true, decision: true },
    })
    if (!run) return null
    if (run.status !== 'PENDING' && run.status !== 'RUNNING') return run
  }
  return null
}

/**
 * Espera (bounded) a que documentsStatus llegue a APPROVED después de una
 * decisión APPROVED. Cubre la ventana decisión-persistida → auto-approve
 * ejecutado, que toma varios segundos (loopback + docs + bot Railway).
 */
async function waitForDocsApproved(formDriverId: string, budgetMs: number): Promise<boolean> {
  const deadline = Date.now() + budgetMs
  for (;;) {
    const driver = await prisma.formDriver.findUnique({
      where: { id: formDriverId },
      select: { documentsStatus: true },
    })
    if (driver?.documentsStatus === 'APPROVED') return true
    if (Date.now() >= deadline) return false
    await sleep(POLL_INTERVAL_MS)
  }
}

export async function runRealtimeDecision(formDriverId: string): Promise<void> {
  try {
    let finalRun = await findReusableRun(formDriverId)

    if (finalRun && (finalRun.status === 'PENDING' || finalRun.status === 'RUNNING')) {
      // El cron lo agarró en step 5/6 justo antes del complete: esperamos su
      // resolución en lugar de correr un segundo run (doble costo Haiku).
      finalRun = await waitForRunResolution(finalRun.id, REUSED_RUN_WAIT_BUDGET_MS)
    } else if (!finalRun) {
      // Re-chequeo inmediato antes de invocar para achicar la ventana de carrera
      // con el cron / doble POST de complete. No es atómico: aceptamos el riesgo
      // residual de un run duplicado — approveAllDocumentsForDriver y el lock
      // approvalNotifiedAt hacen el doble-approve inocuo.
      finalRun = await findReusableRun(formDriverId)
      if (finalRun && (finalRun.status === 'PENDING' || finalRun.status === 'RUNNING')) {
        finalRun = await waitForRunResolution(finalRun.id, REUSED_RUN_WAIT_BUDGET_MS)
      } else if (!finalRun) {
        const raced = await Promise.race([
          runAgentForDriver({ driverId: formDriverId, mode: 'REAL', triggeredBy: REALTIME_TRIGGER }),
          sleep(AGENT_RACE_BUDGET_MS).then(() => 'timeout' as const),
        ])
        if (raced === 'timeout') {
          // Anti-zombie: si el run sigue colgado lo marcamos FAILED para que el
          // polling degrade a 'review' y no quede RUNNING eterno. Si el pipeline
          // termina después (función todavía viva), su update pisa este FAILED
          // con la decisión real — mejor tarde que zombie.
          await prisma.agentRun.updateMany({
            where: { formDriverId, mode: 'REAL', status: { in: ['PENDING', 'RUNNING'] } },
            data: {
              status: 'FAILED',
              error: `timeout realtime (${AGENT_RACE_BUDGET_MS / 1000}s)`,
              completedAt: new Date(),
            },
          })
          finalRun = null
        } else {
          finalRun = {
            id: raced.agentRunId,
            status: raced.error ? 'FAILED' : 'COMPLETED',
            decision: raced.decision,
          }
        }
      }
    }

    // WhatsApp form_completed post-decisión: solo si el resultado NO terminó en
    // aprobado-auto-ejecutado (en ese caso el postulante ya recibió el template
    // 'capacitaciones' desde approveAllDocumentsForDriver, con su lock
    // approvalNotifiedAt).
    if (finalRun?.decision === 'APPROVED') {
      const settled = await waitForDocsApproved(formDriverId, AUTO_APPROVE_SETTLE_BUDGET_MS)
      if (settled) return
    }

    const driver = await prisma.formDriver.findUnique({
      where: { id: formDriverId },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        fullName: true,
        documentsStatus: true,
      },
    })
    if (!driver) return
    if (driver.documentsStatus === 'APPROVED') return

    try {
      const result = await sendTemplateByKey(driver, FORM_COMPLETED_TEMPLATE_KEY, {
        source: WhatsAppMessageSource.TRIGGER,
        messageType: WhatsAppMessageType.APPLICATION_RECEIVED,
        step: 'form_completed',
      })
      if (result.status !== 'sent') {
        console.warn('[REALTIME_DECISION] bot no envió form_completed', {
          driverId: driver.id,
          result,
        })
      }
    } catch (err) {
      console.error('[REALTIME_DECISION] Error enviando WhatsApp form_completed', {
        driverId: driver.id,
        error: err instanceof Error ? err.message : err,
      })
    }
  } catch (err) {
    // El postulante ya recibió su respuesta HTTP; el polling degrada a 'review'.
    console.error('[REALTIME_DECISION] Error inesperado', {
      formDriverId,
      error: err instanceof Error ? err.message : err,
    })
  }
}

// ============================================================================
// Lectura del estado de la decisión para el polling público.
// ============================================================================

export type DecisionState = 'pending' | 'approved' | 'review' | 'rejected'

export interface DecisionStatusResult {
  state: DecisionState
  checks: PublicCheck[] | null
  booking: { shareToken: string } | null
  firstName: string | null
  lastName: string | null
}

export async function getDecisionStatusForSession(
  sessionId: string,
): Promise<DecisionStatusResult | null> {
  const submission = await prisma.formSubmission.findUnique({
    where: { sessionId },
    select: { formDriverId: true },
  })
  if (!submission?.formDriverId) return null
  const formDriverId = submission.formDriverId

  const driver = await prisma.formDriver.findUnique({
    where: { id: formDriverId },
    select: {
      status: true,
      documentsStatus: true,
      firstName: true,
      lastName: true,
      assistedCompletion: true,
      documents: { select: { documentType: true, status: true } },
    },
  })
  if (!driver) return null

  const base = { firstName: driver.firstName, lastName: driver.lastName }

  // Ignorar runs DRY_RUN (botón admin) y preferir un run resuelto sobre el más
  // reciente FAILED/en-vuelo cuando hay duplicados.
  const run =
    (await prisma.agentRun.findFirst({
      where: { formDriverId, mode: 'REAL', status: { in: ['COMPLETED', 'NEEDS_REVIEW'] } },
      orderBy: { createdAt: 'desc' },
      select: { status: true, decision: true, publicChecks: true },
    })) ??
    (await prisma.agentRun.findFirst({
      where: { formDriverId, mode: 'REAL' },
      orderBy: { createdAt: 'desc' },
      select: { status: true, decision: true, publicChecks: true },
    }))

  if (!run || run.status === 'PENDING' || run.status === 'RUNNING') {
    return { state: 'pending', checks: null, booking: null, ...base }
  }
  if (run.status === 'FAILED') {
    return { state: 'review', checks: null, booking: null, ...base }
  }

  const checks = (run.publicChecks as PublicCheck[] | null) ?? null

  if (run.decision === 'REJECTED') {
    return { state: 'rejected', checks, booking: null, ...base }
  }
  if (run.decision === 'APPROVED') {
    const eligibility = checkEligibility({
      status: driver.status,
      documentsStatus: driver.documentsStatus,
      firstName: driver.firstName,
      lastName: driver.lastName,
      documents: driver.documents,
      assistedCompletion: driver.assistedCompletion,
    })
    if (eligibility.isEligible) {
      const session = await getOrCreateActiveSession(formDriverId)
      return {
        state: 'approved',
        checks,
        booking: { shareToken: session.shareToken },
        ...base,
      }
    }
    // Decisión APPROVED persistida pero el auto-approve todavía no ejecutó
    // (ventana de varios segundos: loopback + docs + bot). Devolvemos 'pending'
    // para que el cliente siga poleando; la degradación a 'review' la maneja el
    // budget de 45s del cliente.
    return { state: 'pending', checks: null, booking: null, ...base }
  }

  return { state: 'review', checks, booking: null, ...base }
}
