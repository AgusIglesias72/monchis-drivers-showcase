// app/api/webhooks/manychat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import {
  WhatsAppMessageSource,
  WhatsAppMessageStatus,
  WhatsAppMessageType,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Webhook de ManyChat (inbound events).
 *
 * ManyChat no firma sus webhooks con HMAC — la autenticación se hace configurando
 * un header custom en el External Request de la UI. Usamos `x-manychat-secret` con
 * el valor de `MANYCHAT_WEBHOOK_SECRET`.
 *
 * Shape esperado del body (configurable desde el External Request de ManyChat):
 * ```
 * {
 *   "event": "message.received" | "ai_handoff" | "custom_event",
 *   "subscriberId": "123456789",
 *   "phone": "+595981234567",
 *   "text": "Texto del mensaje del usuario",
 *   "metadata": { ... }  // opcional, lo que mandes desde el Flow
 * }
 * ```
 *
 * Cada event se persiste como un `WhatsAppMessage` inbound con `botId='manychat'`
 * y `metadata.direction='inbound'`. El status queda SENT porque el modelo no tiene
 * un estado específico de "received".
 *
 * Importante: el handler tiene que responder rápido (< 5s). No hacemos trabajo pesado
 * acá — solo persistimos y cortamos. Cualquier side-effect (ej. mover estado del driver)
 * se encola para un worker aparte si hace falta.
 */

const MANYCHAT_BOT_ID = 'manychat';

type ManyChatWebhookEvent = 'message.received' | 'ai_handoff' | 'custom_event';

interface ManyChatWebhookPayload {
  event?: string;
  subscriberId?: string;
  phone?: string;
  text?: string;
  metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.MANYCHAT_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error('[MANYCHAT_WEBHOOK] MANYCHAT_WEBHOOK_SECRET no configurado en env');
    return NextResponse.json(
      { error: 'Webhook no configurado en el servidor' },
      { status: 500 }
    );
  }

  // timing-safe comparison para evitar leak por timing del secret.
  const providedSecret = request.headers.get('x-manychat-secret') ?? '';
  const a = Buffer.from(providedSecret);
  const b = Buffer.from(expectedSecret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    console.warn('[MANYCHAT_WEBHOOK] Secret inválido o ausente');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: ManyChatWebhookPayload;
  try {
    payload = (await request.json()) as ManyChatWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const event = (payload.event ?? 'unknown') as ManyChatWebhookEvent | 'unknown';
  const subscriberId = payload.subscriberId;
  const phone = payload.phone;

  // No logueamos phone ni text — son PII; solo metadatos del evento.
  console.log('[MANYCHAT_WEBHOOK] event', {
    event,
    hasSubscriberId: !!subscriberId,
    hasPhone: !!phone,
    hasText: !!payload.text,
    textLen: (payload.text ?? '').length,
  });

  if (!isHandledEvent(event)) {
    // Evento desconocido: aceptamos con 200 para que ManyChat no reintente.
    // No volcamos el payload completo en logs (puede traer PII).
    console.warn('[MANYCHAT_WEBHOOK] evento no manejado', { event });
    return NextResponse.json({ success: true, handled: false });
  }

  try {
    // Resolver FormDriver asociado al subscriber, si lo tenemos mapeado.
    let formDriverId: string | undefined;
    let recipientName = 'Inbound ManyChat';
    if (subscriberId) {
      const driver = await prisma.formDriver.findFirst({
        where: { manychatSubscriberId: subscriberId },
        select: { id: true, fullName: true, firstName: true },
      });
      if (driver) {
        formDriverId = driver.id;
        recipientName = driver.fullName || driver.firstName || recipientName;
      }
    }

    await prisma.whatsAppMessage.create({
      data: {
        recipientPhone: phone ?? '',
        recipientName,
        chatId: subscriberId ? `manychat:${subscriberId}` : 'manychat:unknown',
        messageType: WhatsAppMessageType.CUSTOM,
        message: payload.text ?? `[event=${event}]`,
        messageLength: (payload.text ?? '').length,
        status: WhatsAppMessageStatus.SENT,
        formDriverId,
        botId: MANYCHAT_BOT_ID,
        source: WhatsAppMessageSource.API,
        metadata: {
          direction: 'inbound',
          event,
          subscriberId: subscriberId ?? null,
          ...(payload.metadata ?? {}),
        },
      },
    });

    return NextResponse.json({ success: true, handled: true });
  } catch (err) {
    console.error('[MANYCHAT_WEBHOOK] error persistiendo event', {
      event,
      subscriberId,
      error: err instanceof Error ? err.message : err,
    });
    // Devolvemos 500 para que ManyChat reintente si tiene retry configurado.
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function isHandledEvent(event: string): event is ManyChatWebhookEvent {
  return event === 'message.received' || event === 'ai_handoff' || event === 'custom_event';
}
