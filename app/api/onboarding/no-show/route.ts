// app/api/onboarding/no-show/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    /*
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
      */

    const { attendeeId } = await request.json();

    if (!attendeeId) {
      return NextResponse.json({ error: 'attendeeId requerido' }, { status: 400 });
    }

    // Obtener información del attendee y del evento
    const attendee = await prisma.onboardingAttendee.findUnique({
      where: { id: attendeeId },
      include: {
        formDriver: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            scheduledDate: true,
            startTime: true,
            location: true,
          },
        },
      },
    });

    if (!attendee) {
      return NextResponse.json({ error: 'Attendee no encontrado' }, { status: 404 });
    }

    const driver = attendee.formDriver;

    // Validar que tenga datos necesarios
    if (!driver.phoneNumber || !driver.fullName) {
      console.warn('⚠️ Driver sin teléfono o nombre:', {
        driverId: driver.id,
        hasPhone: !!driver.phoneNumber,
        hasName: !!driver.fullName,
      });
      return NextResponse.json(
        { error: 'El driver no tiene teléfono o nombre configurado' },
        { status: 400 }
      );
    }

    // TODO: migrar a WhatsApp multi-bot — notificar NO_SHOW al driver y ofrecer re-agendar

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error en /api/onboarding/no-show:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar no-show' },
      { status: 500 }
    );
  }
}