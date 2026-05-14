// app/api/form/check-phone/route.ts
//
// Endpoint público que le pregunta al backend "este teléfono ya empezó un
// formulario?". Si sí, devuelve `sessionId` y `currentStep` para que el front
// pueda retomar desde donde quedó.
//
// PII reducida: ya NO devolvemos driverName ni lastActivityAt para limitar
// enumeración (alguien iterando teléfonos solo sabe "sí/no", no nombres ni
// timestamps que ayuden a perfilar).
//
// TODO futuro: el "retomar sesión" debería gatearse con un código por SMS al
// número antes de devolver sessionId. Sin eso, conocer un teléfono permite
// secuestrar el flujo de un postulante.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { error: 'phoneNumber es requerido' },
        { status: 400 }
      );
    }

    const formDriver = await prisma.formDriver.findFirst({
      where: {
        phoneNumber,
        status: 'IN_PROGRESS',
      },
      orderBy: { lastActivityAt: 'desc' },
      include: {
        submissions: {
          where: { isComplete: false },
          orderBy: { lastActivityAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!formDriver || formDriver.submissions.length === 0) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      sessionId: formDriver.submissions[0].sessionId,
      currentStep: formDriver.currentStep,
    });
  } catch (error: any) {
    console.error('Error en check-phone:', error?.message ?? 'unknown');
    return NextResponse.json(
      { error: 'Error al verificar el teléfono' },
      { status: 500 }
    );
  }
}