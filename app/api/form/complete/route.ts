// app/api/form/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId es requerido' },
        { status: 400 }
      );
    }

    // Marcar submission como completa
    const submission = await prisma.formSubmission.update({
      where: { sessionId },
      data: {
        isComplete: true,
        completedAt: new Date(),
        currentStep: 7
      }
    });

    // Marcar FormDriver como completado
    if (submission.formDriverId) {
      await prisma.formDriver.update({
        where: { id: submission.formDriverId },
        data: {
          status: 'COMPLETED',
          currentStep: 7,
          completedSteps: [1, 2, 3, 4, 5, 6, 7],
          completedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id
    });

  } catch (error: any) {
    console.error('Error en complete:', error);
    return NextResponse.json(
      { error: error.message || 'Error al completar el formulario' },
      { status: 500 }
    );
  }
}
