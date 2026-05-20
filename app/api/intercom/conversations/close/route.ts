// app/api/intercom/conversations/close/route.ts
// POST — cierra una conversación en Intercom y la marca cerrada en el índice.
// Body: { conversationId }

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import {
  closeConversation,
  IntercomError,
} from '@/lib/services/intercom.service';

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

  try {
    await closeConversation(conversationId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof IntercomError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al cerrar' },
      { status },
    );
  }
}
