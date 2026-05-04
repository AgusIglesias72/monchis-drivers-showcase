// lib/services/document-approval.service.ts
//
// Aprobación masiva de documentos de un FormDriver en un solo paso. Reusa la
// misma semántica que el approve manual (`/api/postulaciones/documents/[id]/approve`):
// pasa cada FormDocument a APPROVED, deja `documentsStatus = APPROVED`, y dispara
// el flow de ManyChat de "capacitaciones" con lock idempotente vía
// `manychatApprovalSentAt`.
//
// Caller principal: el endpoint `/api/agent/auto-approve` cuando el agente IA
// resuelve APPROVED limpio en un cron.

import { prisma } from '@/lib/prisma'
import {
  FormDocumentsStatus,
  WhatsAppMessageSource,
  WhatsAppMessageType,
} from '@prisma/client'
import { sendFlowByKey } from '@/lib/services/manychat-messaging.service'

const POSTULACION_APROBADA_TEMPLATE_KEY = 'capacitaciones'

export interface ApproveAllDocumentsResult {
  driverId: string
  documentsApproved: number
  documentsTotal: number
  documentsStatus: FormDocumentsStatus
  manychatTriggered: boolean
  manychatStatus?: 'sent' | 'skipped' | 'failed'
  manychatReason?: string
}

/**
 * Aprueba todos los documentos de un FormDriver y dispara el flow de aprobación
 * por ManyChat si el driver pasa a `documentsStatus = APPROVED` y aún no se envió.
 *
 * Idempotente:
 * - Si los documentos ya están APPROVED, no los re-toca.
 * - Si `manychatApprovalSentAt` ya está seteado, no reenvía el flow.
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
    manychatTriggered: false,
  }

  if (updatedDriver.manychatApprovalSentAt) {
    return result
  }

  const lockResult = await prisma.formDriver.updateMany({
    where: {
      id: driverId,
      manychatApprovalSentAt: null,
    },
    data: { manychatApprovalSentAt: now },
  })

  if (lockResult.count !== 1) {
    return result
  }

  result.manychatTriggered = true

  try {
    const flowResult = await sendFlowByKey(
      updatedDriver,
      POSTULACION_APROBADA_TEMPLATE_KEY,
      {
        source: WhatsAppMessageSource.TRIGGER,
        messageType: WhatsAppMessageType.APPLICATION_RECEIVED,
        step: 'postulacion_aprobada',
      },
    )
    result.manychatStatus = flowResult.status
    result.manychatReason = flowResult.reason

    if (flowResult.status === 'failed') {
      // Soltar el lock para que un próximo approve (manual o auto) reintente.
      await prisma.formDriver.update({
        where: { id: driverId },
        data: { manychatApprovalSentAt: null },
      })
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[document-approval] Error inesperado enviando ManyChat', {
      driverId,
      error: errMsg,
    })
    await prisma.formDriver
      .update({
        where: { id: driverId },
        data: { manychatApprovalSentAt: null },
      })
      .catch(() => undefined)
    result.manychatStatus = 'failed'
    result.manychatReason = errMsg
  }

  return result
}
