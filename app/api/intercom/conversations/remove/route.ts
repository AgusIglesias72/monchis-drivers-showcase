// app/api/intercom/conversations/remove/route.ts
// POST — quita la conversación de nuestra bandeja (borra del índice, no toca
// Intercom). Body: { conversationId }

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { removeConversation } from '@/lib/services/intercom.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  let conversationId: string | null = null;
  try {
    const body = await req.json();
    conversationId =
      typeof body.conversationId === 'string' ? body.conversationId : null;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!conversationId) {
    return NextResponse.json(
      { error: 'conversationId requerido' },
      { status: 400 },
    );
  }

  await removeConversation(conversationId);
  return NextResponse.json({ ok: true });
}
