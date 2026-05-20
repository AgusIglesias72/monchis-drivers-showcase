// app/api/intercom/conversation/route.ts
// GET ?contactId=X — devuelve la conversación más reciente del contact,
// normalizada como lista de mensajes para renderizar en el sandbox.

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

  const contactId = req.nextUrl.searchParams.get('contactId')?.trim();
  if (!contactId) {
    return NextResponse.json({ error: 'contactId requerido' }, { status: 400 });
  }

  try {
    const thread = await getConversationThread(contactId);
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
