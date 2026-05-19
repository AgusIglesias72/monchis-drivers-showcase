// app/api/intercom/admins/route.ts
// GET — lista admins (teammates) de Intercom para los selects de sender/assignee.

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { listAdmins, IntercomError } from '@/lib/services/intercom.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  try {
    const admins = await listAdmins();
    return NextResponse.json({
      admins: admins.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        jobTitle: a.job_title ?? null,
        awayMode: a.away_mode_enabled ?? false,
        hasInboxSeat: a.has_inbox_seat ?? false,
      })),
    });
  } catch (err) {
    const status = err instanceof IntercomError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error listing admins' },
      { status },
    );
  }
}
