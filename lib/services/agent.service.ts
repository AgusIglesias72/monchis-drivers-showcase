// lib/services/agent.service.ts
//
// Servicio del agente IA para procesar postulaciones.
//
// - Sprint 1 (actual): stub que devuelve NEEDS_REVIEW siempre. Sirve de andamiaje
//   para que el botón "Correr agente" y la UI funcionen sin LLM real.
// - Sprint 2: pipeline determinista que llama a Haiku Vision para validar documentos
//   y decide con if/else.
// - Sprint 3: loop de tool use real con prompt caching.
//
// Filosofía "draft + aprobación humana": en modo REAL el agente crea AgentActions
// con status=PROPOSED. Solo un admin ejecuta. En DRY_RUN nada se persiste fuera
// del AgentRun histórico.

import { prisma } from '@/lib/prisma'
import type { AgentRunDecision, AgentRunMode, Prisma } from '@prisma/client'
import { checkRucStatus, normalizeCedula, isForeignCedula } from '@/lib/services/turuc.service'
import {
  validateDriverDocuments,
  HAIKU_MODEL,
  type ImageValidationResult,
} from '@/lib/services/agent-vision.service'
import { getActiveOverride } from '@/lib/services/agent-config.service'

export type ProposedToolCall =
  | { tool: 'propose_approve_document'; input: { documentId: string }; reasoning?: string }
  | { tool: 'propose_reject_document'; input: { documentId: string; reason: string }; reasoning?: string }
  | { tool: 'propose_waive_ruc_inactive'; input: { note: string }; reasoning?: string }
  | {
      tool: 'propose_send_whatsapp_template'
      input: { templateKey: string; variables: Record<string, string> }
      reasoning?: string
    }
  | {
      tool: 'propose_request_document_resubmission'
      input: {
        documentType: 'CEDULA' | 'CRIMINAL_RECORD' | 'TAX_COMPLIANCE'
        reason: string
        whatsappMessage: string
      }
      reasoning?: string
    }
  | {
      tool: 'propose_update_driver_cedula'
      input: {
        currentCedula: string
        correctedCedula: string
        extractedFullName: string | null
        reason: string
      }
      reasoning?: string
    }
  | { tool: 'escalate_to_admin'; input: { reason: string }; reasoning?: string }

// ============================================================================
// Public checks: feedback apto para mostrar al postulante en la pantalla
// post-submit del form público. Los motivos salen SIEMPRE de un catálogo fijo
// es-PY — nunca texto libre del modelo hacia el postulante.
// ============================================================================

export type PublicCheckKey = 'identidad' | 'antecedentes' | 'ruc'
export type PublicCheckStatus = 'ok' | 'warn' | 'fail'
export interface PublicCheck {
  key: PublicCheckKey
  status: PublicCheckStatus
  motive: string
}

const PUBLIC_CHECK_MSG = {
  ok: 'Sin observaciones',
  generic: 'Necesitamos revisar este punto manualmente',
  cedulaMissing: 'Falta la foto de tu cédula',
  cedulaUnreadable: 'No pudimos leer bien las fotos de tu cédula',
  cedulaMismatch: 'Los datos de tu cédula no coinciden con los del formulario',
  cedulaWrongType: 'El archivo que subiste no corresponde a una cédula',
  cedulaObservations: 'Encontramos observaciones en la foto de tu cédula',
  criminalMissing: 'Falta tu certificado de antecedentes',
  criminalExpired: 'Tu certificado de antecedentes tiene más de 90 días',
  criminalUnreadable: 'No pudimos leer tu certificado de antecedentes',
  criminalObservations: 'El certificado de antecedentes presenta observaciones',
  criminalWrongType: 'El archivo que subiste no corresponde al certificado de antecedentes',
  rucObservations: 'Tu RUC figura con observaciones en la SET',
  rucBlocking:
    'Tu RUC figura cancelado o bloqueado en la SET — necesitás regularizarlo para poder facturar',
} as const

export interface AgentRunResult {
  agentRunId: string
  decision: AgentRunDecision | null
  summary: string
  reasoning: string
  actions: ProposedToolCall[]
  publicChecks: PublicCheck[]
  metrics: {
    iterations: number
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
    costMicroUsd: number
  }
  model: string | null
  error?: string
}

interface RunAgentParams {
  driverId: string
  mode: AgentRunMode
  triggeredBy: string
}

/**
 * Punto de entrada principal del agente.
 * Crea el AgentRun, invoca la lógica del agente y persiste resultados.
 */
export async function runAgentForDriver(params: RunAgentParams): Promise<AgentRunResult> {
  const { driverId, mode, triggeredBy } = params

  // Crear AgentRun en estado PENDING
  const run = await prisma.agentRun.create({
    data: {
      formDriverId: driverId,
      status: 'PENDING',
      mode,
      triggeredBy,
    },
  })

  try {
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    })

    // Traer el contexto completo del driver
    const driver = await prisma.formDriver.findUnique({
      where: { id: driverId },
      include: {
        documents: true,
        financialService: true,
        equipmentPayments: true,
      },
    })

    if (!driver) {
      throw new Error(`FormDriver ${driverId} no encontrado`)
    }

    // Sprint 2: pipeline determinista.
    // 1. Chequea/refresca RUC.
    // 2. Valida imágenes de cédula (frente + dorso) + antecedentes con Haiku.
    // 3. Decide con if/else.
    const result = await runDeterministicPipeline(driver)

    // Persistir resultado en AgentRun
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: result.decision === 'NEEDS_REVIEW' ? 'NEEDS_REVIEW' : 'COMPLETED',
        decision: result.decision,
        summary: result.summary,
        reasoning: result.reasoning,
        iterations: result.metrics.iterations,
        inputTokens: result.metrics.inputTokens,
        outputTokens: result.metrics.outputTokens,
        cacheReadTokens: result.metrics.cacheReadTokens,
        cacheWriteTokens: result.metrics.cacheWriteTokens,
        costMicroUsd: result.metrics.costMicroUsd,
        model: result.model,
        publicChecks: result.publicChecks as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    })

    // Persistir las acciones propuestas en ambos modos.
    // - DRY_RUN: quedan como PROPOSED informativas (no se ejecutan).
    // - REAL: quedan como PROPOSED y el admin puede aprobarlas/ejecutarlas desde UI.
    // Esto permite que los runs históricos muestren correctamente qué propuso el agente.
    if (result.actions.length > 0) {
      await prisma.agentAction.createMany({
        data: result.actions.map((a) => ({
          agentRunId: run.id,
          tool: a.tool,
          input: a.input as Prisma.InputJsonValue,
          reasoning: a.reasoning ?? null,
          status: 'PROPOSED' as const,
        })),
      })
    }

    // Auto-aprobación cuando el agente decide APPROVED limpio desde un cron.
    // Criterios estrictos: REAL + cron + APPROVED + todas las actions son
    // propose_approve_document. Cualquier otra cosa queda PROPOSED para revisión
    // humana en la UI.
    await maybeTriggerAutoApprove({
      agentRunId: run.id,
      mode,
      triggeredBy,
      decision: result.decision,
      actions: result.actions,
    })

    return { ...result, agentRunId: run.id }
  } catch (err: any) {
    console.error('[agent.service] runAgentForDriver error:', err)
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        error: err?.message ?? 'Error desconocido',
        completedAt: new Date(),
      },
    })
    return {
      agentRunId: run.id,
      decision: null,
      summary: 'El agente falló durante la ejecución.',
      reasoning: '',
      actions: [],
      publicChecks: [],
      metrics: emptyMetrics(),
      model: null,
      error: err?.message ?? 'Error desconocido',
    }
  }
}

// ============================================================================
// Pipeline determinista (Sprint 2).
// ============================================================================

type DriverWithRelations = Prisma.FormDriverGetPayload<{
  include: { documents: true; financialService: true; equipmentPayments: true }
}>

// Defaults overridables runtime desde AgentPromptOverride (tab Configuración).
export const DEFAULT_RUC_REFRESH_MAX_AGE_DAYS = 7
// Si el postulante subió más de N cédulas, mandamos al modelo solo las más
// recientes. Con 6+ imágenes de 4MB el payload supera el límite global de
// Anthropic (~32MB) y devuelve 413 request_too_large.
export const DEFAULT_MAX_CEDULA_IMAGES = 4

