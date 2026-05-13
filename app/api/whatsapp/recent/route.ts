// app/api/whatsapp/recent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { getRecentMessages } from '@/lib/services/messages-history.service';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const botId = searchParams.get('botId') || undefined;

    const result = await getRecentMessages({ limit, botId });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error en GET /api/whatsapp/recent:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener mensajes recientes' },
      { status: 500 }
    );
  }
}