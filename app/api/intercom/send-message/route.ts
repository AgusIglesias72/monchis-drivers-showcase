// app/api/intercom/send-message/route.ts
// POST — envía un mensaje 1-1 admin → driver via Intercom.
// Body: { contactId, senderAdminId, assigneeAdminId?, body, driverId? }

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import {
  sendDirectMessage,
  IntercomError,
} from '@/lib/services/intercom.service';

export const dynamic = 'force-dynamic';

const MAX_BODY_LENGTH = 5_000;

interface SendMessageBody {
  contactId?: unknown;
  senderAdminId?: unknown;
  assigneeAdminId?: unknown;
  subject?: unknown;
  body?: unknown;
  driverId?: unknown;
  attachmentUrls?: unknown;
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;
  const adminUser = guard.user;

  let payload: SendMessageBody;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const contactId = strOrNull(payload.contactId);
  const senderAdminId = strOrNull(payload.senderAdminId);
  const assigneeAdminId = strOrNull(payload.assigneeAdminId);
  const subject = strOrNull(payload.subject);
  const body = strOrNull(payload.body);
  const driverId = strOrNull(payload.driverId);
  const attachmentUrls = Array.isArray(payload.attachmentUrls)
    ? payload.attachmentUrls.filter(
        (u): u is string => typeof u === 'string' && u.startsWith('https://'),
      )
    : [];

  if (!contactId) {
    return NextResponse.json({ error: 'contactId requerido' }, { status: 400 });
  }
  if (!senderAdminId) {
    return NextResponse.json(
      { error: 'senderAdminId requerido' },
      { status: 400 },
    );
  }
  // Intercom acepta mensaje vacío si hay attachments. Validamos eso.
  if (!body && attachmentUrls.length === 0) {
    return NextResponse.json(
      { error: 'Se requiere body o al menos una imagen adjunta' },
      { status: 400 },
    );
  }
  if (body && body.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: `body excede los ${MAX_BODY_LENGTH} caracteres` },
      { status: 400 },
    );
  }
  if (attachmentUrls.length > 10) {
    return NextResponse.json(
      { error: 'Máximo 10 attachments por mensaje (límite de Intercom)' },
      { status: 400 },
    );
  }

  try {
    const result = await sendDirectMessage({
      contactId,
      senderAdminId,
      assigneeAdminId,
      subject: subject ?? undefined,
      body: body ?? '',
      attachmentUrls,
      driverId,
      clerkUserId: adminUser.clerkId,
      metadata: { source: 'sandbox' },
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof IntercomError) {
      return NextResponse.json(
        { error: err.message, intercomBody: err.body },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error desconocido' },
      { status: 500 },
    );
  }
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}