async function runDeterministicPipeline(
  driver: DriverWithRelations,
): Promise<Omit<AgentRunResult, 'agentRunId'>> {
  const steps: string[] = []
  const actions: ProposedToolCall[] = []
  const metrics = emptyMetrics()

  // Override runtime (con fallback a defaults del código).
  const override = await getActiveOverride().catch(() => null)
  const rucRefreshMaxAgeDays =
    override?.rucRefreshMaxAgeDays ?? DEFAULT_RUC_REFRESH_MAX_AGE_DAYS
  const maxCedulaImages = override?.maxCedulaImages ?? DEFAULT_MAX_CEDULA_IMAGES

  const driverName = cleanName(
    driver.fullName || [driver.firstName, driver.lastName].filter(Boolean).join(' '),
  )
  steps.push(`👤 **Postulante:** ${driverName || 'sin nombre'} (cédula ${driver.cedula})`)

  // Guard: cédula vacía — no podemos consultar RUC ni validar identidad
  if (!driver.cedula || driver.cedula.trim() === '') {
    return {
      decision: 'NEEDS_REVIEW',
      summary: 'Cédula del postulante vacía o inválida. No se puede procesar automáticamente.',
      reasoning: [
        ...steps,
        '',
        '⚠️ La cédula del formulario está vacía. No consulté el RUC ni valido documentos porque no hay con qué cruzar los datos. Un admin tiene que completar la cédula manualmente.',
      ].join('\n'),
      actions: [
        {
          tool: 'escalate_to_admin',
          input: { reason: 'Cédula del postulante está vacía — registrar manualmente.' },
          reasoning: 'Sin cédula no podemos hacer ninguna validación fiscal ni de identidad.',
        },
      ],
      publicChecks: [
        { key: 'identidad', status: 'warn', motive: PUBLIC_CHECK_MSG.generic },
        { key: 'antecedentes', status: 'warn', motive: PUBLIC_CHECK_MSG.generic },
        { key: 'ruc', status: 'warn', motive: PUBLIC_CHECK_MSG.generic },
      ],
      metrics,
      model: null,
    }
  }

  // --- 1. RUC ---
  const rucAgeDays = driver.rucLastCheckedAt
    ? (Date.now() - driver.rucLastCheckedAt.getTime()) / (1000 * 60 * 60 * 24)
    : Infinity
  let rucStatus = driver.rucStatus
  let rucName = driver.rucName

  const foreignCedula = isForeignCedula(driver.cedula)

  steps.push('')
  steps.push('🏛️ **Consulta RUC (SET)**')
  if (foreignCedula) {
    rucStatus = 'NOT_APPLICABLE'
    rucName = null
    steps.push(
      `La cédula "${driver.cedula}" contiene letras → postulante extranjero. No aplica consulta al SET paraguayo.`,
    )
  } else if (
    !rucStatus ||
    rucStatus === 'NOT_CHECKED' ||
    rucStatus === 'ERROR' ||
    rucAgeDays > rucRefreshMaxAgeDays
  ) {
    // Reintentar también cuando el último estado es ERROR (transitorio, ej.
    // turuc.com.py respondió 5xx). Si seguimos con ERROR persistente, el
    // pipeline cae a rucUnknown y escala — comportamiento esperado.
    steps.push('Consulté turuc.com.py en vivo (no había dato reciente o el último estado fue ERROR).')
    const rucResult = await checkRucStatus(driver.cedula)
    rucStatus = rucResult.status
    rucName = rucResult.name
  } else {
    steps.push(
      `Usé el dato persistido en nuestra base (consultado hace ${formatAge(rucAgeDays)}), no llamé a la API de nuevo.`,
    )
  }
  steps.push(`Estado fiscal: **${rucStatus ?? 'desconocido'}**${describeRucStatus(rucStatus)}`)
  if (rucName) steps.push(`Razón social en SET: "${rucName}"`)
  if (driver.rucInactiveWaived) {
    steps.push('ℹ️ El admin marcó "RUC Inactivo (excepción)" — el certificado tributario se da por cumplido.')
  }

  // --- 2. Imágenes ---
  // CEDULA es un único tipo: el postulante puede subir una o más imágenes
  // (frente, dorso, ambas). El agente las trata como un set sin diferenciar lado.
  // Limitamos a las 4 más recientes para evitar 413 (request_too_large) cuando
  // un postulante re-sube varias veces. Con 4 cédulas comprimidas (~3.5MB c/u
  // raw → ~4.7MB base64) más antecedentes seguimos bajo el límite global de
  // payload de Anthropic.
  const allCedulas = pickAllDocs(driver.documents, 'CEDULA')
  const cedulas = allCedulas.slice(-maxCedulaImages)
  const cedulasOmitidas = allCedulas.length - cedulas.length
  const criminal = pickLatestDoc(driver.documents, 'CRIMINAL_RECORD')

  const missingDocs: string[] = []
  if (cedulas.length === 0) missingDocs.push('cédula')
  if (!criminal) missingDocs.push('certificado de antecedentes')

  if (cedulasOmitidas > 0) {
    steps.push('')
    steps.push(
      `ℹ️ El postulante subió ${allCedulas.length} imágenes de cédula. Para evitar superar el límite de payload de Haiku, solo analizo las ${maxCedulaImages} más recientes (omito ${cedulasOmitidas} más viejas — habitualmente intentos previos).`,
    )
  }

  // Validación unificada: una sola llamada a Haiku con todas las imágenes disponibles
  // + system prompt con prompt caching (cache hits en corridas dentro de 5 min).
  const validation = await validateDriverDocuments({
    driverCedula: driver.cedula,
    driverName,
    cedulaUrls: cedulas.map((c) => c.blobUrl),
    criminalRecordUrl: criminal?.blobUrl ?? null,
    isForeign: foreignCedula,
  }).catch((err) => {
    console.error('[agent-pipeline] validateDriverDocuments threw:', err)
    return null
  })

  let cedulaResults: ImageValidationResult[] = validation?.cedulaResults ?? []
  let criminalResult: ImageValidationResult | null = validation?.criminalRecord ?? null

  // Métricas agregadas (vienen todas en validation.usage, una sola llamada)
  if (validation?.usage) {
    metrics.inputTokens += validation.usage.inputTokens
    metrics.outputTokens += validation.usage.outputTokens
    metrics.cacheReadTokens += validation.usage.cacheReadTokens
    metrics.cacheWriteTokens += validation.usage.cacheWriteTokens
    metrics.costMicroUsd += validation.usage.costMicroUsd
    metrics.iterations = 1 // 1 llamada unificada
  }

  // Si toda la validación falló (ej. ANTHROPIC_API_KEY ausente o JSON no parseable),
  // marcamos todos los docs presentes como error para que la lógica de decisión los
  // mande a revisión humana.
  if (!validation || !validation.ok) {
    const errMsg = validation?.error ?? 'Validación visual no disponible'
    if (cedulas.length > 0 && cedulaResults.length === 0) {
      cedulaResults = cedulas.map(() => buildCaughtErrorResult(new Error(errMsg)))
    }
    if (criminal && !criminalResult) criminalResult = buildCaughtErrorResult(new Error(errMsg))
  }

  // --- 3. Decisión ---
  // Para extranjeros no aplicamos reglas de RUC paraguayo — el flujo sigue por otro lado.
  const rucBlocking = !foreignCedula && ['CANCELADO', 'BLOQUEADO'].includes(rucStatus ?? '')
  // NO_ENCONTRADO es el caso más común (postulante no registrado en el SET, normal
  // para cualquiera que no facture). NO lo tratamos como bloqueante — se aprueba con
  // aviso al postulante de que si en el futuro quiere facturar necesita registrarse.
  const rucNotRegistered = !foreignCedula && rucStatus === 'NO_ENCONTRADO'
  // Soft issue = tuvo RUC pero está inactivo/suspendido. Requiere intervención admin
  // (contactar para regularizar o marcar waive).
  const rucSoftIssue =
    !foreignCedula && ['SUSPENSION TEMPORAL', 'INACTIVO'].includes(rucStatus ?? '')
  const rucUnknown =
    !foreignCedula && (!rucStatus || rucStatus === 'NOT_CHECKED' || rucStatus === 'ERROR')

  // Contar rechazos claros de imágenes
  const rejectsFromImages: { doc: string; reason: string; docId: string }[] = []
  const reviewsFromImages: { doc: string; concern: string; docId: string }[] = []
  const approvalsFromImages: { doc: string; docId: string }[] = []
  // Bucket separado para "subió un documento de OTRO tipo" (ej. CV en lugar de
  // antecedentes, recibo en lugar de cédula). Estos no se rechazan ni escalan
  // ciegamente — pedimos resubmission con mensaje específico.
  const wrongTypeFromImages: {
    doc: string
    docId: string
    detectedType: string | null
    note: string | null
  }[] = []

  // Aplicar overrides antes de clasificar a cada imagen:
  // 1) Override de cédula coincidente: REJECT por nombre pero cédula coincide → APPROVE
  // 2) Override de vencimiento: REJECT por "vencido/expired" → MANUAL_REVIEW (renovable, no fraude)
  const cedulaResultsFinal = cedulaResults.map((r, idx) =>
    applyExpiryOverride(
      applyCedulaMatchOverride(r, driver.cedula, steps),
      steps,
      cedulas.length === 1 ? 'cédula' : `cédula (imagen ${idx + 1})`,
    ),
  )
  const criminalResultFinal = applyExpiryOverride(
    applyCedulaMatchOverride(criminalResult, driver.cedula, steps),
    steps,
    'antecedentes',
  )

  cedulas.forEach((doc, idx) => {
    const label = cedulas.length === 1 ? 'cédula' : `cédula (imagen ${idx + 1})`
    processImageResult(
      cedulaResultsFinal[idx] ?? null,
      label,
      doc.id,
      rejectsFromImages,
      reviewsFromImages,
      approvalsFromImages,
      wrongTypeFromImages,
    )
  })
  if (criminal) processImageResult(criminalResultFinal, 'antecedentes', criminal.id, rejectsFromImages, reviewsFromImages, approvalsFromImages, wrongTypeFromImages)

  // Detección de typo de cédula: el postulante se equivocó al tipear su cédula
  // en el formulario. Si los documentos son consistentes entre sí y difieren
  // del form por ≤2 caracteres, es un typo, no fraude.
  const cedulaTypo = detectCedulaTypo(driver.cedula, [...cedulaResultsFinal, criminalResultFinal])
  if (cedulaTypo) {
    steps.push('')
    steps.push(
      `🔍 **Typo detectado en la cédula del formulario**: el postulante cargó "${cedulaTypo.formCedula}" pero todos los documentos muestran "${cedulaTypo.realCedula}" (diferencia: ${cedulaTypo.editDistance} caracteres). Muy probable error de tipeo, no fraude.`,
    )
  }

  // Señal de fraude: si los docs muestran ≥2 cédulas distintas que NO son typo
  // entre sí (diff > 2 chars o long distinto), no es la misma persona — alguien
  // está mezclando documentos. NO aprobamos ni pedimos resubmission ciegamente.
  const distinctCedulasInDocs = collectDistinctCedulas([...cedulaResultsFinal, criminalResultFinal])
  const fraudSignal =
    !cedulaTypo && distinctCedulasInDocs.length >= 2 // typo ya cubre el caso de un solo "real cedula"
  if (fraudSignal) {
    steps.push('')
    steps.push(
      `🚨 **Señal de fraude detectada**: los documentos muestran cédulas distintas que NO son typos entre sí (${distinctCedulasInDocs.join(', ')}). Posible mezcla de documentos de personas diferentes. Escalado al admin para revisión manual.`,
    )
  }

  // Reglas de decisión
  let decision: AgentRunDecision = 'NEEDS_REVIEW'
  let summary = ''

  // Fail-safe: si la validación visual falló por completo (ej. Haiku caído,
  // ANTHROPIC_API_KEY ausente, JSON no parseable), NO le mandamos resubmission
  // al postulante por documentos que probablemente sean válidos. Escalamos al
  // admin con un único action y dejamos que reintente manualmente.
  const validationFailedGlobally = !validation || !validation.ok
  const hasUploadedDocs = cedulas.length > 0 || !!criminal

  if (missingDocs.length > 0) {
    decision = 'NEEDS_REVIEW'
    summary = `Faltan documentos obligatorios: ${missingDocs.join(', ')}.`
    // Proponer solicitar cada documento faltante al postulante por WhatsApp
    const firstName = getFirstName(driver)
    if (cedulas.length === 0) {
      actions.push({
        tool: 'propose_request_document_resubmission',
        input: {
          documentType: 'CEDULA',
          reason: 'No se subió la foto de la cédula.',
          whatsappMessage: `Hola ${firstName || ''}! Para avanzar con tu postulación en Monchis necesitamos que subas una foto clara de tu cédula. Entrá al portal y subila cuando puedas, gracias!`,
        },
        reasoning: 'La postulación no tiene foto de cédula. Pedirla al postulante.',
      })
    }
    if (!criminal) {
      actions.push({
        tool: 'propose_request_document_resubmission',
        input: {
          documentType: 'CRIMINAL_RECORD',
          reason: 'No se subió el certificado de antecedentes penales.',
          whatsappMessage: `Hola ${firstName || ''}! Para avanzar con tu postulación en Monchis necesitamos el certificado de antecedentes penales (vigencia 90 días). Podés tramitarlo en la Policía Nacional y subirlo al portal. Gracias!`,
        },
        reasoning: 'Falta certificado de antecedentes. Solicitarlo con nota de vigencia (90 días).',
      })
    }
    actions.push({
      tool: 'escalate_to_admin',
      input: { reason: summary },
      reasoning: 'Falta confirmación del admin antes de disparar el pedido al postulante.',
    })
  } else if (validationFailedGlobally && hasUploadedDocs) {
    // El postulante subió docs pero el provider de validación no pudo procesarlos.
    // No es problema del postulante — no le mandamos WhatsApp. Admin reintenta a mano.
    decision = 'NEEDS_REVIEW'
    const errMsg = validation?.error ?? 'Validación visual no disponible (provider caído o respuesta no parseable).'
    summary = `Falla técnica al validar imágenes: ${errMsg}. Sin acciones hacia el postulante; admin debe reintentar manualmente.`
    const uploadedSummary = [
      cedulas.length > 0 && `${cedulas.length} imagen(es) de cédula`,
      criminal && 'antecedentes',
    ]
      .filter(Boolean)
      .join(', ')
    actions.push({
      tool: 'escalate_to_admin',
      input: {
        reason: `${errMsg} El postulante subió ${uploadedSummary}; reintentar el agente manualmente o validar a mano.`,
      },
      reasoning: 'Provider de visión falló; no atribuir el problema al postulante.',
    })
  } else if (rucBlocking) {
    // RUC bloqueante (CANCELADO, etc.) tiene prioridad sobre cualquier issue
    // de documento — no tiene sentido pedir resubmission de docs si la
    // postulación va a rechazarse por motivo fiscal.
    decision = 'REJECTED'
    summary = `RUC en estado ${rucStatus} — bloqueante.`
    actions.push({
      tool: 'escalate_to_admin',
      input: { reason: `RUC ${rucStatus}. Requiere decisión administrativa (rechazo o regularización).` },
      reasoning: 'Estado de RUC es bloqueante — no se puede aprobar directamente.',
    })
  } else if (fraudSignal) {
    // Cédulas distintas entre docs que no son typo → no aprobamos ni mandamos
    // mensaje al postulante; admin debe verificar a mano si es mezcla
    // accidental o intento de fraude.
    decision = 'NEEDS_REVIEW'
    summary = `Sospecha de fraude: documentos muestran cédulas distintas (${distinctCedulasInDocs.join(', ')}) que no son typo entre sí. Admin debe verificar manualmente antes de cualquier acción.`
    actions.push({
      tool: 'escalate_to_admin',
      input: {
        reason: `Documentos con cédulas distintas (${distinctCedulasInDocs.join(', ')}). Posible mezcla de archivos de personas diferentes o intento de fraude. Verificar identidad de cada documento antes de aprobar/rechazar.`,
      },
      reasoning: 'Múltiples cédulas distintas en docs sin patrón de typo — señal fuerte de fraude.',
    })
  } else if (wrongTypeFromImages.length > 0) {
    // El postulante subió un documento de tipo equivocado (ej. CV en lugar de
    // antecedentes). NO aprobamos por más que la cédula coincida. Pedimos el
    // documento correcto con mensaje específico.
    decision = 'NEEDS_REVIEW'
    summary = `Documento(s) de tipo equivocado: ${wrongTypeFromImages
      .map((w) => `${w.doc}${w.detectedType ? ` (subió ${w.detectedType})` : ''}`)
      .join(', ')}. Pedir el documento correcto al postulante.`
    const firstName = getFirstName(driver)
    for (const w of wrongTypeFromImages) {
      const docType = docLabelToType(w.doc)
      if (!docType) continue
      const docLabelEs = documentTypeLabelEs(docType)
      const detectedHint = w.detectedType && w.detectedType !== 'OTHER' ? ` (subió ${w.detectedType})` : ''
      let whatsappMessage = ''
      if (docType === 'CRIMINAL_RECORD') {
        whatsappMessage = `Hola ${firstName || ''}! Revisamos tu postulación y el archivo que subiste como certificado de antecedentes no es el documento correcto. Necesitamos el certificado oficial de antecedentes penales paraguayo (Policía Nacional, Ministerio Público o Ministerio del Interior), con vigencia de 90 días. ¿Podés tramitarlo y subirlo al portal? ¡Gracias!`
      } else if (docType === 'CEDULA') {
        whatsappMessage = `Hola ${firstName || ''}! El archivo que subiste como cédula no es una cédula paraguaya. ¿Podés subir una foto clara de tu cédula al portal? ¡Gracias!`
      } else {
        whatsappMessage = `Hola ${firstName || ''}! El archivo que subiste como ${docLabelEs} no corresponde al documento solicitado. ¿Podés subir el documento correcto al portal? ¡Gracias!`
      }
      actions.push({
        tool: 'propose_request_document_resubmission',
        input: {
          documentType: docType,
          reason: `Tipo de documento incorrecto${detectedHint}: ${w.note ?? 'no es el documento esperado'}.`,
          whatsappMessage,
        },
        reasoning: `Postulante subió ${w.detectedType ?? 'un archivo'} en lugar de ${docLabelEs}. Pedir resubmission con mensaje específico.`,
      })
    }
  } else if (rejectsFromImages.length > 0) {
    // Override: si HAY al menos un rechazo por "cédula no coincide" y detectamos
    // typo (docs consistentes entre sí, diff ≤2 chars), proponemos corregir
    // la cédula en el form. Antes exigíamos que TODOS los rejects fueran por
    // cédula, pero eso fallaba en mixtos legítimos (ej. cédula mismatch + dorso
    // borroso). Ahora aceptamos típo si hay al menos uno por cédula.
    const cedulaMismatchRegex = /cédula.*no coincide|cedula.*no coincide|otra persona|diferente persona/i
    const someRejectIsCedulaMismatch = rejectsFromImages.some((r) =>
      cedulaMismatchRegex.test(r.reason),
    )
    if (cedulaTypo && someRejectIsCedulaMismatch) {
      decision = 'NEEDS_REVIEW'
      const otherRejects = rejectsFromImages.filter((r) => !cedulaMismatchRegex.test(r.reason))
      const otherIssues =
        otherRejects.length > 0
          ? ` Además hay otros rechazos no relacionados al typo: ${otherRejects.map((r) => `${r.doc} (${r.reason})`).join('; ')}.`
          : ''
      summary = `El postulante cargó "${cedulaTypo.formCedula}" en el formulario pero los documentos muestran "${cedulaTypo.realCedula}" — muy probable typo (diferencia: ${cedulaTypo.editDistance} caracteres). Los nombres son compatibles. Proponemos corregir la cédula en el formulario y re-validar.${otherIssues}`
      actions.push({
        tool: 'propose_update_driver_cedula',
        input: {
          currentCedula: cedulaTypo.formCedula,
          correctedCedula: cedulaTypo.realCedula,
          extractedFullName: cedulaTypo.extractedName,
          reason: `Los documentos subidos muestran la cédula ${cedulaTypo.realCedula}${
            cedulaTypo.extractedName ? ` a nombre de ${cedulaTypo.extractedName}` : ''
          }, pero el formulario dice ${cedulaTypo.formCedula}. Diferencia de ${cedulaTypo.editDistance} caracter${cedulaTypo.editDistance === 1 ? '' : 'es'}: muy probable typo al completar el formulario.`,
        },
        reasoning: `Typo detectado: form=${cedulaTypo.formCedula}, docs=${cedulaTypo.realCedula}, distancia=${cedulaTypo.editDistance}.`,
      })
      steps.push(
        'ℹ️ No rechazo los documentos — propongo corregir la cédula del formulario para que coincida con los documentos, y re-validar todo.',
      )
      // Si además hay rejects no relacionados al typo (blur, etc.), los flagueamos
      // como pending para que el admin los considere después de aplicar la corrección.
      if (otherRejects.length > 0) {
        actions.push({
          tool: 'escalate_to_admin',
          input: {
            reason: `Después de corregir la cédula y re-validar, revisar también: ${otherRejects.map((r) => `${r.doc} (${r.reason})`).join('; ')}.`,
          },
          reasoning: 'Rejects mixtos: typo + otros issues — admin debe atender ambos.',
        })
      }
    } else {
      decision = 'REJECTED'
      summary = `Imágenes con problemas claros: ${rejectsFromImages.map((r) => r.doc).join(', ')}.`
      for (const r of rejectsFromImages) {
        actions.push({
          tool: 'propose_reject_document',
          input: { documentId: r.docId, reason: r.reason },
          reasoning: `Haiku sugirió REJECT para ${r.doc}: ${r.reason}`,
        })
      }
    }
  } else if (reviewsFromImages.length > 0) {
    decision = 'NEEDS_REVIEW'
    summary = `Imágenes ambiguas que requieren revisión humana: ${reviewsFromImages.map((r) => r.doc).join(', ')}.`

    // Cada imagen en MANUAL_REVIEW se clasifica según el concern:
    //  - Error interno (PDF no soportado, fallo descarga) → escalate_to_admin
    //  - Vencido (antecedentes >90 días) → resubmission con mensaje específico
    //  - Calidad (borrosa, reflejo, etc.) → resubmission con mensaje genérico
    //  - Datos inconsistentes (fecha rara, firma dudosa) → escalate_to_admin
    const firstName = getFirstName(driver)
    for (const rev of reviewsFromImages) {
      const docType = docLabelToType(rev.doc)
      if (!docType) continue

      const concernLower = rev.concern.toLowerCase()
      const classification = classifyConcern(concernLower)
      const docLabelEs = documentTypeLabelEs(docType)

      if (classification === 'INTERNAL_ERROR') {
        // No es problema del postulante; fallo nuestro. Admin debe decidir.
        actions.push({
          tool: 'escalate_to_admin',
          input: {
            reason: `Error técnico procesando ${docLabelEs}: ${rev.concern}. Admin debe revisar manualmente sin pedir re-submission al postulante.`,
          },
          reasoning: `Error interno (no del postulante): ${rev.concern}`,
        })
      } else if (classification === 'EXPIRED' && docType === 'CRIMINAL_RECORD') {
        actions.push({
          tool: 'propose_request_document_resubmission',
          input: {
            documentType: 'CRIMINAL_RECORD',
            reason: 'Certificado de antecedentes vencido (vigencia 90 días).',
            whatsappMessage: `Hola ${firstName || ''}! Revisamos tu postulación y el certificado de antecedentes que subiste está vencido (vigencia 90 días corridos desde la emisión). Podés tramitarlo de nuevo en la Policía Nacional y subirlo al portal. Apenas lo tengas seguimos. ¡Gracias!`,
          },
          reasoning: `Certificado vencido: ${rev.concern}`,
        })
      } else if (classification === 'QUALITY') {
        actions.push({
          tool: 'propose_request_document_resubmission',
          input: {
            documentType: docType,
            reason: `Revisar ${docLabelEs}: ${rev.concern}`,
            whatsappMessage: `Hola ${firstName || ''}! Miramos tu postulación y ${reviewMessageForDoc(
              docType,
              rev.concern,
            )} ¿Podés subir una nueva al portal? ¡Gracias!`,
          },
          reasoning: `Calidad de imagen baja: ${rev.concern}`,
        })
      } else {
        // DATA_INCONSISTENCY u OTHER: admin decide — no pedir re-submission ciegamente.
        actions.push({
          tool: 'escalate_to_admin',
          input: {
            reason: `Revisar ${docLabelEs}: ${rev.concern}. Se detectó inconsistencia en datos (no en calidad de imagen) — admin debe verificar si es error del modelo o problema real del documento.`,
          },
          reasoning: `Concern no mappea a calidad ni vencimiento: ${rev.concern}`,
        })
      }
    }
  } else if (rucUnknown) {
    decision = 'NEEDS_REVIEW'
    summary = `Imágenes OK pero estado RUC es incierto (${rucStatus ?? 'null'}).`
    actions.push({
      tool: 'escalate_to_admin',
      input: { reason: 'Reintentar consulta RUC o verificar manualmente.' },
      reasoning: 'No podemos aprobar sin certeza del RUC.',
    })
  } else if (rucSoftIssue && !driver.rucInactiveWaived) {
    decision = 'NEEDS_REVIEW'
    summary = `Imágenes OK pero RUC ${rucStatus}. El admin puede: (a) marcar "RUC Inactivo" como excepción (si el postulante se compromete a regularizar), o (b) contactarlo primero para que regularice.`
    const firstName = getFirstName(driver) || 'Driver'

    // Opción A: propose_waive_ruc_inactive — admin acepta la excepción con 1 click
    actions.push({
      tool: 'propose_waive_ruc_inactive',
      input: {
        note: `RUC en estado ${rucStatus}${rucName ? ` (${rucName})` : ''}. Documentos OK. Aceptar excepción con compromiso de regularización.`,
      },
      reasoning: `Opción rápida: marcar excepción RUC Inactivo. El certificado tributario se da por cumplido.`,
    })

    // Opción B: contactar al postulante para que regularice (mensaje listo)
    actions.push({
      tool: 'propose_request_document_resubmission',
      input: {
        documentType: 'TAX_COMPLIANCE',
        reason: `Contactar al postulante: su RUC está ${rucStatus} y debe regularizarlo.`,
        whatsappMessage: `Hola ${firstName}! Revisamos tu postulación y tu RUC está en estado "${rucStatus}". Para poder facturarnos cuando trabajes, necesitás regularizarlo en la SET (https://set.gov.py). Avisanos cuando esté listo. ¡Gracias!`,
      },
      reasoning:
        'Opción alternativa al waive: contactar al postulante para regularización fiscal antes de aprobar.',
    })
  } else {
    // Todos los docs OK — aprobamos. Puede ser RUC ACTIVO, NOT_APPLICABLE (extranjero),
    // waiver vigente, o NO_ENCONTRADO (postulante no registrado en SET — caso más común).
    decision = 'APPROVED'

    let rucContext: string
    if (driver.rucInactiveWaived) {
      rucContext = 'con excepción admin de RUC Inactivo'
    } else if (foreignCedula) {
      rucContext = 'postulante extranjero (RUC no aplica)'
    } else if (rucNotRegistered) {
      rucContext = 'RUC no registrado en SET (normal, se informará al postulante)'
    } else {
      rucContext = `RUC ${rucStatus}`
    }
    summary = `Documentos e identidad validados — ${rucContext}. Postulación lista para avanzar.`

    for (const a of approvalsFromImages) {
      actions.push({
        tool: 'propose_approve_document',
        input: { documentId: a.docId },
        reasoning: `Haiku sugirió APPROVE para ${a.doc}.`,
      })
    }

    const firstName = getFirstName(driver) || 'Driver'

    // Si RUC NO_ENCONTRADO → mensaje custom informando que necesita registrarse
    // si quiere facturar en el futuro. No usa plantilla porque es específico.
    if (rucNotRegistered) {
      actions.push({
        tool: 'propose_send_whatsapp_template',
        input: {
          templateKey: 'capacitaciones',
          variables: { name: firstName },
        },
        reasoning:
          'Postulación aprobada: mandar info de capacitaciones. Aviso sobre RUC va aparte.',
      })
      actions.push({
        tool: 'propose_request_document_resubmission',
        input: {
          // Reutilizamos esta tool como contenedor del mensaje al postulante.
          // documentType TAX_COMPLIANCE es semánticamente cercano (situación fiscal),
          // aunque el mensaje es informativo, no un pedido urgente.
          documentType: 'TAX_COMPLIANCE',
          reason:
            'Informar al postulante que no está registrado en el SET (RUC no encontrado). Si en el futuro quiere facturar necesita registrar RUC.',
          whatsappMessage: `Hola ${firstName}! Ya validamos tu postulación. Te comentamos que no figurás registrado en el SET (no tenés RUC todavía). Podés trabajar igual como repartidor, pero si más adelante querés facturar vas a necesitar registrar RUC. Cualquier duda consultanos.`,
        },
        reasoning:
          'RUC NO_ENCONTRADO: no bloqueante pero se avisa al postulante para que sepa la situación.',
      })
    } else {

      // Camino estándar (RUC ACTIVO, waived, extranjero, u otro no-bloqueante):
      // proponer plantilla de capacitaciones
      const capacitacionesTemplate = await prisma.whatsAppTemplate.findFirst({
        where: { key: 'capacitaciones', isActive: true },
        select: { key: true },
      })
      if (capacitacionesTemplate) {
        actions.push({
          tool: 'propose_send_whatsapp_template',
          input: {
            templateKey: 'capacitaciones',
            variables: { name: firstName },
          },
          reasoning:
            'Postulación lista: proponer mandar info de capacitaciones disponibles (plantilla existe y está activa en DB).',
        })
      } else {
        actions.push({
          tool: 'escalate_to_admin',
          input: {
            reason:
              'Postulación lista para avanzar pero la plantilla "capacitaciones" no existe o está inactiva en DB. El admin debe enviar la invitación a capacitación manualmente.',
          },
          reasoning: 'Evito proponer enviar una plantilla inexistente.',
        })
      }
    }
  }

  // Agregar análisis de documentos al reasoning
  steps.push('')
  steps.push('📸 **Análisis de documentos**')
  if (cedulas.length === 0) {
    steps.push('**Cédula:** no fue subida.')
  } else if (cedulas.length === 1) {
    steps.push(describeImageResult('Cédula', cedulaResultsFinal[0] ?? null, true))
  } else {
    cedulas.forEach((_, idx) => {
      steps.push(describeImageResult(`Cédula (imagen ${idx + 1})`, cedulaResultsFinal[idx] ?? null, true))
    })
  }
  steps.push(describeImageResult('Certificado de antecedentes', criminalResultFinal, !!criminal))

  steps.push('')
  steps.push(`${decisionEmoji(decision)} **Decisión final: ${decisionLabel(decision)}**`)
  steps.push(summary)

  const reasoning = steps.join('\n')

  const publicChecks = buildPublicChecks({
    missingCedula: cedulas.length === 0,
    missingCriminal: !criminal,
    validationFailed: validationFailedGlobally && hasUploadedDocs,
    fraudSignal,
    cedulaTypo: !!cedulaTypo,
    rejects: rejectsFromImages,
    reviews: reviewsFromImages,
    wrongTypes: wrongTypeFromImages,
    rucBlocking,
    rucSoftIssue: rucSoftIssue && !driver.rucInactiveWaived,
    rucUnknown,
  })

  return {
    decision,
    summary,
    reasoning,
    actions,
    publicChecks,
    metrics,
    model: HAIKU_MODEL,
  }
}

