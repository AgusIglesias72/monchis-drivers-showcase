// app/api/whatsapp/webhook/route.ts
//
// Recibe los mensajes ENTRANTES que el bot WhatsApp (apps/whatsapp-bot/) reenvía
// cuando un postulante le escribe. El bot postea con:
//   header  X-Webhook-Source: whatsapp-bot
//   body    { from, fromName, message, timestamp, isGroup, messageId, hasMedia, type }
//
// El bot ya filtra notificaciones del sistema (type notification_template, body
// vacío, @lid). Acá aplicamos una capa más de relevancia: solo nos importan los
// mensajes de gente con la que tenemos una relación activa, definida como:
//   (a) tiene una postulación activa (FormDriver no en estado terminal), o
//   (b) le enviamos un mensaje en las últimas 24h (conversación abierta).
// El resto se reconoce y descarta (no spameamos a desconocidos ni guardamos ruido).
//
// Persistencia formal de inbound queda pendiente: el modelo WhatsAppMessage es
// outbound-only (sin campo `direction`). Por ahora registramos vía log.
//
// Seguridad: si está seteado WHATSAPP_WEBHOOK_SECRET, se exige X-Webhook-Secret.
// Si no, cae al check de X-Webhook-Source.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface InboundPayload {
  from: string
  fromName?: string
  message?: string
  timestamp?: string
  isGroup?: boolean
  messageId?: string
  hasMedia?: boolean
  type?: string
}

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000 // 1 día

/** "595984...@c.us" → "595984..." (solo dígitos). Vacío si no es un teléfono real. */
function phoneFromWid(from: string): string {
  if (!from.endsWith('@c.us')) return '' // @lid u otros no traen teléfono usable
  return from.replace(/@c\.us$/, '').replace(/\D/g, '')
}

type Relevance =
  | { relevant: true; reason: 'active_application' | 'recent_conversation'; driverId: string | null }
  | { relevant: false; reason: string }

async function assessRelevance(phone: string): Promise<Relevance> {
  // Matcheamos por los últimos 8 dígitos para tolerar diferencias de prefijo
  // (0, 9, código de país) entre cómo guardamos el número y cómo llega del bot.
  const tail = phone.slice(-8)
  if (!tail) return { relevant: false, reason: 'no_phone' }

  // (a) Postulación activa: existe FormDriver y no está en estado terminal.
  const driver = await prisma.formDriver.findFirst({
    where: { phoneNumber: { contains: tail } },
    select: { id: true, onboardingStatus: true, status: true },
    orderBy: { lastActivityAt: 'desc' },
  })

  if (driver) {
    const terminal = driver.onboardingStatus === 'COMPLETED'
    if (!terminal) {
      return { relevant: true, reason: 'active_application', driverId: driver.id }
    }
  }

  // (b) Conversación abierta: le mandamos algo en las últimas 24h.
  const recent = await prisma.whatsAppMessage.findFirst({
    where: {
      recipientPhone: { contains: tail },
      sentAt: { gte: new Date(Date.now() - RECENT_WINDOW_MS) },
    },
    select: { id: true, formDriverId: true },
    orderBy: { sentAt: 'desc' },
  })

  if (recent) {
    return { relevant: true, reason: 'recent_conversation', driverId: recent.formDriverId }
  }

  return { relevant: false, reason: driver ? 'application_terminal' : 'unknown_contact' }
}

export async function POST(req: NextRequest) {
  // 1) Validar origen.
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET
  if (secret) {
    if (req.headers.get('x-webhook-secret') !== secret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  } else if (req.headers.get('x-webhook-source') !== 'whatsapp-bot') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 2) Parsear.
  let payload: InboundPayload
  try {
    payload = (await req.json()) as InboundPayload
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!payload.from) {
    return NextResponse.json({ error: 'missing from' }, { status: 400 })
  }

  // 3) Descartar lo que no es un mensaje de persona (defensa adicional al filtro
  //    del bot): grupos, sin texto, notificaciones, @lid.
  if (payload.isGroup) {
    return NextResponse.json({ received: true, ignored: 'group' })
  }
  if (!payload.message || payload.message.trim() === '') {
    return NextResponse.json({ received: true, ignored: 'empty' })
  }
  const noisyTypes = new Set(['notification_template', 'notification', 'e2e_notification', 'protocol'])
  if (payload.type && noisyTypes.has(payload.type)) {
    return NextResponse.json({ received: true, ignored: 'system_notification' })
  }

  const phone = phoneFromWid(payload.from)
  if (!phone) {
    return NextResponse.json({ received: true, ignored: 'no_phone' })
  }

  // 4) Evaluar relevancia (best-effort — si la DB falla, respondemos 200 igual
  //    para que el bot no reintente).
  let relevance: Relevance
  try {
    relevance = await assessRelevance(phone)
  } catch (err) {
    console.warn('[WA_WEBHOOK] relevancia falló (DB?)', {
      phone,
      error: err instanceof Error ? err.message : err,
    })
    return NextResponse.json({ received: true, deferred: 'db_error' })
  }

  if (!relevance.relevant) {
    console.log('[WA_WEBHOOK] descartado (no relevante)', {
      phone,
      reason: relevance.reason,
      preview: payload.message.slice(0, 80),
    })
    return NextResponse.json({ received: true, relevant: false, reason: relevance.reason })
  }

  // 5) Mensaje relevante → registrar (por ahora log estructurado).
  console.log('[WA_WEBHOOK] inbound relevante', {
    phone,
    fromName: payload.fromName,
    message: payload.message.slice(0, 280),
    reason: relevance.reason,
    driverId: relevance.driverId,
    hasMedia: payload.hasMedia,
    messageId: payload.messageId,
    at: payload.timestamp,
  })

  // TODO inbound (cuando se decida persistir):
  //  - Guardar el mensaje entrante (campo direction en WhatsAppMessage o tabla
  //    WhatsAppInboundMessage), vinculado a relevance.driverId.
  //  - Marcar al driver como "respondió" y/o reabrir conversación.
  //  - Notificar al admin o disparar auto-respuesta.

  return NextResponse.json({
    received: true,
    relevant: true,
    reason: relevance.reason,
    driverId: relevance.driverId,
  })
}
