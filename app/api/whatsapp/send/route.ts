// app/api/whatsapp/send/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { messagesService } from '@/lib/services/messages.service';
import { WhatsAppMessageType, WhatsAppMessageSource } from '@prisma/client';
import { z } from 'zod';

// Schema de validación
const sendMessageSchema = z.object({
    phone: z.string().min(1, 'El teléfono es requerido'),
    name: z.string().min(1, 'El nombre es requerido'),
    type: z.nativeEnum(WhatsAppMessageType),
    step: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(), // ← FIX: agregar z.string() como primer argumento
    customMessage: z.string().optional(),
    formDriverId: z.string().optional(),
    source: z.nativeEnum(WhatsAppMessageSource).optional(),
  });

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 2. Parsear body
    const body = await request.json();

    // 3. Validar con Zod
    const validation = sendMessageSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          details: validation.error.message 
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // 4. Validación especial para CUSTOM
    if (data.type === 'CUSTOM' && !data.customMessage) {
      return NextResponse.json(
        { error: 'El campo customMessage es requerido para mensajes tipo CUSTOM' },
        { status: 400 }
      );
    }

    // 5. Obtener IP y User Agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 6. Enviar mensaje usando el service
    const result = await messagesService.sendWhatsAppMessage({
      phone: data.phone,
      name: data.name,
      type: data.type,
      step: data.step,
      metadata: data.metadata,
      customMessage: data.customMessage, // Para tipo CUSTOM
      formDriverId: data.formDriverId,
      source: data.source || WhatsAppMessageSource.MANUAL,
      sentBy: userId,
      ipAddress,
      userAgent,
    });

    // 7. Retornar resultado
    if (result.success) {
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
          messageId: result.messageId, // Aún si falla, guardamos el intento
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