// ============================================================================
// Derivación determinística de los checks públicos (pantalla post-submit).
// Mapea las señales que el pipeline ya computó a mensajes del catálogo fijo.
// Regla dura: nada de texto libre del modelo — si un caso no matchea el
// catálogo, cae al motive genérico con status 'warn'.
// ============================================================================

function buildPublicChecks(input: {
  missingCedula: boolean
  missingCriminal: boolean
  validationFailed: boolean
  fraudSignal: boolean
  cedulaTypo: boolean
  rejects: { doc: string; reason: string }[]
  reviews: { doc: string; concern: string }[]
  wrongTypes: { doc: string }[]
  rucBlocking: boolean
  rucSoftIssue: boolean
  rucUnknown: boolean
}): PublicCheck[] {
  const isCedulaDoc = (label: string) => /c[eé]dula/i.test(label)
  const isCriminalDoc = (label: string) => /antecedentes/i.test(label)
  const cedulaMismatchRegex =
    /cédula.*no coincide|cedula.*no coincide|otra persona|diferente persona/i

  // --- identidad (cédula) ---
  let identidad: PublicCheck = { key: 'identidad', status: 'ok', motive: PUBLIC_CHECK_MSG.ok }
  if (input.missingCedula) {
    identidad = { key: 'identidad', status: 'fail', motive: PUBLIC_CHECK_MSG.cedulaMissing }
  } else if (input.fraudSignal || input.cedulaTypo || input.validationFailed) {
    // Sospecha de fraude, typo de cédula o falla técnica del provider: nunca
    // exponemos el detalle al postulante — mensaje genérico de revisión manual.
    identidad = { key: 'identidad', status: 'warn', motive: PUBLIC_CHECK_MSG.generic }
  } else if (input.wrongTypes.some((w) => isCedulaDoc(w.doc))) {
    identidad = { key: 'identidad', status: 'warn', motive: PUBLIC_CHECK_MSG.cedulaWrongType }
  } else {
    const reject = input.rejects.find((r) => isCedulaDoc(r.doc))
    const review = input.reviews.find((r) => isCedulaDoc(r.doc))
    if (reject) {
      const motive = cedulaMismatchRegex.test(reject.reason)
        ? PUBLIC_CHECK_MSG.cedulaMismatch
        : classifyConcern(reject.reason.toLowerCase()) === 'QUALITY'
          ? PUBLIC_CHECK_MSG.cedulaUnreadable
          : PUBLIC_CHECK_MSG.cedulaObservations
      identidad = { key: 'identidad', status: 'fail', motive }
    } else if (review) {
      const motive =
        classifyConcern(review.concern.toLowerCase()) === 'QUALITY'
          ? PUBLIC_CHECK_MSG.cedulaUnreadable
          : PUBLIC_CHECK_MSG.generic
      identidad = { key: 'identidad', status: 'warn', motive }
    }
  }

  // --- antecedentes ---
  let antecedentes: PublicCheck = {
    key: 'antecedentes',
    status: 'ok',
    motive: PUBLIC_CHECK_MSG.ok,
  }
  if (input.missingCriminal) {
    antecedentes = { key: 'antecedentes', status: 'fail', motive: PUBLIC_CHECK_MSG.criminalMissing }
  } else if (input.fraudSignal || input.validationFailed) {
    antecedentes = { key: 'antecedentes', status: 'warn', motive: PUBLIC_CHECK_MSG.generic }
  } else if (input.wrongTypes.some((w) => isCriminalDoc(w.doc))) {
    antecedentes = {
      key: 'antecedentes',
      status: 'warn',
      motive: PUBLIC_CHECK_MSG.criminalWrongType,
    }
  } else {
    const reject = input.rejects.find((r) => isCriminalDoc(r.doc))
    const review = input.reviews.find((r) => isCriminalDoc(r.doc))
    if (reject) {
      const motive =
        classifyConcern(reject.reason.toLowerCase()) === 'QUALITY'
          ? PUBLIC_CHECK_MSG.criminalUnreadable
          : PUBLIC_CHECK_MSG.criminalObservations
      antecedentes = { key: 'antecedentes', status: 'fail', motive }
    } else if (review) {
      const classification = classifyConcern(review.concern.toLowerCase())
      const motive =
        classification === 'EXPIRED'
          ? PUBLIC_CHECK_MSG.criminalExpired
          : classification === 'QUALITY'
            ? PUBLIC_CHECK_MSG.criminalUnreadable
            : PUBLIC_CHECK_MSG.generic
      antecedentes = { key: 'antecedentes', status: 'warn', motive }
    }
  }

  // --- ruc ---
  // RUC bloqueante (CANCELADO/BLOQUEADO) es el único fail fiscal: es el caso en
  // que el pipeline rechaza por motivo fiscal y el postulante necesita saber por qué.
  let ruc: PublicCheck = { key: 'ruc', status: 'ok', motive: PUBLIC_CHECK_MSG.ok }
  if (input.rucBlocking) {
    ruc = { key: 'ruc', status: 'fail', motive: PUBLIC_CHECK_MSG.rucBlocking }
  } else if (input.rucSoftIssue) {
    ruc = { key: 'ruc', status: 'warn', motive: PUBLIC_CHECK_MSG.rucObservations }
  } else if (input.rucUnknown) {
    ruc = { key: 'ruc', status: 'warn', motive: PUBLIC_CHECK_MSG.generic }
  }

  return [identidad, antecedentes, ruc]
}

