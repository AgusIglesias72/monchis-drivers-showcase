// app/api/whatsapp/recent/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { messagesService } from '@/lib/services/messages.service';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener parámetros
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const botId = searchParams.get('botId'); // ✅ Nuevo parámetro

    // Validar limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'El límite debe estar entre 1 y 100' }, { status: 400 });
    }

    // ✅ Pasar filtros incluyendo botId
    const filters = botId ? { botId } : undefined;
    
    const result = await messagesService.getMessages(filters, {
      limit,
      orderBy: 'sentAt',
      orderDir: 'desc',
    });

    return NextResponse.json({
      success: true,
      messages: result.messages,
      count: result.messages.length,
    });
  } catch (error) {
    console.error('Error in /api/whatsapp/recent:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener mensajes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}