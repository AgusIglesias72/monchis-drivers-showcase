// app/api/form/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshRucForDriverAsync } from '@/lib/services/turuc.service';
import { runRealtimeDecision } from '@/lib/services/realtime-decision.service';

export const runtime = 'nodejs';
// El after() corre dentro del lifetime de la función: pipeline del agente
// (~10-45s) + espera de auto-approve + WhatsApp. Margen amplio para no dejar
// AgentRuns zombie en RUNNING.
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID requerido' }, { status: 400 });
    }

    const submission = await prisma.formSubmission.findUnique({
      where: { sessionId },
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

    // Decisión IA en tiempo real, diferida con after() para responder al
    // postulante de inmediato. El cliente hace polling a /api/form/decision-status.
    // El WhatsApp 'form_completed' se envía adentro, post-decisión, solo si el
    // resultado NO es aprobado-auto-ejecutado.
    const formDriverId = submission.formDriverId;
    after(() => runRealtimeDecision(formDriverId));

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