function pickLatestDoc<T extends { documentType: string; createdAt: Date }>(
  docs: T[],
  type: string,
): T | null {
  const matches = docs.filter((d) => d.documentType === type)
  if (matches.length === 0) return null
  return matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
}

function pickAllDocs<T extends { documentType: string; createdAt: Date }>(
  docs: T[],
  type: string,
): T[] {
  return docs
    .filter((d) => d.documentType === type)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}

/**
 * Si el modelo devolvió REJECT pero el número de cédula extraído coincide con
 * el del form, y el motivo declarado tiene que ver con el nombre, degradamos
 * a APPROVE. La cédula es la señal de identidad inequívoca; un form con typo
 * en el nombre no es fraude.
 */
/**
 * Si el modelo devolvió REJECT pero el motivo está relacionado con vencimiento
 * ("vencido", "expired", "X días han pasado", "excede N días de vigencia"),
 * degradamos a MANUAL_REVIEW. Un certificado vencido NO es fraude — el postulante
 * puede renovarlo rápido. Esto lleva el caso al branch de resubmission con
 * mensaje específico de renovación.
 */
function applyExpiryOverride(
  result: ImageValidationResult | null,
  steps: string[],
  docLabel: string,
): ImageValidationResult | null {
  if (!result || !result.ok) return result
  if (result.suggestion !== 'REJECT') return result

  const combined =
    (result.rejectReasonIfAny ?? '') + ' ' + result.concerns.join(' ')
  const classification = classifyConcern(combined.toLowerCase())
  if (classification !== 'EXPIRED') return result

  steps.push(
    `[override] Modelo devolvió REJECT para ${docLabel} por vencimiento. Degradar a MANUAL_REVIEW — un certificado vencido es renovable, no fraude. Sigue al flujo de resubmission.`,
  )
  return {
    ...result,
    suggestion: 'MANUAL_REVIEW',
    rejectReasonIfAny: null,
    concerns: [
      ...result.concerns,
      '[override] REJECT por vencimiento degradado a MANUAL_REVIEW; se pedirá renovación al postulante.',
    ],
  }
}

