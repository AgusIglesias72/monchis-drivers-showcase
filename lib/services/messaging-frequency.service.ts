// lib/services/messaging-frequency.service.ts
// Servicio de control de frecuencia de mensajes con backoff exponencial

import { prisma } from '@/lib/prisma'
import { addDays } from 'date-fns'
import { hasCoreDocsApproved } from './onboarding-eligibility'

// ==================== CONSTANTS ====================

/**
 * Intervalos de backoff exponencial en días.
 * Después del mensaje N, se espera BACKOFF_DAYS[N] días antes del siguiente.
 * Si se superan los intervalos definidos, se usa el último (90 días).
 */
const BACKOFF_DAYS = [1, 3, 7, 30, 60, 90] as const

/**
 * Mapeo de estado del formulario/paso a concepto de mensaje.
 * Determina qué tipo de mensaje enviar según el estado actual del postulante.
 */
export type MessageConcept =
  | 'FORM_STEP_1'         // No completó datos personales
  | 'FORM_STEP_2'         // No completó datos de vehículo
  | 'FORM_STEP_3'         // No completó documentos
  | 'FORM_STEP_4'         // No completó paso final
  | 'FORM_INCOMPLETE'     // Formulario genérico incompleto
  | 'DOCUMENTS_PENDING'   // Documentos pendientes de revisión
  | 'DOCUMENTS_CORRECTIONS' // Documentos con correcciones requeridas
  | 'PAYMENT_PENDING'     // Pago pendiente
  | 'SCHEDULE_CAPACITACION' // Necesita agendar capacitación
  | 'CAPACITACION_REMINDER' // Recordatorio de capacitación agendada
  | 'GENERAL_FOLLOWUP'     // Seguimiento general

// ==================== TYPES ====================

export interface FrequencyCheckResult {
  canContact: boolean
  reason?: string // Si no se puede contactar, la razón
  nextContactDate?: Date // Cuándo se podrá contactar
  messagesSentCount: number
  currentBackoffDays: number
}

export interface MessageConceptResult {
  concept: MessageConcept
  description: string // Descripción legible del concepto
}

export interface ContactRecordResult {
  success: boolean
  messagesSentCount: number
  noContactBefore: Date
  backoffDays: number
}

// ==================== CORE FUNCTIONS ====================

/**
 * Calcula los días de backoff según la cantidad de mensajes enviados.
 * Usa el array BACKOFF_DAYS indexado por messagesSentCount.
 * Si se excede el array, usa el último valor (90 días).
 */
export function getBackoffDays(messagesSentCount: number): number {
  if (messagesSentCount < 0) return BACKOFF_DAYS[0]
  if (messagesSentCount >= BACKOFF_DAYS.length) {
    return BACKOFF_DAYS[BACKOFF_DAYS.length - 1]
  }
  return BACKOFF_DAYS[messagesSentCount]
}

/**
 * Verifica si un postulante puede ser contactado ahora.
 * Chequea el campo noContactBefore contra la fecha actual.
 */
export async function canContactDriver(formDriverId: string): Promise<FrequencyCheckResult> {
  const driver = await prisma.formDriver.findUnique({
    where: { id: formDriverId },
    select: {
      messagesSentCount: true,
      noContactBefore: true,
      lastMessageSentAt: true,
    },
  })

  if (!driver) {
    return {
      canContact: false,
      reason: 'Driver no encontrado',
      messagesSentCount: 0,
      currentBackoffDays: BACKOFF_DAYS[0],
    }
  }

  const now = new Date()
  const backoffDays = getBackoffDays(driver.messagesSentCount)

  // Si tiene noContactBefore y aún no pasó esa fecha
  if (driver.noContactBefore && driver.noContactBefore > now) {
    return {
      canContact: false,
      reason: `En período de backoff. Próximo contacto: ${driver.noContactBefore.toISOString()}`,
      nextContactDate: driver.noContactBefore,
      messagesSentCount: driver.messagesSentCount,
      currentBackoffDays: backoffDays,
    }
  }

  return {
    canContact: true,
    messagesSentCount: driver.messagesSentCount,
    currentBackoffDays: backoffDays,
  }
}

/**
 * Registra que se envió un mensaje automático a un postulante.
 * Incrementa messagesSentCount, actualiza lastMessageSentAt
 * y calcula noContactBefore según el backoff exponencial.
 */
