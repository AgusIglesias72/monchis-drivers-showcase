// app/api/intercom/conversation/route.ts
// GET ?conversationId=X — devuelve el hilo de una conversación específica,
// normalizado como lista de mensajes para renderizar.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import {
  getConversationThread,
  IntercomError,
} from '@/lib/services/intercom.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const conversationId = req.nextUrl.searchParams
    .get('conversationId')
    ?.trim();
  if (!conversationId) {
    return NextResponse.json(
      { error: 'conversationId requerido' },
      { status: 400 },
    );
  }

  try {
    const thread = await getConversationThread(conversationId);
    return NextResponse.json({ thread });
  } catch (err) {
    const status = err instanceof IntercomError ? err.status : 500;
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Error al cargar la conversación',
      },
      { status },
    );
  }
}
