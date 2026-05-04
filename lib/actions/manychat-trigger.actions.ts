// lib/actions/manychat-trigger.actions.ts
//
// Trigger manual del flow ManyChat de aprobación ("capacitaciones") desde el
// admin. Equivalente al disparo automático que hace approveAllDocumentsForDriver
// pero sin tocar el status de los documentos — útil cuando:
//  - El lock manychatApprovalSentAt quedó tomado pero el envío real falló.
//  - El admin quiere disparar el flow antes de aprobar formalmente.
//  - Hay que reintentar porque el postulante perdió el chat.
//
// Auditoría: cada disparo queda registrado en WhatsAppMessage con
// source=MANUAL y sentBy=clerkId del admin.

'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { sendFlowByKey } from '@/lib/services/manychat-messaging.service'
import { WhatsAppMessageSource, WhatsAppMessageType } from '@prisma/client'

const APPROVAL_TEMPLATE_KEY = 'capacitaciones'

export interface TriggerManychatApprovalParams {
  driverId: string
  /** Si true, reenvía aunque ya se haya marcado manychatApprovalSentAt. */
  force?: boolean
}

export type TriggerManychatApprovalResult =
  | { success: true; status: 'sent'; sentAt: string }
  | { success: false; alreadySent: true; sentAt: string }
  | { success: false; alreadySent?: false; error: string }

export async function triggerManychatApprovalFlow(
  params: TriggerManychatApprovalParams,
): Promise<TriggerManychatApprovalResult> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: 'No autorizado' }

  const driver = await prisma.formDriver.findUnique({
    where: { id: params.driverId },
    select: {
      id: true,
      phoneNumber: true,
      firstName: true,
      lastName: true,
      fullName: true,
      manychatSubscriberId: true,
      manychatApprovalSentAt: true,
    },
  })
  if (!driver) return { success: false, error: 'Postulante no encontrado' }

  if (driver.manychatApprovalSentAt && !params.force) {
    return {
      success: false,
      alreadySent: true,
      sentAt: driver.manychatApprovalSentAt.toISOString(),
    }
  }

  // Lock optimista: si ya estaba seteado y es reenvío forzado, refrescamos el
  // timestamp; si no estaba, lo tomamos antes de mandar para evitar carrera con
  // el approve manual o el cron.
  const now = new Date()
  await prisma.formDriver.update({
    where: { id: driver.id },
    data: { manychatApprovalSentAt: now },
  })

  try {
    const result = await sendFlowByKey(driver, APPROVAL_TEMPLATE_KEY, {
      source: WhatsAppMessageSource.MANUAL,
      sentBy: userId,
      messageType: WhatsAppMessageType.APPLICATION_RECEIVED,
      step: params.force
        ? 'manual_trigger:postulacion_aprobada:resend'
        : 'manual_trigger:postulacion_aprobada',
    })

    if (result.status === 'sent') {
      return { success: true, status: 'sent', sentAt: now.toISOString() }
    }

    // skipped o failed → soltar el lock para no bloquear futuros intentos.
    await prisma.formDriver
      .update({
        where: { id: driver.id },
        data: { manychatApprovalSentAt: driver.manychatApprovalSentAt },
      })
      .catch(() => undefined)

    if (result.status === 'skipped') {
      return {
        success: false,
        error: result.reason || 'Mensaje no enviado (plantilla inactiva o sin flow ID configurado)',
      }
    }
    return {
      success: false,
      error: result.error || result.reason || 'Falló el envío del flow ManyChat',
    }
  } catch (err) {
    await prisma.formDriver
      .update({
        where: { id: driver.id },
        data: { manychatApprovalSentAt: driver.manychatApprovalSentAt },
      })
      .catch(() => undefined)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}