/**
 * Compara dos cédulas con awareness de cédulas extranjeras (alphanuméricas).
 * - Si ambas son sólo dígitos, compara dígitos.
 * - Si una tiene letras y la otra no, devuelve false (formatos distintos).
 * - Si ambas tienen letras, compara alphanumeric case-insensitive completo
 *   (evita match falso M371660 vs V371660 vs 371660).
 */
function cedulasMatch(rawA: string, rawB: string): boolean {
  const a = (rawA ?? '').trim()
  const b = (rawB ?? '').trim()
  if (!a || !b) return false
  const aHasLetter = /[A-Za-z]/.test(a)
  const bHasLetter = /[A-Za-z]/.test(b)
  if (aHasLetter !== bHasLetter) return false
  if (aHasLetter && bHasLetter) {
    const aAlpha = a.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    const bAlpha = b.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    return aAlpha.length > 0 && aAlpha === bAlpha
  }
  const aDigits = normalizeCedula(a)
  const bDigits = normalizeCedula(b)
  return aDigits.length > 0 && aDigits === bDigits
}

function applyCedulaMatchOverride(
  result: ImageValidationResult | null,
  formCedula: string,
  steps: string[],
): ImageValidationResult | null {
  if (!result || !result.ok) return result
  if (result.suggestion !== 'REJECT' && result.suggestion !== 'MANUAL_REVIEW') return result

  const extractedRaw = result.extractedDocNumber ?? ''
  // Match con awareness de extranjero (no dejar que M371660 colapse a 371660
  // y matchee accidentalmente con un 371660 paraguayo).
  if (!cedulasMatch(extractedRaw, formCedula)) return result
  const extracted = normalizeCedula(extractedRaw) || extractedRaw.trim()
  const form = normalizeCedula(formCedula) || formCedula.trim()

  // Guard: si el documento NO es claramente del tipo correcto (false o null),
  // NO degradamos a APPROVE aunque la cédula coincida. Fail-closed: sólo
  // disparamos el override cuando el modelo confirma matchesExpectedType=true.
  // null = no determinó / no confiable → tratar como wrong-type para safety.
  if (result.matchesExpectedType !== true) return result

  const reason =
    (result.rejectReasonIfAny ?? '') +
    ' ' +
    result.concerns.join(' ')
  // Detectar discrepancia de nombre de forma específica: queremos cosas como
  // "no coincide", "diferente persona", "otra persona", "nombre distinto", o
  // matchesDriverName=false. Evitamos matchear concerns que sólo *mencionan*
  // "nombre" para confirmar que coincide.
  const concernsAboutName =
    result.matchesDriverName === false ||
    /(nombre|apellido|name).*(no coincide|distinto|diferente|otra persona|no match|mismatch)/i.test(reason) ||
    /(no coincide|distinto|diferente|otra persona|no match|mismatch).*(nombre|apellido|name)/i.test(reason)
  if (!concernsAboutName) return result

  const prevSuggestion = result.suggestion
  steps.push(
    `[override] Modelo devolvió ${prevSuggestion} por discrepancia de nombre, pero la cédula extraída (${extracted}) coincide con la del form (${form}). Degradar a APPROVE — misma persona, nombre del form es alias/apodo/typo.`,
  )
  return {
    ...result,
    suggestion: 'APPROVE',
    rejectReasonIfAny: null,
    matchesDriverCedula: true,
    matchesDriverName: true,
    concerns: [
      ...result.concerns,
      `[override] Cédula del doc coincide con la del form; variación de nombre aceptada como alias/typo.`,
    ],
  }
}

