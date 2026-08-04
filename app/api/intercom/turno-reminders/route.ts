// app/api/intercom/turno-reminders/route.ts
// GET — lista paginada (cursor) del log de recordatorios de turno enviados
// por el cron, para la vista de auditoría en el panel.
// Query: ?limit=50&cursor=<id>&status=sent|failed|skipped_no_contact

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { listTurnoReminderLogs } from '@/lib/services/turno-reminders.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '50');
  const cursor = req.nextUrl.searchParams.get('cursor') ?? undefined;
  const status = req.nextUrl.searchParams.get('status') ?? undefined;

  const result = await listTurnoReminderLogs({
    limit,
    cursor,
    status: status || undefined,
  });
  return NextResponse.json(result);
}
