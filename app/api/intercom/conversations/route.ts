// app/api/intercom/conversations/route.ts
// GET — lista las conversaciones del índice para la vista (con datos del driver).
// Query: ?unreadOnly=true para filtrar solo no-leídas.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { listConversations } from '@/lib/services/intercom.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const unreadOnly = req.nextUrl.searchParams.get('unreadOnly') === 'true';

  const conversations = await listConversations({ unreadOnly });
  return NextResponse.json({ conversations });
}
