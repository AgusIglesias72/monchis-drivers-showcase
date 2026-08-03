// app/api/form/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { WhatsAppMessageSource, WhatsAppMessageType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { refreshRucForDriverAsync } from '@/lib/services/turuc.service';
import { sendTemplateByKey } from '@/lib/services/whatsapp-messenger.service';

const FORM_COMPLETED_TEMPLATE_KEY = 'form_completed';

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

    // Enviar confirmación post-form por el bot WhatsApp (apps/whatsapp-bot/).
    // Diferido con after() para no bloquear la respuesta al postulante con la
    // latencia del bot. Si falla solo queda log — el form ya se completó.
    const driverForMessaging = submission.formDriver;
    if (driverForMessaging) {
      after(async () => {
        try {
          const result = await sendTemplateByKey(driverForMessaging, FORM_COMPLETED_TEMPLATE_KEY, {
            source: WhatsAppMessageSource.TRIGGER,
            messageType: WhatsAppMessageType.APPLICATION_RECEIVED,
            step: 'form_completed',
          });
          if (result.status !== 'sent') {
            console.warn('[FORM_COMPLETE] bot no envió', {
              driverId: driverForMessaging.id,
              result,
            });
          }
        } catch (err) {
          console.error('[FORM_COMPLETE] Error inesperado enviando WhatsApp', {
            driverId: driverForMessaging.id,
            error: err instanceof Error ? err.message : err,
          });
        }
      });
    }

    // Dispara consulta RUC en background (no bloquea la respuesta al postulante).
    // El admin verá el estado fiscal cuando abra la postulación.
    refreshRucForDriverAsync(submission.formDriverId);

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