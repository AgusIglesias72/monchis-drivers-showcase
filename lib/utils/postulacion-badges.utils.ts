// lib/utils/postulacion-badges.utils.ts

import { PostulacionBadgeType } from "@/types/postulacion-badges.types"

export type BadgeType = PostulacionBadgeType

interface PostulacionBadges {
  badges: PostulacionBadgeType[]
  priority: number
}

/**
 * Calcula los badges que debe mostrar una postulación
 * SIEMPRE retorna 3 badges (Documentos, Pago, Facturación)
 */
export function calculatePostulacionBadges(postulacion: any): PostulacionBadges {
  const badges: PostulacionBadgeType[] = []
  let priority = 0

  // ✅ REMOVIDO: Ya no validamos si está completada
  // Los badges se muestran siempre, solo cambia el color según el estado

  // 1️⃣ DOCUMENTOS - SIEMPRE mostrar
  const docBadge = getDocumentsBadge(postulacion)
  badges.push(docBadge)
  if (docBadge === 'DOCUMENTOS_PENDIENTES') priority += 100
  else if (docBadge === 'DOCUMENTOS_EN_REVISION') priority += 50

  // 2️⃣ PAGO - SIEMPRE mostrar
  const paymentBadge = getPaymentBadge(postulacion)
  badges.push(paymentBadge)
  if (paymentBadge === 'PAGO_PENDIENTE') priority += 80
  else if (paymentBadge === 'PAGO_EN_VERIFICACION') priority += 40

  // 3️⃣ FACTURACIÓN - SIEMPRE mostrar
  const invoiceBadge = getInvoiceBadge(postulacion)
  badges.push(invoiceBadge)
  if (invoiceBadge === 'FACTURACION_PENDIENTE') priority += 30

  return { badges, priority }
}

/**
 * Determina el estado de documentos (SIEMPRE retorna un estado)
 * Solo evalúa documentos principales: CRIMINAL_RECORD, CEDULA_FRONT, CEDULA_BACK
 */
function getDocumentsBadge(postulacion: any): BadgeType {
  const documents = postulacion.documents || []
  
  // Filtrar solo documentos principales
  const criminalRecords = documents.filter((d: any) => d.documentType === 'CRIMINAL_RECORD')
  const cedulaFront = documents.filter(
    (d: any) => d.documentType === 'CEDULA_FRONT' || d.documentType === 'CEDULA',
  )
  const cedulaBack = documents.filter((d: any) => d.documentType === 'CEDULA_BACK')

  // Verificar documentos requeridos (CEDULA_BACK es opcional)
  const hasCriminalRecord = criminalRecords.length > 0
  const hasCedula = cedulaFront.length > 0 || cedulaBack.length > 0
  
  // Si faltan documentos requeridos → ROJO
  if (!hasCriminalRecord || !hasCedula) {
    return 'DOCUMENTOS_PENDIENTES' // Rojo
  }
  
  // Documentos principales (solo los que existen)
  const mainDocuments = [...criminalRecords, ...cedulaFront, ...cedulaBack]
  
  // Si alguno está rechazado → ROJO
  const hasRejected = mainDocuments.some((d: any) => d.status === 'REJECTED')
  if (hasRejected) {
    return 'DOCUMENTOS_PENDIENTES' // Rojo
  }
  
  // Si alguno está pendiente o en revisión → AMARILLO
  const hasPending = mainDocuments.some((d: any) => 
    d.status === 'PENDING' || d.status === 'IN_REVIEW'
  )
  if (hasPending) {
    return 'DOCUMENTOS_EN_REVISION' // Amarillo
  }
  
  // Si todos están aprobados → VERDE
  const allApproved = mainDocuments.every((d: any) => d.status === 'APPROVED')
  if (allApproved) {
    return 'DOCUMENTOS_COMPLETOS' // Verde
  }
  
  // Default → ROJO
  return 'DOCUMENTOS_PENDIENTES'
}

/**
 * Determina el estado de pago (SIEMPRE retorna un estado)
 */
function getPaymentBadge(postulacion: any): BadgeType {
  const payment = postulacion.equipmentPayments?.[0]
  
  if (!payment) {
    return 'PAGO_PENDIENTE' // Rojo: No hay registro de pago
  }

  const status = payment.status

  // Estados: PENDING, VERIFIED, REJECTED, PARTIAL
  if (status === 'VERIFIED') return 'PAGO_COMPLETO' // Verde
  if (status === 'PENDING' || status === 'PARTIAL') return 'PAGO_EN_VERIFICACION' // Morado
  if (status === 'REJECTED') return 'PAGO_PENDIENTE' // Rojo
  
  return 'PAGO_PENDIENTE' // Default rojo
}

/**
 * Determina el estado de facturación (SIEMPRE retorna un estado)
 */
function getInvoiceBadge(postulacion: any): BadgeType {
  const financial = postulacion.financialService
  const documents = postulacion.documents || []

  // Si el admin marcó "RUC Inactivo" (postulante se comprometió a regularizar),
  // el certificado tributario se da por satisfecho.
  if (postulacion.rucInactiveWaived) {
    return 'FACTURACION_COMPLETA'
  }

  // Buscar documento TAX_COMPLIANCE
  const taxDoc = documents.find((d: any) => d.documentType === 'TAX_COMPLIANCE')

  // Si existe el documento TAX_COMPLIANCE y está aprobado → Verde
  if (taxDoc && taxDoc.status === 'APPROVED') {
    return 'FACTURACION_COMPLETA'
  }
  
  // Si existe pero no está aprobado (PENDING, IN_REVIEW) → Amarillo
  if (taxDoc && (taxDoc.status === 'PENDING' || taxDoc.status === 'IN_REVIEW')) {
    return 'FACTURACION_PENDIENTE' // Podríamos crear 'FACTURACION_EN_REVISION' si querés
  }
  
  // Si NO hay registro financiero → Pendiente
  if (!financial) {
    return 'FACTURACION_PENDIENTE'
  }

  // Si NO puede facturar (hasInvoice = false) → N/A (gris)
  if (!financial.hasInvoice) {
    return 'FACTURACION_NA'
  }

  // Si puede facturar pero no tiene documento → Naranja
  return 'FACTURACION_PENDIENTE'
}