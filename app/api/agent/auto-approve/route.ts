// app/api/agent/auto-approve/route.ts
//
// Endpoint server-to-server que ejecuta una decisión APPROVED limpia del agente IA.
// Lo dispara `agent.service.ts` luego de un AgentRun en modo REAL cuando se cumplen
// todas las condiciones de auto-aprobación (ver criterios abajo).
//
// Auth: header `Authorization: Bearer ${CRON_SECRET}` — mismo secreto que los crons,
// porque el caller es server-side dentro del propio host (no admin UI).
//
// Idempotente: si las AgentActions del run ya no están todas en PROPOSED, se asume
// que ya fue ejecutado (manual o automáticamente) y devuelve `alreadyExecuted=true`
// sin tocar nada. El lock real del envío de aprobación sigue siendo `approvalNotifiedAt`.
//
// Criterios de auto-aprobación validados aquí (defensivo — el caller también filtra):
//  - mode = REAL
//  - decision = APPROVED
//  - Todas las AgentActions del run son `propose_approve_document`, el
//    `propose_send_whatsapp_template` con clave "capacitaciones" (que es la
//    plantilla estándar que el agente sugiere al aprobar limpio), o "pasajeras"
//    informativas (`propose_request_document_resubmission` / `escalate_to_admin`)
//    que un APPROVED puede acumular (aviso de RUC NO_ENCONTRADO, plantilla
//    capacitaciones inactiva). Las pasajeras NO se ejecutan: quedan PROPOSED
//    para el admin. Sin overrides: sin propose_update_driver_cedula ni
//    propose_waive_ruc_inactive.
//  - Hay al menos un `propose_approve_document` y todos los estándar están PROPOSED.
//
// Nota: las acciones `propose_send_whatsapp_template('capacitaciones')` se marcan
// como EXECUTED porque approveAllDocumentsForDriver ya dispara el bot WhatsApp
// con esa misma plantilla — la AgentAction queda como auditoría.

import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { approveAllDocumentsForDriver } from '@/lib/services/document-approval.service'

const ALLOWED_TOOLS = new Set(['propose_approve_document', 'propose_send_whatsapp_template'])
// Informativas que acompañan un APPROVED sin bloquear el auto-approve; no se ejecutan.
const PASSENGER_TOOLS = new Set(['propose_request_document_resubmission', 'escalate_to_admin'])
const ALLOWED_TEMPLATE_KEYS = new Set(['capacitaciones'])
const APPROVED_BY_TAG = 'agent:auto'

export async function POST(request: NextRequest) {
  const cronCheck = requireCronAuth(request)
  if (cronCheck) return cronCheck

  let body: { agentRunId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const agentRunId = body.agentRunId
  if (!agentRunId || typeof agentRunId !== 'string') {
    return NextResponse.json({ error: 'agentRunId requerido' }, { status: 400 })
  }

  const run = await prisma.agentRun.findUnique({
    where: { id: agentRunId },
    include: { actions: true },
  })

  if (!run) {
    return NextResponse.json({ error: 'AgentRun no encontrado' }, { status: 404 })
  }

  if (run.mode !== 'REAL') {
    return NextResponse.json(
      { error: 'AgentRun no está en modo REAL', mode: run.mode },
      { status: 409 },
    )
  }

  if (run.decision !== 'APPROVED') {
    return NextResponse.json(
      { error: 'AgentRun no tiene decision=APPROVED', decision: run.decision },
      { status: 409 },
    )
  }

  if (run.actions.length === 0) {
    return NextResponse.json(
      { error: 'AgentRun no tiene acciones propuestas' },
      { status: 409 },
    )
  }

  const disallowed = run.actions.filter(
    (a) => !ALLOWED_TOOLS.has(a.tool) && !PASSENGER_TOOLS.has(a.tool),
  )
  if (disallowed.length > 0) {
    return NextResponse.json(
      {
        error: 'AgentRun tiene acciones fuera del set permitido para auto-approve',
        disallowedTools: Array.from(new Set(disallowed.map((a) => a.tool))),
      },
      { status: 409 },
    )
  }

  if (!run.actions.some((a) => a.tool === 'propose_approve_document')) {
    return NextResponse.json(
      { error: 'AgentRun no tiene propose_approve_document — nada que auto-aprobar' },
      { status: 409 },
    )
  }

  // Para propose_send_whatsapp_template solo aceptamos plantillas conocidas (capacitaciones).
  // Cualquier otra plantilla sugerida por el agente requiere revisión humana.
  const badTemplate = run.actions.find((a) => {
    if (a.tool !== 'propose_send_whatsapp_template') return false
    const tk = (a.input as { templateKey?: string } | null)?.templateKey
    return !tk || !ALLOWED_TEMPLATE_KEYS.has(tk)
  })
  if (badTemplate) {
    const tk = (badTemplate.input as { templateKey?: string } | null)?.templateKey
    return NextResponse.json(
      {
        error: 'AgentRun sugiere una plantilla WhatsApp fuera del set permitido para auto-approve',
        templateKey: tk ?? null,
      },
      { status: 409 },
    )
  }

  // La idempotencia se decide sobre las acciones estándar: las pasajeras quedan
  // PROPOSED a propósito y no deben hacer parecer que el run ya fue ejecutado.
  const allProposed = run.actions
    .filter((a) => ALLOWED_TOOLS.has(a.tool))
    .every((a) => a.status === 'PROPOSED')
  if (!allProposed) {
    return NextResponse.json({
      ok: true,
      alreadyExecuted: true,
      agentRunId: run.id,
    })
  }

  let approvalResult
  try {
    approvalResult = await approveAllDocumentsForDriver(run.formDriverId)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[agent:auto-approve] Falló aprobación', {
      agentRunId,
      driverId: run.formDriverId,
      error: errMsg,
    })
    await prisma.agentAction.updateMany({
      where: { agentRunId: run.id, status: 'PROPOSED', tool: { in: Array.from(ALLOWED_TOOLS) } },
      data: {
        status: 'FAILED',
        executionError: errMsg,
        executedAt: new Date(),
      },
    })
    return NextResponse.json(
      { error: 'Falló la aprobación masiva', detail: errMsg },
      { status: 500 },
    )
  }

  const now = new Date()
  await prisma.agentAction.updateMany({
    where: { agentRunId: run.id, status: 'PROPOSED', tool: { in: Array.from(ALLOWED_TOOLS) } },
    data: {
      status: 'EXECUTED',
      approvedBy: APPROVED_BY_TAG,
      approvedAt: now,
      executedAt: now,
      executionResult: {
        autoApproved: true,
        documentsApproved: approvalResult.documentsApproved,
        documentsTotal: approvalResult.documentsTotal,
        notificationTriggered: approvalResult.notificationTriggered,
        notificationStatus: approvalResult.notificationStatus,
      },
    },
  })

  console.log('[agent:auto-approve] OK', {
    agentRunId,
    driverId: run.formDriverId,
    actions: run.actions.length,
    notification: approvalResult.notificationStatus ?? 'not-triggered',
  })

  return NextResponse.json({
    ok: true,
    agentRunId: run.id,
    ...approvalResult,
  })
}
