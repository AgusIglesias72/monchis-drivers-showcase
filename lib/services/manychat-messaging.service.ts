// lib/services/manychat-messaging.service.ts

import type { FormDriver, Prisma } from '@prisma/client';
import { WhatsAppMessageStatus, WhatsAppMessageSource, WhatsAppMessageType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getOrCreateManychatSubscriber } from './manychat-subscribers.service';
import { sendFlow as manychatSendFlow } from './manychat.service';

/**
 * Messenger unificado sobre ManyChat.
 *
 * Es el único punto que deben usar los callers de negocio (cron, form/complete, webhooks
 * que emiten respuesta). Encapsula:
 * - Lookup del template por `key` en DB
 * - Resolución del subscriberId vía subscribers service
 * - Envío del Flow
 * - Persistencia de `WhatsAppMessage` con `botId='manychat'` para auditoría
 *
 * No maneja la frecuencia/backoff — eso sigue viviendo en `messaging-frequency.service.ts`
 * y es responsabilidad del caller decidir si este driver es elegible.
 */

const MANYCHAT_BOT_ID = 'manychat';

export type MessengerStatus = 'sent' | 'skipped' | 'failed';

export interface MessengerResult {
  status: MessengerStatus;
  /** Razón del skip/fail legible para logs. */
  reason?: string;
  flowId?: string;
  subscriberId?: string;
  messageId?: string; // ID del WhatsAppMessage persistido, si se persistió
  error?: string;
}

export interface SendFlowByKeyOptions {
  source?: WhatsAppMessageSource;
  /** Qué valor usar en `WhatsAppMessage.messageType`. Default: CUSTOM. */
  messageType?: WhatsAppMessageType;
  /** clerkId del admin (cuando aplica). */
  sentBy?: string;
  /** Annotation legible del paso del funnel. */
  step?: string;
  metadata?: Record<string, unknown>;
}

type DriverFields = Pick<
  FormDriver,
  'id' | 'phoneNumber' | 'firstName' | 'lastName' | 'fullName' | 'manychatSubscriberId'
>;

/**
 * Envía un Flow de ManyChat a un postulante identificado por FormDriver, resolviendo
 * el Flow desde `WhatsAppTemplate.key` y el subscriber desde `FormDriver.manychatSubscriberId`
 * (o creándolo si falta).
 *
 * Semántica de retorno:
 * - `sent`: Flow disparado OK y persistido WhatsAppMessage.
 * - `skipped`: no hay nada que enviar (template no existe, inactivo, sin flow_id cableado).
 *              El caller NO debería incrementar counters ni mover el backoff.
 * - `failed`: hubo una excepción (ManyChat API, DB, etc). Propaga el mensaje de error.
 *              El caller decide si reintenta.
 */
export async function sendFlowByKey(
  driver: DriverFields,
  templateKey: string,
  options: SendFlowByKeyOptions = {}
): Promise<MessengerResult> {
  const template = await prisma.whatsAppTemplate.findUnique({
    where: { key: templateKey },
  });

  if (!template) {
    const reason = `Template "${templateKey}" no existe en DB`;
    console.warn('[MANYCHAT_MSG] skipped', { driverId: driver.id, templateKey, reason });
    return { status: 'skipped', reason };
  }

  if (!template.isActive) {
    const reason = `Template "${templateKey}" está inactivo`;
    console.warn('[MANYCHAT_MSG] skipped', { driverId: driver.id, templateKey, reason });
    return { status: 'skipped', reason };
  }

  if (!template.manychatFlowId) {
    const reason = `Template "${templateKey}" no tiene manychatFlowId configurado (cablear en UI de ManyChat)`;
    console.warn('[MANYCHAT_MSG] skipped', { driverId: driver.id, templateKey, reason });
    return { status: 'skipped', reason };
  }

  let subscriberId: string;
  try {
    subscriberId = await getOrCreateManychatSubscriber(driver);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[MANYCHAT_MSG] resolve subscriber failed', {
      driverId: driver.id,
      templateKey,
      error,
    });
    return { status: 'failed', reason: 'No se pudo resolver/crear subscriber', error };
  }

  try {
    await manychatSendFlow(subscriberId, template.manychatFlowId);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[MANYCHAT_MSG] sendFlow failed', {
      driverId: driver.id,
      templateKey,
      flowId: template.manychatFlowId,
      subscriberId,
      error,
    });
    return {
      status: 'failed',
      reason: 'sendFlow error',
      flowId: template.manychatFlowId,
      subscriberId,
      error,
    };
  }

  // Persistir auditoría. Si esto falla, el flow ya se mandó — solo loggeamos.
  let messageId: string | undefined;
  try {
    const recipientName = driver.fullName || driver.firstName || 'Postulante';
    const recipientPhone = normalizePhone(driver.phoneNumber);

    const record = await prisma.whatsAppMessage.create({
      data: {
        recipientPhone,
        recipientName,
        chatId: `manychat:${subscriberId}`,
        messageType: options.messageType ?? WhatsAppMessageType.CUSTOM,
        step: options.step,
        // No tenemos el texto final (vive dentro del Flow en UI de ManyChat).
        // Guardamos el content del template como aproximación para auditoría.
        message: template.content,
        messageLength: template.content.length,
        status: WhatsAppMessageStatus.SENT,
        formDriverId: driver.id,
        botId: MANYCHAT_BOT_ID,
        source: options.source ?? WhatsAppMessageSource.TRIGGER,
        sentBy: options.sentBy,
        metadata: buildMetadata({
          channel: 'manychat',
          templateKey,
          flowId: template.manychatFlowId,
          subscriberId,
          extra: options.metadata,
        }),
      },
    });
    messageId = record.id;

    // Bump contador de uso del template.
    await prisma.whatsAppTemplate.update({
      where: { id: template.id },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
    });
  } catch (err) {
    console.error('[MANYCHAT_MSG] persist WhatsAppMessage failed (flow ya enviado)', {
      driverId: driver.id,
      templateKey,
      subscriberId,
      error: err instanceof Error ? err.message : err,
    });
  }

  console.log('[MANYCHAT_MSG] sent', {
    driverId: driver.id,
    templateKey,
    flowId: template.manychatFlowId,
    subscriberId,
  });

  return {
    status: 'sent',
    flowId: template.manychatFlowId,
    subscriberId,
    messageId,
  };
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

function buildMetadata(input: {
  channel: string;
  templateKey: string;
  flowId: string;
  subscriberId: string;
  extra?: Record<string, unknown>;
}): Prisma.InputJsonValue {
  return {
    channel: input.channel,
    templateKey: input.templateKey,
    flowId: input.flowId,
    subscriberId: input.subscriberId,
    ...(input.extra ?? {}),
  };
}
