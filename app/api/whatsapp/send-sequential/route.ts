// app/api/whatsapp/send-sequential/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { messagesService } from '@/lib/services/messages.service';
import { whatsappBotService, WHATSAPP_BOT_ID } from '@/lib/services/whatsapp-bot.service';
import { prisma } from '@/lib/prisma';
import { WhatsAppMessageType, WhatsAppMessageSource, WhatsAppMessageStatus } from '@prisma/client';

export const maxDuration = 300; // 5 minutos

interface SendResult {
  phone: string;
  name?: string;
  success: boolean;
  messageId?: string;
  error?: string;
  sentAt?: string;
}

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
      // botId queda como param legacy — ignorado (single-tenant).
      delaySeconds: requestedDelay = 5,
      testMode = false,
    } = body;

    // Rate-limiting de seguridad para envíos masivos (mitigar ban del número):
    //  - piso de delay: el caller puede pedir más, nunca menos.
    //  - cap de destinatarios por envío: si se supera, hay que dividir en tandas.
    // Configurables por env var (sin redeploy).
    const MIN_DELAY_S = Math.max(1, parseInt(process.env.WHATSAPP_BULK_MIN_DELAY_S || '4', 10));
    const MAX_RECIPIENTS = Math.max(1, parseInt(process.env.WHATSAPP_BULK_MAX || '50', 10));
    const delaySeconds = Math.max(MIN_DELAY_S, Number(requestedDelay) || 0);

    // Validaciones básicas
    if (!recipientsInput || !messageTemplate) {
      return NextResponse.json(
        { error: 'Se requieren destinatarios y mensaje' },
        { status: 400 }
      );
    }

    // Parsear destinatarios
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

    // Cap de destinatarios por envío (configurable). Forzamos dividir en tandas.
    if (parsed.recipients.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        {
          error: `Máximo ${MAX_RECIPIENTS} destinatarios por envío. Dividí la lista en tandas.`,
          max: MAX_RECIPIENTS,
          received: parsed.recipients.length,
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

    console.log(`📤 [SEQUENTIAL SEND] Iniciando envío secuencial a ${parsed.recipients.length} destinatarios`);
    console.log(`⏱️  [SEQUENTIAL SEND] Delay: ${delaySeconds}s entre mensajes`);
    console.log(`📷 [SEQUENTIAL SEND] Con imagen: ${!!imageUrl}`);

    // Enviar mensajes secuencialmente
    const results: SendResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < parsed.recipients.length; i++) {
      const recipient = parsed.recipients[i];
      const formattedPhone = messagesService.formatPhoneNumber(recipient.phone);
      const personalizedMessage = messagesService.replaceMessageVariables(messageTemplate, recipient.variables);

      console.log(`   → [${i + 1}/${parsed.recipients.length}] Enviando a ${recipient.name || formattedPhone}...`);

      try {
        const botResponse = await whatsappBotService.sendMessage({
          phone: formattedPhone,
          message: personalizedMessage,
          type: 'custom',
          ...(imageUrl && { imageUrl }),
        });

        if (botResponse.success) {
          // Guardar en BD (sin vincular a formDriver porque son números externos)
          try {
            const savedMessage = await prisma.whatsAppMessage.create({
              data: {
                recipientPhone: formattedPhone,
                recipientName: recipient.name || 'Usuario',
                chatId: botResponse.data?.chatId || `${formattedPhone}@c.us`,
                messageType: WhatsAppMessageType.CUSTOM,
                message: personalizedMessage,
                messageLength: personalizedMessage.length,
                metadata: {
                  sequentialSend: true,
                  sequentialIndex: i + 1,
                  sequentialTotal: parsed.recipients.length,
                  variables: recipient.variables,
                  externalRecipient: true, // Marcar como destinatario externo
                  ...(imageUrl && { imageUrl }),
                },
                status: WhatsAppMessageStatus.SENT,
                sentAt: new Date(),
                source: WhatsAppMessageSource.MANUAL,
                botId: WHATSAPP_BOT_ID,
                // No incluimos formDriverId ni sentBy para números externos
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown',
              },
            });

            successCount++;
            results.push({
              phone: recipient.phone,
              name: recipient.name,
              success: true,
              messageId: savedMessage.id,
              sentAt: new Date().toISOString(),
            });

            console.log(`   ✓ Mensaje enviado exitosamente`);
          } catch (dbError) {
            console.error('⚠️  Mensaje enviado pero no guardado en BD:', dbError);
            successCount++;
            results.push({
              phone: recipient.phone,
              name: recipient.name,
              success: true,
              sentAt: new Date().toISOString(),
            });
          }
        } else {
          failureCount++;
          results.push({
            phone: recipient.phone,
            name: recipient.name,
            success: false,
            error: botResponse.error || 'Error al enviar mensaje',
          });
          console.error(`   ✗ Error:`, botResponse.error);
        }

        // Delay entre mensajes (excepto en el último)
        if (i < parsed.recipients.length - 1) {
          console.log(`   ⏳ Esperando ${delaySeconds}s antes del siguiente mensaje...`);
          await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
        }
      } catch (error) {
        failureCount++;
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
        results.push({
          phone: recipient.phone,
          name: recipient.name,
          success: false,
          error: errorMsg,
        });
        console.error(`   ✗ Exception:`, error);
      }
    }

    const summary = {
      total: parsed.recipients.length,
      successful: successCount,
      failed: failureCount,
      successRate: ((successCount / parsed.recipients.length) * 100).toFixed(2),
    };

    console.log(`✅ [SEQUENTIAL SEND] Completado: ${successCount}/${parsed.recipients.length} exitosos`);

    return NextResponse.json({
      success: true,
      summary,
      results,
      completedAt: new Date().toISOString(),
      headers: parsed.headers,
      parseErrors: parsed.errors,
    });

  } catch (error: any) {
    console.error('❌ Error en /api/whatsapp/send-sequential:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar envío secuencial' },
      { status: 500 }
    );
  }
}
