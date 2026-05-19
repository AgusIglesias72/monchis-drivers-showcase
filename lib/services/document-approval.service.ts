// lib/services/document-approval.service.ts
//
// Aprobación masiva de documentos de un FormDriver en un solo paso. Reusa la
// misma semántica que el approve manual (`/api/postulaciones/documents/[id]/approve`):
// pasa cada FormDocument a APPROVED, deja `documentsStatus = APPROVED`, y dispara
// el mensaje de WhatsApp de "capacitaciones" con lock idempotente vía
// `approvalNotifiedAt`.
//
// Caller principal: el endpoint `/api/agent/auto-approve` cuando el agente IA
// resuelve APPROVED limpio en un cron.

import { prisma } from '@/lib/prisma'
import {
  FormDocumentsStatus,
  WhatsAppMessageSource,
  WhatsAppMessageType,
} from '@prisma/client'
import { sendTemplateByKey } from '@/lib/services/whatsapp-messenger.service'

const POSTULACION_APROBADA_TEMPLATE_KEY = 'capacitaciones'

export interface ApproveAllDocumentsResult {
  driverId: string
  documentsApproved: number
  documentsTotal: number
  documentsStatus: FormDocumentsStatus
  notificationTriggered: boolean
  notificationStatus?: 'sent' | 'skipped' | 'failed'
  notificationReason?: string
}

/**
 * Aprueba todos los documentos de un FormDriver y dispara el mensaje de aprobación
 * por el bot WhatsApp si el driver pasa a `documentsStatus = APPROVED` y aún no
 * se envió.
 *
 * Idempotente:
 * - Si los documentos ya están APPROVED, no los re-toca.
 * - Si `approvalNotifiedAt` ya está seteado, no re-envía el mensaje.
 *
 * Lanza si el driver no existe o no tiene documentos cargados.
 */
export async function approveAllDocumentsForDriver(
  driverId: string,
): Promise<ApproveAllDocumentsResult> {
  const driver = await prisma.formDriver.findUnique({
    where: { id: driverId },
    include: { documents: true },
  })

  if (!driver) {
    throw new Error(`FormDriver ${driverId} no encontrado`)
  }
  if (driver.documents.length === 0) {
    throw new Error(`FormDriver ${driverId} no tiene documentos para aprobar`)
  }

  const now = new Date()
  const docsToApprove = driver.documents.filter((d) => d.status !== 'APPROVED')

  if (docsToApprove.length > 0) {
    await prisma.formDocument.updateMany({
      where: {
        id: { in: docsToApprove.map((d) => d.id) },
      },
      data: {
        status: 'APPROVED',
        reviewedAt: now,
        rejectionReason: null,
      },
    })
  }

  const updatedDriver = await prisma.formDriver.update({
    where: { id: driverId },
    data: { documentsStatus: FormDocumentsStatus.APPROVED },
  })

  const result: ApproveAllDocumentsResult = {
    driverId,
    documentsApproved: docsToApprove.length,
    documentsTotal: driver.documents.length,
    documentsStatus: updatedDriver.documentsStatus,
    notificationTriggered: false,
  }

  if (updatedDriver.approvalNotifiedAt) {
    return result
  }

  const lockResult = await prisma.formDriver.updateMany({
    where: {
      id: driverId,
      approvalNotifiedAt: null,
    },
    data: { approvalNotifiedAt: now },
  })

  if (lockResult.count !== 1) {
    return result
  }

  result.notificationTriggered = true

  try {
    const sendResult = await sendTemplateByKey(
      updatedDriver,
      POSTULACION_APROBADA_TEMPLATE_KEY,
      {
        source: WhatsAppMessageSource.TRIGGER,
        messageType: WhatsAppMessageType.APPLICATION_RECEIVED,
        step: 'postulacion_aprobada',
      },
    )
    result.notificationStatus = sendResult.status
    result.notificationReason = sendResult.reason

    // Liberar el lock en CUALQUIER caso que no haya enviado: failed (error del
    // bot) o skipped (template mal cableado: no existe en DB o inactivo). Sin esta
    // liberación, si el template estaba mal configurado el driver queda con el
    // lock seteado permanentemente y nunca recibe el mensaje aunque se arregle
    // el template después.
    if (sendResult.status !== 'sent') {
      await prisma.formDriver.update({
        where: { id: driverId },
        data: { approvalNotifiedAt: null },
      })
      result.notificationTriggered = false
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[document-approval] Error inesperado enviando WhatsApp', {
      driverId,
      error: errMsg,
    })
    await prisma.formDriver
      .update({
        where: { id: driverId },
        data: { approvalNotifiedAt: null },
      })
      .catch(() => undefined)
    result.notificationStatus = 'failed'
    result.notificationReason = errMsg
  }

  return result
}
