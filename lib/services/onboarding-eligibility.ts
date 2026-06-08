// lib/services/onboarding-eligibility.ts
//
// Lógica única para decidir si un FormDriver puede reservar capacitación. La
// usan tanto el endpoint de booking (/api/public/booking) como los flows de
// identidad (/api/public/auth/identify y /from-portal-token), y el modal de
// confirmación. Mantenerla en un solo lugar evita que las 3 fuentes diverjan.
//
// Reglas (con OR — alcanza con que cumpla una):
//   1. assistedCompletion === true
//      → un admin completó la postulación a mano; habilitada para reservar
//   2. status ∈ {APPROVED, READY_ONBOARDING, ONBOARDING, ACTIVE}
//      → la postulación ya pasó la revisión humana
//   3. documentsStatus === APPROVED
//      → el bot de IA o un admin aprobó todos los docs
//   4. documents tienen CEDULA y CRIMINAL_RECORD individualmente APPROVED
//      → fallback para postulaciones intermedias
//
// Si está REJECTED, no puede reservar nunca. Si todavía le falta nombre o
// apellido, lo bloqueamos para no romper el form de confirmación.

import type { FormDriverStatus, FormDocumentsStatus } from '@prisma/client'

export interface EligibilityResult {
  isEligible: boolean
  reason: string | null
}

interface EligibilityInput {
  status: FormDriverStatus
  documentsStatus: FormDocumentsStatus
  firstName: string | null
  lastName: string | null
  documents: Array<{ documentType: string; status: string }>
  /** Postulación completada de forma asistida por un admin → habilitada a reservar. */
  assistedCompletion?: boolean
}

const APPROVED_FORM_DRIVER_STATUSES = new Set<FormDriverStatus>([
  'APPROVED',
  'READY_ONBOARDING',
  'ONBOARDING',
  'ACTIVE',
])

/**
 * "Postulación aprobada" a efectos de agendar: cédula Y antecedentes tienen al
 * menos un documento APPROVED. Equivale a los estados verde/azul del filtro
 * "Pendiente de Agendar" del admin (el cert. tributario solo separa verde de
 * azul, no condiciona el agendamiento).
 *
 * Sirve para el bypass del mensaje "te faltan documentos": un postulante con los
 * core docs aprobados pero con el `documentsStatus` agregado en PENDING/IN_REVIEW
 * (p.ej. tributario pendiente = azul) NO debe recibir el recordatorio de
 * documentos — ya está listo para agendar.
 */
export function hasCoreDocsApproved(
  documents: Array<{ documentType: string; status: string }>,
): boolean {
  const cedulaOk = documents.some(
    (d) => d.documentType === 'CEDULA' && d.status === 'APPROVED',
  )
  const antecedentesOk = documents.some(
    (d) =>
      (d.documentType === 'CRIMINAL_RECORD' || d.documentType === 'ANTECEDENTES') &&
      d.status === 'APPROVED',
  )
  return cedulaOk && antecedentesOk
}

export function checkEligibility(input: EligibilityInput): EligibilityResult {
  if (input.status === 'REJECTED') {
    return { isEligible: false, reason: 'Tu postulación fue rechazada' }
  }
  if (!input.firstName || !input.lastName) {
    return { isEligible: false, reason: 'Completá tu nombre y apellido en el portal' }
  }

  // 1. Postulación asistida por un admin → habilitada a reservar
  if (input.assistedCompletion) {
    return { isEligible: true, reason: null }
  }

  // 2. Status del FormDriver indica postulación aprobada
  if (APPROVED_FORM_DRIVER_STATUSES.has(input.status)) {
    return { isEligible: true, reason: null }
  }

  // 2. documentsStatus = APPROVED (bot IA o admin aprobó todos los docs)
  if (input.documentsStatus === 'APPROVED') {
    return { isEligible: true, reason: null }
  }

  // 3. Cédula + antecedentes individualmente aprobados (fallback)
  const cedulaOk = input.documents.some(
    (d) => d.documentType === 'CEDULA' && d.status === 'APPROVED',
  )
  const criminalOk = input.documents.some(
    (d) => d.documentType === 'CRIMINAL_RECORD' && d.status === 'APPROVED',
  )
  if (cedulaOk && criminalOk) {
    return { isEligible: true, reason: null }
  }

  return {
    isEligible: false,
    reason: 'Aún tenemos pasos por revisar de tu postulación',
  }
}
