// app/api/whatsapp/send-bulk/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { messagesService } from '@/lib/services/messages.service';
import { type BotId } from '@/lib/config/whatsapp-bots.config';

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;
    const adminUser = guard.user;

    const body = await request.json();
    const {
      recipients: recipientsInput,
      message: messageTemplate,
      imageUrl,
      botId,
      delaySeconds = 2,
      testMode = false,
    } = body;

    // Validaciones básicas
    if (!recipientsInput || !messageTemplate) {
      return NextResponse.json(
        { error: 'Se requieren destinatarios y mensaje' },
        { status: 400 }
      );
    }

    // Parsear destinatarios (ahora devuelve un objeto con recipients, headers, errors)
    const parsed = messagesService.parseRecipients(recipientsInput);

    if (parsed.recipients.length === 0) {
      return NextResponse.json(
        { 
          error: parsed.errors.length > 0 
            ? parsed.errors[0] 
            : 'No se encontraron destinatarios válidos',
          errors: parsed.errors,
        },
        { status: 400 }
      );
    }

    // Modo test: solo validar
    if (testMode) {
      const validation = await messagesService.validateBulkRecipients({
        recipients: parsed.recipients,
        message: messageTemplate,
        imageUrl,
        delayMs: delaySeconds * 1000,
      });

      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        testMode: true,
        headers: parsed.headers,
        parseErrors: parsed.errors,
        ...validation,
      });
    }

    // Enviar mensajes
    const result = await messagesService.sendBulkMessages({
      recipients: parsed.recipients,
      message: messageTemplate,
      imageUrl,
      botId: botId as BotId | undefined,
      delayMs: delaySeconds * 1000,
      sentBy: adminUser.clerkId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error al enviar mensajes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...result,
      headers: parsed.headers,
      parseErrors: parsed.errors,
    });

  } catch (error: any) {
    console.error('❌ Error en /api/whatsapp/send-bulk:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar envío masivo' },
      { status: 500 }
    );
  }
}