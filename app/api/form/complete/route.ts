// app/api/form/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { messagesService } from '@/lib/services/messages.service';
import { WhatsAppMessageType, WhatsAppMessageSource } from '@prisma/client';

/**
 * Normaliza el nombre del usuario (solo primer nombre)
 */
function normalizeFirstName(fullName: string | null | undefined): string {
  if (!fullName) return 'Usuario';

  const trimmed = fullName.trim();
  const firstName = trimmed.split(' ')[0];

  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID requerido' }, { status: 400 });
    }

    const submission = await prisma.formSubmission.findUnique({
      where: { sessionId },
      include: {
        formDriver: true,
      },
    });

    if (!submission || !submission.formDriverId) {
      return NextResponse.json(
        { error: 'Sesión no encontrada o FormDriver no creado' },
        { status: 404 }
      );
    }

    const formData = submission.formData as any;

    await prisma.formDriver.update({
      where: { id: submission.formDriverId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        currentStep: 6,
        completedSteps: [1, 2, 3, 4, 5, 6],
      },
    });

    if (formData.paymentMethod) {
      await prisma.equipmentPayment.create({
        data: {
          formDriverId: submission.formDriverId,
          paymentMethod: formData.paymentMethod,
          paymentProofUrl: formData.paymentProofUrl || null,
          status: formData.paymentMethod === 'TRANSFERENCIA' ? 'PENDING' : 'PENDING',
          metadata: {
            completedFromForm: true,
            submittedAt: new Date().toISOString(),
          },
        },
      });
    }

    if (formData.canInvoice === 'si') {
      await prisma.financialService.upsert({
        where: { formDriverId: submission.formDriverId },
        update: {
          hasInvoice: true,
          interestedInConto: formData.interestedInConto === 'si',
          contoStatus: formData.interestedInConto === 'si' ? 'INTERESTED' : null,
          taxComplianceUrl: formData.taxCompliancePhotoUrl || null,
        },
        create: {
          formDriverId: submission.formDriverId,
          hasInvoice: true,
          interestedInConto: formData.interestedInConto === 'si',
          contoStatus: formData.interestedInConto === 'si' ? 'INTERESTED' : null,
          taxComplianceUrl: formData.taxCompliancePhotoUrl || null,
        },
      });
    }

    await prisma.formSubmission.update({
      where: { id: submission.id },
      data: {
        isComplete: true,
        completedAt: new Date(),
        currentStep: 6,
      },
    });

    // ===== 🎉 ENVIAR MENSAJE DE CONFIRMACIÓN =====

    const driver = submission.formDriver;

    if (driver && driver.phoneNumber && driver.fullName) {
      try {
        const firstName = normalizeFirstName(driver.fullName);

        const ipAddress =
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // ✅ Especificar bot para confirmaciones
        const messageResult = await messagesService.sendWhatsAppMessage({
          phone: driver.phoneNumber,
          name: firstName,
          type: WhatsAppMessageType.APPLICATION_RECEIVED,
          formDriverId: driver.id,
          source: WhatsAppMessageSource.TRIGGER,
          botId: 'bot-adquisicion-prod', // ✅ NUEVO: Bot específico
          metadata: {
            triggeredBy: 'form_completion',
            sessionId: submission.id,
            completedAt: new Date().toISOString(),
          },
          ipAddress,
          userAgent,
        });

        if (messageResult.success) {
          console.log('✅ Mensaje de confirmación enviado:', {
            driver: driver.fullName,
            phone: driver.phoneNumber,
            messageId: messageResult.messageId,
            botUsed: messageResult.botUsed,
          });
        } else {
          console.error('⚠️ No se pudo enviar mensaje de confirmación:', {
            driver: driver.fullName,
            error: messageResult.error,
            warning: messageResult.warning,
          });
        }
      } catch (messageError) {
        console.error('❌ Error enviando mensaje de confirmación:', messageError);
      }
    } else {
      console.warn('⚠️ No se puede enviar mensaje: faltan datos del driver', {
        hasPhone: !!driver?.phoneNumber,
        hasName: !!driver?.fullName,
      });
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      formDriverId: submission.formDriverId,
    });
  } catch (error: any) {
    console.error('Error en complete:', error);
    return NextResponse.json(
      { error: error.message || 'Error al completar el formulario' },
      { status: 500 }
    );
  }
}