export async function recordMessageSent(formDriverId: string): Promise<ContactRecordResult> {
  // Obtener el count actual
  const driver = await prisma.formDriver.findUnique({
    where: { id: formDriverId },
    select: { messagesSentCount: true },
  })

  if (!driver) {
    throw new Error(`Driver ${formDriverId} no encontrado`)
  }

  const newCount = driver.messagesSentCount + 1
  const backoffDays = getBackoffDays(newCount) // backoff para DESPUÉS del mensaje que acabamos de enviar
  const noContactBefore = addDays(new Date(), backoffDays)

  await prisma.formDriver.update({
    where: { id: formDriverId },
    data: {
      messagesSentCount: newCount,
      lastMessageSentAt: new Date(),
      noContactBefore,
    },
  })

  return {
    success: true,
    messagesSentCount: newCount,
    noContactBefore,
    backoffDays,
  }
}

/**
 * Obtiene los postulantes elegibles para contactar según la frecuencia y estado.
 * Combina el check de noContactBefore con la evaluación del concepto de mensaje.
 *
 * Criterios:
 * - noContactBefore es null o ya pasó
 * - No está en estado terminal (onboardingStatus: COMPLETED, IN_PROGRESS)
 * - Tiene teléfono válido
 */
export async function getEligibleDriversForContact(limit: number = 20): Promise<Array<{
  id: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  phoneNumber: string
  accessToken: string | null
  messagesSentCount: number
  concept: MessageConceptResult
}>> {
  const now = new Date()

  // Buscar drivers que pueden ser contactados
  const drivers = await prisma.formDriver.findMany({
    where: {
      // noContactBefore ya pasó o nunca fue seteado
      OR: [
        { noContactBefore: null },
        { noContactBefore: { lte: now } },
      ],
      // El form a medias (IN_PROGRESS) lo maneja el cron remind-abandoned (cada
      // 20 min). Acá solo seguimos a los que ya completaron el form: docs, pago,
      // capacitación. Así ambos crons trabajan en conjunto sin pisarse.
      status: { not: 'IN_PROGRESS' },
      // No en estado terminal de onboarding
      NOT: {
        onboardingStatus: { in: ['COMPLETED', 'IN_PROGRESS'] },
      },
      // Tiene teléfono
      phoneNumber: { not: '' },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      phoneNumber: true,
      accessToken: true,
      messagesSentCount: true,
      status: true,
      currentStep: true,
      documentsStatus: true,
      onboardingStatus: true,
      equipmentPayments: {
        select: { status: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      documents: {
        select: { documentType: true, status: true },
      },
      onboardingAttendances: {
        where: {
          status: { in: ['INVITED', 'CONFIRMED', 'SCHEDULED'] },
        },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: [
      { messagesSentCount: 'asc' }, // Priorizar los que recibieron menos mensajes
      { createdAt: 'asc' },          // Luego los más antiguos
    ],
    take: limit * 2, // Tomamos más para filtrar después
  })

  // Evaluar concepto de mensaje para cada driver
  const eligible: Array<{
    id: string
    firstName: string | null
    lastName: string | null
    fullName: string | null
    phoneNumber: string
    accessToken: string | null
      messagesSentCount: number
    concept: MessageConceptResult
  }> = []

  for (const driver of drivers) {
    if (eligible.length >= limit) break

    const concept = resolveMessageConceptFromData(driver)
    if (!concept) continue

    eligible.push({
      id: driver.id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      fullName: driver.fullName,
      phoneNumber: driver.phoneNumber,
      accessToken: driver.accessToken,
      messagesSentCount: driver.messagesSentCount,
      concept,
    })
  }

  return eligible
}

/**
 * Resuelve el concepto de mensaje directamente desde los datos del driver
 * sin hacer una query adicional a la DB.
 */
function resolveMessageConceptFromData(driver: {
  status: string
  currentStep: number
  documentsStatus: string
  onboardingStatus: string | null
  equipmentPayments: Array<{ status: string }>
  onboardingAttendances: Array<{ id: string }>
  documents: Array<{ documentType: string; status: string }>
}): MessageConceptResult | null {
  // 1. Formulario incompleto
  if (driver.status === 'IN_PROGRESS') {
    switch (driver.currentStep) {
      case 1:
        return { concept: 'FORM_STEP_1', description: 'Completar datos personales' }
      case 2:
        return { concept: 'FORM_STEP_2', description: 'Completar datos de vehículo' }
      case 3:
        return { concept: 'FORM_STEP_3', description: 'Subir documentos requeridos' }
      case 4:
        return { concept: 'FORM_STEP_4', description: 'Completar paso final del formulario' }
      default:
        return { concept: 'FORM_INCOMPLETE', description: 'Completar formulario de postulación' }
    }
  }

  // 2. Si ya tiene una reserva activa, NO lo contactamos desde el cron diario:
  // el recordatorio de la sesión lo manda send-session-reminders.
  if (driver.onboardingAttendances.length > 0) {
    return null
  }

  // 3. Documentos: SOLO si los core docs (cédula + antecedentes) NO están
  // aprobados. Si ya están aprobados (verde/azul = "postulación aprobada"), se
  // bypassea el mensaje de documentos aunque el documentsStatus agregado siga en
  // PENDING/IN_REVIEW (p.ej. tributario pendiente). A esos los agenda el cron
  // reengage-scheduling.
  const coreApproved = hasCoreDocsApproved(driver.documents)
  if (!coreApproved) {
    if (driver.documentsStatus === 'CORRECTIONS') {
      return { concept: 'DOCUMENTS_CORRECTIONS', description: 'Corregir documentos rechazados' }
    }
    if (driver.documentsStatus === 'PENDING' || driver.documentsStatus === 'IN_REVIEW') {
      return { concept: 'DOCUMENTS_PENDING', description: 'Documentos en revisión' }
    }
  }

  // 4. Pago pendiente (paso real aunque los docs estén aprobados).
  const latestPayment = driver.equipmentPayments[0]
  if (latestPayment && latestPayment.status === 'PENDING') {
    return { concept: 'PAYMENT_PENDING', description: 'Pago pendiente de verificación' }
  }

  // 5. Agendamiento: lo maneja el cron reengage-scheduling (segmentos "Pendiente
  // de Agendar" y "No Asistieron"), cada 30 min, no este cron diario.
  return null
}

/**
 * Postulaciones "abandonadas": formulario a medias (status IN_PROGRESS) que no
 * tuvo movimiento en un rato. Para el cron de recordatorio cada 20 min.
 *
 * Criterios (todos deben cumplirse):
 * - status = IN_PROGRESS (nunca terminó el formulario).
 * - startedAt hace al menos `staleHours` horas (le dimos margen para volver solo)
 *   pero no más de `maxAgeDays` días (no perseguir abandonos viejos: molesta al
 *   postulante y, con un bot no oficial, dispara el volumen y el riesgo de ban).
 * - lastActivityAt hace al menos `staleHours` horas (sin modificaciones recientes,
 *   así no le escribimos justo cuando está completando el form).
 * - noContactBefore null o ya pasó (respeta el backoff exponencial compartido).
 * - tiene teléfono.
 *
 * NOTA: lastActivityAt es @updatedAt; cuando se le manda el recordatorio
 * (recordMessageSent) se bumpea, lo que junto al noContactBefore evita reenviar
 * dentro de las próximas `staleHours`/backoff.
 */
export async function getAbandonedFormDrivers(
  limit: number = 10,
  staleHours: number = 24,
  maxAgeDays: number = 30,
): Promise<Array<{
  id: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  phoneNumber: string
  messagesSentCount: number
}>> {
  const now = new Date()
  const staleCutoff = new Date(now.getTime() - staleHours * 60 * 60 * 1000)
  const oldestStart = new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000)

  return prisma.formDriver.findMany({
    where: {
      status: 'IN_PROGRESS',
      // Iniciada hace ≥ staleHours pero ≤ maxAgeDays.
      startedAt: { lte: staleCutoff, gte: oldestStart },
      lastActivityAt: { lte: staleCutoff },
      OR: [{ noContactBefore: null }, { noContactBefore: { lte: now } }],
      phoneNumber: { not: '' },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      phoneNumber: true,
      messagesSentCount: true,
    },
    orderBy: [
      { messagesSentCount: 'asc' }, // primero los que recibieron menos
      { startedAt: 'asc' },          // y dentro de eso, los más antiguos
    ],
    take: limit,
  })
}

/**
 * Resetea el contador de mensajes y el noContactBefore de un postulante.
 * Útil cuando el postulante realiza una acción (completa un paso, sube documentos, etc.)
 * para que pueda recibir mensajes relevantes a su nuevo estado.
 */
export async function resetMessageFrequency(formDriverId: string): Promise<void> {
  await prisma.formDriver.update({
    where: { id: formDriverId },
    data: {
      messagesSentCount: 0,
      noContactBefore: null,
    },
  })
}
