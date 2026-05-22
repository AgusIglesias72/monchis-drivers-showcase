// app/api/intercom/broadcast/route.ts
// POST — difusión 1-1 a varios drivers via Intercom (un mensaje admin → user a
// cada uno, en tandas). Body: { driverIds[], senderAdminId, assigneeAdminId?,
// subject?, body, attachmentUrls? }. Solo envía a drivers con intercomContactId.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  sendBroadcast,
  type BroadcastRecipient,
} from '@/lib/services/intercom.service';

export const dynamic = 'force-dynamic';
// La difusión envía en tandas; necesita margen sobre el default de 10s.
export const maxDuration = 300;

const MAX_RECIPIENTS = 300;
const MAX_BODY_LENGTH = 5_000;

interface BroadcastBody {
  driverIds?: unknown;
  senderAdminId?: unknown;
  assigneeAdminId?: unknown;
  subject?: unknown;
  body?: unknown;
  attachmentUrls?: unknown;
  tagId?: unknown;
  closeAfter?: unknown;
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;
  const adminUser = guard.user;

  let payload: BroadcastBody;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const driverIds = Array.isArray(payload.driverIds)
    ? [
        ...new Set(
          payload.driverIds.filter(
            (d): d is string => typeof d === 'string' && d.trim() !== '',
          ),
        ),
      ]
    : [];
  const senderAdminId = strOrNull(payload.senderAdminId);
  const assigneeAdminId = strOrNull(payload.assigneeAdminId);
  const subject = strOrNull(payload.subject);
  const body = strOrNull(payload.body);
  const tagId = strOrNull(payload.tagId);
  const closeAfter = payload.closeAfter === true;
  const attachmentUrls = Array.isArray(payload.attachmentUrls)
    ? payload.attachmentUrls.filter(
        (u): u is string => typeof u === 'string' && u.startsWith('https://'),
      )
    : [];

  if (driverIds.length === 0) {
    return NextResponse.json(
      { error: 'Seleccioná al menos un driver' },
      { status: 400 },
    );
  }
  if (driverIds.length > MAX_RECIPIENTS) {
    return NextResponse.json(
      {
        error: `Máximo ${MAX_RECIPIENTS} destinatarios por difusión. Seleccionaste ${driverIds.length}.`,
      },
      { status: 400 },
    );
  }
  if (!senderAdminId) {
    return NextResponse.json(
      { error: 'senderAdminId requerido' },
      { status: 400 },
    );
  }
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

  // Resolver contactId; solo los vinculados pueden recibir.
  const drivers = await prisma.monchisDriverCache.findMany({
    where: { driverId: { in: driverIds }, intercomContactId: { not: null } },
    select: { driverId: true, intercomContactId: true },
  });
  const recipients: BroadcastRecipient[] = drivers.map((d) => ({
    driverId: d.driverId,
    contactId: d.intercomContactId as string,
  }));
  const skipped = driverIds.length - recipients.length;

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: 'Ningún driver seleccionado está vinculado en Intercom' },
      { status: 400 },
    );
  }

  const result = await sendBroadcast({
    recipients,
    senderAdminId,
    assigneeAdminId,
    subject: subject ?? undefined,
    body: body ?? '',
    attachmentUrls,
    clerkUserId: adminUser.clerkId,
    tagId,
    closeAfter,
  });

  return NextResponse.json({ ...result, skipped });
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}
