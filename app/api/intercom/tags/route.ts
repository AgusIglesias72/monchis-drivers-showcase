// app/api/intercom/tags/route.ts
// GET — lista los tags del workspace de Intercom, para el selector de la
// difusión (taguear las conversaciones que se crean).

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { listTags } from '@/lib/services/intercom.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  try {
    const tags = await listTags();
    return NextResponse.json({ tags });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error desconocido' },
      { status: 500 },
    );
  }
}
