// lib/services/whatsapp-messenger.service.ts
//
// Reemplaza a `manychat-messaging.service.ts` (eliminado). Punto único de entrada
// para enviar mensajes WhatsApp basados en un `WhatsAppTemplate.key` desde la DB.
// Encapsula:
// 1) Lookup del template por key (con `isActive` check).
// 2) Render del `content` interpolando variables del driver.
// 3) Envío via `whatsappBotService` (bot en apps/whatsapp-bot/).
// 4) Persistencia de `WhatsAppMessage` con `botId=WHATSAPP_BOT_ID`.
//
// NO maneja frecuencia/backoff — eso vive en `messaging-frequency.service.ts`
// y el caller decide si el envío es elegible.

import type { FormDriver, Prisma } from '@prisma/client';
import {
  WhatsAppMessageStatus,
  WhatsAppMessageSource,
  WhatsAppMessageType,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatPhoneNumber } from '@/lib/utils/phone';
import { whatsappBotService, WHATSAPP_BOT_ID } from './whatsapp-bot.service';

export type MessengerStatus = 'sent' | 'skipped' | 'failed';

export interface MessengerResult {
  status: MessengerStatus;
  reason?: string;
  messageId?: string;
  error?: string;
}

export interface SendByKeyOptions {
  source?: WhatsAppMessageSource;
  /** Qué valor usar en `WhatsAppMessage.messageType`. Default: CUSTOM. */
  messageType?: WhatsAppMessageType;
  /** clerkId del admin (cuando aplica). */
  sentBy?: string;
  /** Annotation legible del paso del funnel. */
  step?: string;
  /** Variables adicionales para interpolar en el `content` del template. */
  variables?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

type DriverFields = Pick<
  FormDriver,
  'id' | 'phoneNumber' | 'firstName' | 'lastName' | 'fullName'
>;

/**
 * Reemplaza `{var}` en el template por valores del map. Tolera case y caracteres
 * unicode en el nombre. Variables ausentes quedan vacías para no enviar "{xxx}".
 */
function renderTemplate(content: string, variables: Record<string, string>): string {
  return content.replace(/\{([^}]+)\}/g, (_, raw) => {
    const key = String(raw).trim().toLowerCase();
    const v = variables[key];
    return v ?? '';
  });
}

function buildDefaultVariables(driver: DriverFields): Record<string, string> {
  const firstName = driver.firstName || driver.fullName?.split(' ')[0] || 'Postulante';
  return {
    name: firstName,
    nombre: firstName,
    firstname: firstName,
    fullname: driver.fullName || firstName,
    lastname: driver.lastName || '',
    apellido: driver.lastName || '',
  };
}

/**
 * Envía un template a un postulante identificado por FormDriver.
 *
 * Semántica:
 * - `sent`: bot envió OK y se persistió WhatsAppMessage.
 * - `skipped`: nada que enviar (template no existe o inactivo). No bumpea contadores.
 * - `failed`: error de bot/DB. Caller decide si reintenta.
 */
export async function sendTemplateByKey(
  driver: DriverFields,
  templateKey: string,
  options: SendByKeyOptions = {},
): Promise<MessengerResult> {
  const template = await prisma.whatsAppTemplate.findUnique({
    where: { key: templateKey },
  });

  if (!template) {
    const reason = `Template "${templateKey}" no existe en DB`;
    console.warn('[WHATSAPP_MSG] skipped', { driverId: driver.id, templateKey, reason });
    return { status: 'skipped', reason };
  }

  if (!template.isActive) {
    const reason = `Template "${templateKey}" está inactivo`;
    console.warn('[WHATSAPP_MSG] skipped', { driverId: driver.id, templateKey, reason });
    return { status: 'skipped', reason };
  }

  if (!driver.phoneNumber) {
    const reason = 'Driver sin phoneNumber';
    console.warn('[WHATSAPP_MSG] skipped', { driverId: driver.id, templateKey, reason });
    return { status: 'skipped', reason };
  }

  const variables = {
    ...buildDefaultVariables(driver),
    ...(options.variables ?? {}),
  };
  const message = renderTemplate(template.content, variables);

  // El teléfono en DB viene en formato local (ej "0982398492"); el bot necesita
  // el código de país (595...) para resolver el chat. Normalizar acá es lo único
  // que faltaba para que los triggers por template salieran.
  const formattedPhone = formatPhoneNumber(driver.phoneNumber);

  const sendResp = await whatsappBotService.sendMessage({
    phone: formattedPhone,
    message,
    type: (options.messageType ?? WhatsAppMessageType.CUSTOM).toLowerCase(),
  });

  if (!sendResp.success) {
    console.error('[WHATSAPP_MSG] send failed', {
      driverId: driver.id,
      templateKey,
      error: sendResp.error,
    });
    return {
      status: 'failed',
      reason: sendResp.error,
      error: sendResp.error,
    };
  }

  // Persistir auditoría. Si esto falla, el mensaje ya se mandó — solo loggeamos.
  let messageId: string | undefined;
  try {
    const recipientName = driver.fullName || driver.firstName || 'Postulante';
    const chatId = sendResp.data?.chatId || `${formattedPhone}@c.us`;

    const record = await prisma.whatsAppMessage.create({
      data: {
        recipientPhone: formattedPhone,
        recipientName,
        chatId,
        messageType: options.messageType ?? WhatsAppMessageType.CUSTOM,
        step: options.step,
        message,
        messageLength: message.length,
        status: WhatsAppMessageStatus.SENT,
        formDriverId: driver.id,
        botId: WHATSAPP_BOT_ID,
        source: options.source ?? WhatsAppMessageSource.TRIGGER,
        sentBy: options.sentBy,
        sentAt: sendResp.data?.sentAt ? new Date(sendResp.data.sentAt) : new Date(),
        metadata: buildMetadata({
          channel: 'whatsapp-bot',
          templateKey,
          variables,
          extra: options.metadata,
        }),
      },
    });
    messageId = record.id;

    await prisma.whatsAppTemplate.update({
      where: { id: template.id },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
    });
  } catch (err) {
    console.error('[WHATSAPP_MSG] persist failed (mensaje ya enviado)', {
      driverId: driver.id,
      templateKey,
      error: err instanceof Error ? err.message : err,
    });
  }

  console.log('[WHATSAPP_MSG] sent', {
    driverId: driver.id,
    templateKey,
    messageId,
  });

  return { status: 'sent', messageId };
}

/**
 * Construye el texto de aviso de documento rechazado, con el motivo, en el tono
 * de Monchis (cercano, voseo, sin emojis). Usado en el rechazo manual y el de la
 * IA validadora para que el mensaje sea consistente.
 */
export function buildDocumentRejectedMessage(input: {
  firstName: string;
  documentTypeName: string;
  reason?: string | null;
}): string {
  const nombre = input.firstName?.trim() || 'Hola';
  const doc = input.documentTypeName?.trim() || 'documento';
  const motivo = input.reason?.trim();

  let msg = `Hola ${nombre},\n\nRevisamos tu ${doc} y necesitamos que lo vuelvas a subir.`;
  if (motivo) msg += `\n\nMotivo: ${motivo}`;
  msg += `\n\nEntrá al portal y cargalo de nuevo. Cualquier duda, escribinos por acá.`;
  return msg;
}

function buildMetadata(input: {
  channel: string;
  templateKey: string;
  variables: Record<string, string>;
  extra?: Record<string, unknown>;
}): Prisma.InputJsonValue {
  return {
    channel: input.channel,
    templateKey: input.templateKey,
    variables: input.variables,
    ...(input.extra ?? {}),
  };
}
