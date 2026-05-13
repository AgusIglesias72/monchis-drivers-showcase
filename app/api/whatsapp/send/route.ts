// app/api/whatsapp/send/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { messagesService } from '@/lib/services/messages.service';
import { WhatsAppMessageType, WhatsAppMessageSource } from '@prisma/client';
import { type BotId } from '@/lib/config/whatsapp-bots.config';

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;
    const adminUser = guard.user;

    const body = await request.json();
    const { phone, name, type, step, customMessage, botId } = body;

    // Validaciones
    if (!phone || !name || !type) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: phone, name, type' },
        { status: 400 }
      );
    }

    // Validar tipo de mensaje
    if (!Object.values(WhatsAppMessageType).includes(type as WhatsAppMessageType)) {
      return NextResponse.json({ error: 'Tipo de mensaje inválido' }, { status: 400 });
    }

    // Si es CUSTOM, requiere customMessage
    if (type === WhatsAppMessageType.CUSTOM && !customMessage) {
      return NextResponse.json(
        { error: 'customMessage es requerido para mensajes tipo CUSTOM' },
        { status: 400 }
      );
    }

    // Si es FORM_INCOMPLETE, requiere step
    if (type === WhatsAppMessageType.FORM_INCOMPLETE && !step) {
      return NextResponse.json(
        { error: 'step es requerido para mensajes tipo FORM_INCOMPLETE' },
        { status: 400 }
      );
    }

    // Obtener IP y User Agent
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // ✅ Enviar mensaje con botId opcional
    const result = await messagesService.sendWhatsAppMessage({
      phone,
      name,
      type: type as WhatsAppMessageType,
      step,
      customMessage,
      source: WhatsAppMessageSource.MANUAL,
      sentBy: adminUser.clerkId,
      ipAddress,
      userAgent,
      botId: botId as BotId | undefined, // ✅ Pasar botId
      metadata: {
        sentFrom: 'test-panel',
        timestamp: new Date().toISOString(),
      },
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        botUsed: result.botUsed, // ✅ Devolver bot usado
        warning: result.warning,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Error al enviar mensaje',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in /api/whatsapp/send:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}