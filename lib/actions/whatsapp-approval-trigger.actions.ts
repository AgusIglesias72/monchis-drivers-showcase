// lib/actions/whatsapp-approval-trigger.actions.ts
//
// Trigger manual del envío de aprobación ("capacitaciones") desde el admin.
// Equivalente al disparo automático que hace approveAllDocumentsForDriver
// pero sin tocar el status de los documentos — útil cuando:
//  - El lock approvalNotifiedAt quedó tomado pero el envío real falló.
//  - El admin quiere disparar el mensaje antes de aprobar formalmente.
//  - Hay que reintentar porque el postulante perdió el chat.
//
// Auditoría: cada disparo queda registrado en WhatsAppMessage con
// source=MANUAL y sentBy=clerkId del admin.

'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { sendTemplateByKey } from '@/lib/services/whatsapp-messenger.service'
import { WhatsAppMessageSource, WhatsAppMessageType } from '@prisma/client'

const APPROVAL_TEMPLATE_KEY = 'capacitaciones'

export interface TriggerApprovalNotificationParams {
  driverId: string
  /** Si true, reenvía aunque ya se haya marcado approvalNotifiedAt. */
  force?: boolean
}

export type TriggerApprovalNotificationResult =
  | { success: true; status: 'sent'; sentAt: string }
  | { success: false; alreadySent: true; sentAt: string }
  | { success: false; alreadySent?: false; error: string }

export async function triggerApprovalNotification(
  params: TriggerApprovalNotificationParams,
): Promise<TriggerApprovalNotificationResult> {
  // Wrap completo: cualquier excepción no capturada (Clerk, Prisma, runtime)
  // se convierte en { success: false, error } para que el cliente nunca caiga
  // al catch genérico.
  try {
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
        approvalNotifiedAt: true,
      },
    })
    if (!driver) return { success: false, error: 'Postulante no encontrado' }

    if (driver.approvalNotifiedAt && !params.force) {
      return {
        success: false,
        alreadySent: true,
        sentAt: driver.approvalNotifiedAt.toISOString(),
      }
    }

    // Lock optimista: si ya estaba seteado y es reenvío forzado, refrescamos el
    // timestamp; si no estaba, lo tomamos antes de mandar para evitar carrera con
    // el approve manual o el cron.
    const now = new Date()
    await prisma.formDriver.update({
      where: { id: driver.id },
      data: { approvalNotifiedAt: now },
    })

    try {
      const result = await sendTemplateByKey(driver, APPROVAL_TEMPLATE_KEY, {
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

      // skipped o failed → soltar el lock al valor previo para no bloquear
      // futuros intentos.
      await prisma.formDriver
        .update({
          where: { id: driver.id },
          data: { approvalNotifiedAt: driver.approvalNotifiedAt },
        })
        .catch(() => undefined)

      if (result.status === 'skipped') {
        return {
          success: false,
          error: result.reason || 'Mensaje no enviado (plantilla inactiva o sin contenido)',
        }
      }
      return {
        success: false,
        error: result.reason || result.error || 'Falló el envío del mensaje',
      }
    } catch (err) {
      await prisma.formDriver
        .update({
          where: { id: driver.id },
          data: { approvalNotifiedAt: driver.approvalNotifiedAt },
        })
        .catch(() => undefined)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error desconocido al enviar',
      }
    }
  } catch (err) {
    console.error('[APPROVAL_TRIGGER] excepción no esperada', {
      driverId: params.driverId,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    })
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado en el servidor',
    }
  }
}