function processImageResult(
  result: ImageValidationResult | null,
  docLabel: string,
  docId: string,
  rejects: { doc: string; reason: string; docId: string }[],
  reviews: { doc: string; concern: string; docId: string }[],
  approvals: { doc: string; docId: string }[],
  wrongTypes: { doc: string; docId: string; detectedType: string | null; note: string | null }[],
) {
  if (!result || !result.ok) {
    reviews.push({ doc: docLabel, concern: result?.error ?? 'falla al validar', docId })
    return
  }
  // Tipo de documento equivocado (ej. CV donde debería ir antecedentes). Va
  // a su propio bucket con prioridad sobre REJECT/MANUAL_REVIEW para que el
  // agente proponga resubmission con mensaje específico, no rechazo crudo.
  if (result.matchesExpectedType === false) {
    wrongTypes.push({
      doc: docLabel,
      docId,
      detectedType: result.documentTypeDetected,
      note: result.rejectReasonIfAny ?? result.concerns.join('; ') ?? null,
    })
    return
  }
  // Soft gates: si la calidad o autenticidad están muy bajas, forzamos
  // MANUAL_REVIEW aunque el modelo haya sugerido APPROVE. Thresholds
  // conservadores para no over-trigger sobre fotos típicas de celular.
  const lowQuality = typeof result.qualityScore === 'number' && result.qualityScore < 40
  const lowAuthenticity = typeof result.authenticityScore === 'number' && result.authenticityScore < 50
  if (result.suggestion === 'APPROVE' && (lowQuality || lowAuthenticity)) {
    const reasons: string[] = []
    if (lowQuality) reasons.push(`calidad ${result.qualityScore}/100`)
    if (lowAuthenticity) reasons.push(`autenticidad ${result.authenticityScore}/100`)
    reviews.push({
      doc: docLabel,
      concern: `[gate] Score bajo (${reasons.join(', ')}) — admin revisa antes de aprobar.`,
      docId,
    })
    return
  }

  if (result.suggestion === 'REJECT') {
    rejects.push({
      doc: docLabel,
      reason: result.rejectReasonIfAny ?? result.concerns.join('; ') ?? 'rechazo sin detalle',
      docId,
    })
  } else if (result.suggestion === 'APPROVE') {
    approvals.push({ doc: docLabel, docId })
  } else {
    reviews.push({ doc: docLabel, concern: result.concerns.join('; ') || 'ambiguo', docId })
  }
}

