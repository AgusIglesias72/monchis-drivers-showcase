// app/api/form/resume-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId es requerido' },
        { status: 400 }
      );
    }

    const submission = await prisma.formSubmission.findUnique({
      where: { sessionId },
      include: {
        formDriver: true,
        stepCompletions: {
          orderBy: { step: 'asc' }
        }
      }
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        sessionId: submission.sessionId,
        currentStep: submission.currentStep,
        formData: submission.formData,
        lastActivityAt: submission.lastActivityAt,
        isComplete: submission.isComplete,
        formDriver: submission.formDriver
      }
    });

  } catch (error: any) {
    console.error('Error en resume-session:', error);
    return NextResponse.json(
      { error: error.message || 'Error al recuperar la sesión' },
      { status: 500 }
    );
  }
}