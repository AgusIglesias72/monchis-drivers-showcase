// app/api/intercom/conversations/read/route.ts
// POST — marca una conversación como leída (al abrirla en la vista).
// Body: { contactId }

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { markConversationRead } from '@/lib/services/intercom.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  let contactId: string | null = null;
  try {
    const body = await req.json();
    contactId = typeof body.contactId === 'string' ? body.contactId : null;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!contactId) {
    return NextResponse.json({ error: 'contactId requerido' }, { status: 400 });
  }

  await markConversationRead(contactId);
  return NextResponse.json({ ok: true });
}