function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim()
}

/**
 * Extrae y normaliza el primer nombre del driver, con fallback sensato.
 * - Evita "Hola Stiven !" por trailing space en `firstName`.
 * - Filtra emojis, signos de puntuación y dígitos para no terminar como "Hola !"
 *   o "Hola 🤙" en mensajes de WhatsApp.
 * - Si después de limpiar no queda nada utilizable, devuelve string vacío.
 */
function getFirstName(driver: { firstName: string | null; fullName: string | null }): string {
  const source = driver.firstName?.trim() || driver.fullName?.trim() || ''
  const cleaned = cleanName(source)
  if (!cleaned) return ''
  // Tomar solo la primera palabra (primer nombre) por si viene fullName
  const firstWord = cleaned.split(' ')[0]
  // Quedarnos solo con letras (incluyendo acentos y ñ); descartar emojis,
  // dígitos y puntuación.
  const letters = firstWord.replace(/[^\p{L}]/gu, '')
  if (!letters) return ''
  // Capitalizar: "yeni" → "Yeni", "STIVEN" → "Stiven"
  return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase()
}

/**
 * Mapea el label humano de imagen ("cédula frente", "cédula dorso", "antecedentes")
 * al tipo de documento canónico usado por la tool propose_request_document_resubmission.
 */
function docLabelToType(
  label: string,
): 'CEDULA' | 'CRIMINAL_RECORD' | null {
  const l = label.toLowerCase()
  if (l.includes('antecedentes')) return 'CRIMINAL_RECORD'
  if (l.includes('cédula') || l.includes('cedula')) return 'CEDULA'
  return null
}

/**
 * Traduce el concern técnico del modelo a una frase corta para el WhatsApp al postulante.
 */
function humanizeQualityReason(concern: string): string {
  const c = concern.toLowerCase()
  if (c.includes('borrosa') || c.includes('blur')) return 'está borrosa'
  if (c.includes('reflejo')) return 'tiene mucho reflejo'
  if (c.includes('ilegible')) return 'no se puede leer bien'
  if (c.includes('oscur')) return 'está muy oscura'
  if (c.includes('ángulo') || c.includes('angulo')) return 'está en ángulo'
  return 'no se ve clara'
}

/**
 * Detecta si el postulante cometió typo al tipear su cédula.
 *
 * Criterios (todos deben cumplirse):
 * 1. Al menos 2 documentos subidos (cédula frente + antecedentes, por ejemplo)
 * 2. Todos los docs con cédula extraída tienen EL MISMO número (consistencia interna)
 * 3. Esa cédula difiere del form por ≤2 caracteres (Levenshtein ≤ 2)
 *
 * Devuelve null si no hay typo detectable.
 */
/**
 * Devuelve el set de cédulas únicas extraídas de los docs (normalizadas).
 * Usado como señal de fraude cuando hay ≥2 distintas que no encajan como typo.
 */
function collectDistinctCedulas(imageResults: Array<ImageValidationResult | null>): string[] {
  const seen = new Set<string>()
  for (const r of imageResults) {
    if (r?.ok && r.extractedDocNumber) {
      const n = normalizeCedula(r.extractedDocNumber)
      if (n) seen.add(n)
    }
  }
  return Array.from(seen)
}

function detectCedulaTypo(
  formCedula: string,
  imageResults: Array<ImageValidationResult | null>,
): { formCedula: string; realCedula: string; editDistance: number; extractedName: string | null } | null {
  const formNorm = normalizeCedula(formCedula)
  if (!formNorm) return null

  const extractedCedulas: string[] = []
  let extractedName: string | null = null
  for (const r of imageResults) {
    if (r?.ok && r.extractedDocNumber) {
      const n = normalizeCedula(r.extractedDocNumber)
      if (n) {
        extractedCedulas.push(n)
        if (!extractedName && r.extractedFullName) extractedName = r.extractedFullName
      }
    }
  }

  if (extractedCedulas.length < 2) return null // Necesitamos ≥2 docs para confirmar

  // Todos los docs deben tener la MISMA cédula (consistencia interna = es la misma persona)
  const firstCedula = extractedCedulas[0]
  const allMatch = extractedCedulas.every((c) => c === firstCedula)
  if (!allMatch) return null

  // No puede ser igual al form (sino no hay typo)
  if (firstCedula === formNorm) return null

  // Mismo largo (típico en typo de un dígito) Y diferencia ≤2
  if (firstCedula.length !== formNorm.length) return null
  const dist = levenshtein(firstCedula, formNorm)
  if (dist === 0 || dist > 2) return null

  return { formCedula: formNorm, realCedula: firstCedula, editDistance: dist, extractedName }
}

/**
 * Levenshtein distance simple (edit distance).
 * Implementación O(n*m) con matriz — suficiente para strings cortos como cédulas (≤10 chars).
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }
  return matrix[a.length][b.length]
}

/**
 * Clasifica un concern del modelo para elegir la acción correcta:
 * - INTERNAL_ERROR: fallo nuestro (PDF rechazado, descarga fallida, etc.) → escalate
 * - EXPIRED: certificado vencido → resubmission específica
 * - QUALITY: imagen borrosa/reflejo/ángulo → resubmission genérica
 * - OTHER: inconsistencia de datos, fecha rara, firma dudosa → escalate (admin decide)
 *
 * Regex cubren español e inglés porque el modelo a veces responde en inglés.
 */
function classifyConcern(
  concernLower: string,
): 'INTERNAL_ERROR' | 'EXPIRED' | 'QUALITY' | 'OTHER' {
  if (
    /pdfs? no soportad|error descarg|error procesando|no se pudo|respuesta no-json|timeout|pdf not supported|pdfs not supported|download error|processing error|failed to (download|process)|provider error|invalid json|no json/i.test(
      concernLower,
    )
  ) {
    return 'INTERNAL_ERROR'
  }
  // EXPIRED: castellano + inglés; "X days later" es común en respuestas del modelo
  if (
    /venci|antigua|antiguo|vencido|90 d|más de \d+ dí|caduc|expired|expir|days later|days passed|\d{2,} days|out of validity|past validity/i.test(
      concernLower,
    )
  ) {
    return 'EXPIRED'
  }
  if (
    /borrosa|blur|reflejo|glare|ilegible|illegible|unreadable|calidad|low quality|oscur|dark|ángulo|angulo|angle|baja resol|low resolution|pixelad|pixelat|distorsion|distortion|rotad|rotated|giro|inclinad|tilted|cropped|recortad|cortad|cut off|cropped out|manchad|stained|dañad|damaged|doblad|folded/i.test(
      concernLower,
    )
  ) {
    return 'QUALITY'
  }
  return 'OTHER'
}

function documentTypeLabelEs(
  docType: 'CEDULA' | 'CRIMINAL_RECORD' | 'TAX_COMPLIANCE',
): string {
  const map: Record<typeof docType, string> = {
    CEDULA: 'cédula',
    CRIMINAL_RECORD: 'certificado de antecedentes',
    TAX_COMPLIANCE: 'certificado tributario',
  }
  return map[docType] ?? docType
}

/**
 * Construye la frase central del WhatsApp cuando pedimos re-submission por
 * calidad/otro motivo (no vencimiento).
 */
function reviewMessageForDoc(
  docType: 'CEDULA' | 'CRIMINAL_RECORD' | 'TAX_COMPLIANCE',
  concern: string,
): string {
  const docEs = documentTypeLabelEs(docType)
  const hint = humanizeQualityReason(concern)
  return `la imagen de ${docEs} ${hint}.`
}

function formatAge(days: number): string {
  if (days < 1) {
    const hours = Math.round(days * 24)
    if (hours < 1) return 'hace menos de una hora'
    if (hours === 1) return 'hace 1 hora'
    return `hace ${hours} horas`
  }
  const d = Math.round(days)
  if (d === 1) return 'hace 1 día'
  return `hace ${d} días`
}

