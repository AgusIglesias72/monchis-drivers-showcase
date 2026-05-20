// app/api/webhooks/intercom/route.ts
//
// Recibe webhooks de Intercom. Verifica la firma HMAC-SHA1 (X-Hub-Signature)
// con el INTERCOM_CLIENT_SECRET sobre el RAW body — por eso leemos req.text()
// y NO req.json() (el parseo cambiaría los bytes y rompería la firma).
//
// Topics suscritos: conversation.user.replied, conversation.admin.replied,
// conversation.admin.closed, conversation.admin.opened.
//
// Configurar en el Developer Hub de Intercom apuntando a:
//   https://www.monchisdrivers.com/api/webhooks/intercom

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  handleWebhookEvent,
} from '@/lib/services/intercom.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Ping de validación que Intercom manda al crear/editar el webhook.
  if (payload.type === 'ping' || payload.topic === 'ping') {
    return NextResponse.json({ ok: true, pong: true });
  }

  try {
    const result = await handleWebhookEvent(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[intercom webhook] processing error:', err);
    // Respondemos 200 igual: si devolvemos error, Intercom reintenta y como ya
    // pudimos haber escrito parcialmente, preferimos no loopear. El evento
    // queda con status 'error' en la tabla para revisión.
    return NextResponse.json({ ok: false });
  }
}

// Algunos setups de Intercom hacen un GET de verificación al dar de alta el
// endpoint. Respondemos 200 para que valide la URL.
export async function GET() {
  return NextResponse.json({ ok: true });
}
