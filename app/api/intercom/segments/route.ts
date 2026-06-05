// app/api/intercom/segments/route.ts
// GET — segmentos de drivers para Intercom: con turnos (próximas 72hs, con
// detalle), sin turnos, y el badge de vinculado (intercomContactId). ?fresh=1
// saltea la caché de 10 min del API de turnos.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import {
  getDriverSegments,
  type EnabledFilter,
} from '@/lib/services/intercom-segments.service';

export const dynamic = 'force-dynamic';

function parseEnabledFilter(value: string | null): EnabledFilter {
  if (value === 'disabled' || value === 'all') return value;
  return 'enabled';
}

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const fresh = req.nextUrl.searchParams.get('fresh') === '1';
  const enabledFilter = parseEnabledFilter(
    req.nextUrl.searchParams.get('status'),
  );

  try {
    const data = await getDriverSegments({ fresh, enabledFilter });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error desconocido' },
      { status: 500 },
    );
  }
}
