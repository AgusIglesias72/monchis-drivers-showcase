// app/api/whatsapp/send/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { messagesService } from '@/lib/services/messages.service';
import { WhatsAppMessageType, WhatsAppMessageSource } from '@prisma/client';
import { z } from 'zod';

const sendMessageSchema = z.object({
  phone: z.string().min(1, 'El teléfono es requerido'),
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.nativeEnum(WhatsAppMessageType),
  step: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  customMessage: z.string().optional(),
  formDriverId: z.string().optional(),
  source: z.nativeEnum(WhatsAppMessageSource).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = sendMessageSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          details: validation.error.issues.map(e => e.message).join(', ')
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    if (data.type === WhatsAppMessageType.CUSTOM && !data.customMessage) {
      return NextResponse.json(
        { error: 'El campo customMessage es requerido para mensajes tipo CUSTOM' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const result = await messagesService.sendWhatsAppMessage({
      phone: data.phone,
      name: data.name,
      type: data.type,
      step: data.step,
      metadata: data.metadata,
      customMessage: data.customMessage,
      formDriverId: data.formDriverId,
      source: data.source || WhatsAppMessageSource.MANUAL,
      sentBy: userId,
      ipAddress,
      userAgent,
    });

    if (result.success) {
      if (result.warning) {
        return NextResponse.json({
          success: true,
          messageId: result.messageId,
          message: 'Mensaje enviado con advertencia',
          warning: result.warning,
        });
      }

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'Mensaje enviado exitosamente',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Error al enviar mensaje',
          messageId: result.messageId,
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in /api/whatsapp/send:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}