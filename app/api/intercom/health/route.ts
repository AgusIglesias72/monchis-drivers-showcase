// app/api/intercom/health/route.ts
// GET — pinguea Intercom con /me. Si responde 200, el token está OK.

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { getCurrentMe, IntercomError } from '@/lib/services/intercom.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  try {
    const me = await getCurrentMe();
    return NextResponse.json({
      ok: true,
      workspace: {
        name: me.app.name,
        region: me.app.region,
        id: me.app.id_code,
      },
      admin: { id: me.id, name: me.name, email: me.email },
    });
  } catch (err) {
    const status = err instanceof IntercomError ? err.status : 500;
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : 'Error al conectar con Intercom',
        status,
      },
      { status: 200 }, // 200 con ok:false para que el front lo muestre como "down" sin throw
    );
  }
}