function describeRucStatus(status: string | null | undefined): string {
  const s = (status ?? '').toUpperCase()
  if (s === 'ACTIVO') return ' — el RUC está vigente ✅'
  if (s === 'SUSPENSION TEMPORAL' || s === 'INACTIVO')
    return ' — el postulante tiene que regularizar para poder facturar ⚠️'
  if (s === 'CANCELADO') return ' — el RUC fue dado de baja ❌'
  if (s === 'BLOQUEADO') return ' — el RUC está bloqueado por la autoridad fiscal ❌'
  if (s === 'NO_ENCONTRADO') return ' — el postulante no está registrado en el SET'
  if (s === 'ERROR') return ' — no se pudo consultar (posible problema de red)'
  if (s === 'NOT_CHECKED') return ' — todavía no se consultó'
  if (s === 'NOT_APPLICABLE')
    return ' — postulante extranjero, no aplica SET paraguayo (flujo manual para facturación)'
  return ''
}

function decisionLabel(d: AgentRunDecision): string {
  if (d === 'APPROVED') return 'APROBADA'
  if (d === 'REJECTED') return 'RECHAZADA'
  return 'REVISIÓN MANUAL'
}

function decisionEmoji(d: AgentRunDecision): string {
  if (d === 'APPROVED') return '✅'
  if (d === 'REJECTED') return '❌'
  return '⚠️'
}

function suggestionLabel(s: ImageValidationResult['suggestion']): string {
  if (s === 'APPROVE') return 'Aprobado ✓'
  if (s === 'REJECT') return 'Rechazado ✗'
  if (s === 'MANUAL_REVIEW') return 'Requiere revisión manual'
  return 'Sin sugerencia'
}

function scoreLabel(score: number | null | undefined, kind: 'calidad' | 'autenticidad'): string {
  if (score == null) return ''
  const adj = score >= 80 ? 'alta' : score >= 60 ? 'media' : 'baja'
  return `${kind} ${adj} (${score}/100)`
}

/**
 * Formatea un resultado de imagen como un párrafo en lenguaje natural,
 * con todos los campos relevantes que el modelo extrajo.
 */
function describeImageResult(
  label: string,
  r: ImageValidationResult | null,
  wasSubmitted: boolean,
): string {
  if (!wasSubmitted || !r) return `**${label}:** no fue subida.`
  if (!r.ok) {
    return `**${label}:** no se pudo analizar — ${r.error ?? 'error desconocido'}.`
  }

  const lines: string[] = [`**${label}:** ${suggestionLabel(r.suggestion)}`]

  const scores: string[] = []
  const q = scoreLabel(r.qualityScore, 'calidad')
  const a = scoreLabel(r.authenticityScore, 'autenticidad')
  if (q) scores.push(q)
  if (a) scores.push(a)
  if (scores.length > 0) lines.push(`- Evaluación visual: ${scores.join(', ')}.`)

  if (r.documentTypeDetected) {
    const matchLabel =
      r.matchesExpectedType === true
        ? 'coincide con el tipo esperado ✓'
        : r.matchesExpectedType === false
          ? '⚠️ tipo no esperado'
          : ''
    lines.push(`- Tipo detectado: ${r.documentTypeDetected}${matchLabel ? ` — ${matchLabel}` : ''}.`)
  }

  if (r.extractedDocNumber) {
    const matchLabel =
      r.matchesDriverCedula === true
        ? '✓ coincide con la cédula del formulario'
        : r.matchesDriverCedula === false
          ? '⚠️ no coincide con la cédula del formulario'
          : ''
    lines.push(`- Cédula extraída: ${r.extractedDocNumber}${matchLabel ? ` — ${matchLabel}` : ''}.`)
  }

  if (r.extractedFullName) {
    const matchLabel =
      r.matchesDriverName === true
        ? '✓ coincide con el nombre del formulario'
        : r.matchesDriverName === false
          ? '⚠️ no coincide con el nombre del formulario'
          : ''
    lines.push(`- Nombre extraído: "${r.extractedFullName}"${matchLabel ? ` — ${matchLabel}` : ''}.`)
  }

  if (r.concerns.length > 0) {
    lines.push(`- Observaciones del modelo:`)
    for (const c of r.concerns) lines.push(`  • ${c}`)
  }

  if (r.rejectReasonIfAny && r.suggestion === 'REJECT') {
    lines.push(`- Motivo de rechazo: ${r.rejectReasonIfAny}`)
  }

  return lines.join('\n')
}

function buildCaughtErrorResult(err: unknown): ImageValidationResult {
  const message = err instanceof Error ? err.message : 'Error desconocido'
  return {
    ok: false,
    error: message,
    documentTypeDetected: null,
    matchesExpectedType: null,
    isReadable: null,
    qualityScore: null,
    authenticityScore: null,
    extractedDocNumber: null,
    extractedFullName: null,
    matchesDriverCedula: null,
    matchesDriverName: null,
    concerns: [],
    suggestion: null,
    rejectReasonIfAny: null,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      costMicroUsd: 0,
    },
  }
}

function emptyMetrics() {
  return {
    iterations: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costMicroUsd: 0,
  }
}

// ============================================================================
// Auto-approve: cuando el agente decide APPROVED limpio desde un cron, dispara
// el endpoint /api/agent/auto-approve que aprueba docs + manda WhatsApp. Si las
// condiciones no se cumplen (admin manual, decisión amarilla/roja, overrides),
// las AgentActions quedan PROPOSED para revisión humana — sin cambio de
// comportamiento previo. Las acciones "pasajeras" (informativas) de un APPROVED
// no bloquean el disparo pero tampoco se ejecutan: quedan PROPOSED.
// ============================================================================

const AUTO_APPROVE_TRIGGER_PREFIXES = ['cron:', 'form:'] as const

const AUTO_APPROVE_ALLOWED_TOOLS = new Set<ProposedToolCall['tool']>([
  'propose_approve_document',
  'propose_send_whatsapp_template',
])
// Acciones informativas que pueden acompañar un APPROVED limpio sin bloquear el
// auto-approve (aviso de RUC NO_ENCONTRADO, plantilla capacitaciones inactiva).
// El endpoint NO las ejecuta: quedan PROPOSED para el admin. Sin esto, el caso
// APPROVED más común (RUC no registrado en SET) nunca dispararía el auto-approve
// y el postulante quedaría en "pending" hasta degradar a "en revisión".
const AUTO_APPROVE_PASSENGER_TOOLS = new Set<ProposedToolCall['tool']>([
  'propose_request_document_resubmission',
  'escalate_to_admin',
])
// Solo se considera auto-approvable si las plantillas WhatsApp sugeridas son del
// set "estándar" del flow APPROVED limpio. Cualquier otra cosa queda PROPOSED.
const AUTO_APPROVE_ALLOWED_TEMPLATE_KEYS = new Set<string>(['capacitaciones'])

interface MaybeAutoApproveParams {
  agentRunId: string
  mode: AgentRunMode
  triggeredBy: string
  decision: AgentRunDecision | null
  actions: ProposedToolCall[]
}

async function maybeTriggerAutoApprove(params: MaybeAutoApproveParams): Promise<void> {
  const { agentRunId, mode, triggeredBy, decision, actions } = params

  if (mode !== 'REAL') return
  // 'cron:' = pipeline batch; 'form:' = decisión en tiempo real al completar el
  // form público. El botón admin manda DRY_RUN, así que nunca entra acá.
  if (!AUTO_APPROVE_TRIGGER_PREFIXES.some((p) => triggeredBy.startsWith(p))) return
  if (decision !== 'APPROVED') return
  if (actions.length === 0) return
  if (
    !actions.every(
      (a) => AUTO_APPROVE_ALLOWED_TOOLS.has(a.tool) || AUTO_APPROVE_PASSENGER_TOOLS.has(a.tool),
    )
  ) {
    return
  }
  if (!actions.some((a) => a.tool === 'propose_approve_document')) return
  // Si hay propose_send_whatsapp_template, asegurar que la clave esté en el set permitido.
  const hasUnknownTemplate = actions.some(
    (a) =>
      a.tool === 'propose_send_whatsapp_template' &&
      !AUTO_APPROVE_ALLOWED_TEMPLATE_KEYS.has(a.input.templateKey),
  )
  if (hasUnknownTemplate) return

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.warn('[agent.service] auto-approve skip: CRON_SECRET no configurado', {
      agentRunId,
    })
    return
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000'

  try {
    const response = await fetch(`${baseUrl}/api/agent/auto-approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ agentRunId }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.error('[agent.service] auto-approve falló', {
        agentRunId,
        status: response.status,
        body: text.slice(0, 500),
      })
      return
    }

    const json = (await response.json().catch(() => null)) as
      | { notificationStatus?: string; notificationTriggered?: boolean; alreadyExecuted?: boolean }
      | null
    console.log('[agent.service] auto-approve OK', {
      agentRunId,
      notification:
        json?.notificationStatus ?? (json?.notificationTriggered ? 'triggered' : 'not-triggered'),
      alreadyExecuted: json?.alreadyExecuted ?? false,
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[agent.service] auto-approve excepción', { agentRunId, error: errMsg })
  }
}
