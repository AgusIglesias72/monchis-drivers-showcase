// app/api/form/check-phone/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'phoneNumber es requerido' },
        { status: 400 }
      );
    }

    // Buscar FormDriver con este teléfono
    const formDriver = await prisma.formDriver.findFirst({
      where: {
        phoneNumber,
        status: 'IN_PROGRESS' // Solo los que no completaron
      },
      orderBy: {
        lastActivityAt: 'desc'
      },
      include: {
        submissions: {
          where: {
            isComplete: false
          },
          orderBy: {
            lastActivityAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (!formDriver || formDriver.submissions.length === 0) {
      return NextResponse.json({
        found: false
      });
    }

    return NextResponse.json({
      found: true,
      sessionId: formDriver.submissions[0].sessionId,
      currentStep: formDriver.currentStep,
      lastActivityAt: formDriver.lastActivityAt,
      driverName: formDriver.fullName
    });

  } catch (error: any) {
    console.error('Error en check-phone:', error);
    return NextResponse.json(
      { error: error.message || 'Error al verificar el teléfono' },
      { status: 500 }
    );
  }
}