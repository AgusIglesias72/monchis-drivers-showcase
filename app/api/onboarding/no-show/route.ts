// app/api/onboarding/no-show/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
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

/**
 * Formatea fecha para mostrar
 */
function formatEventDate(scheduledDate: string, startTime: string): string {
  const date = new Date(scheduledDate);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  
  return `${dayName} ${day} de ${month} a las ${startTime}`;
}

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

    // Obtener próximas capacitaciones disponibles (próximos 7 días)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcomingEvents = await prisma.onboardingEvent.findMany({
      where: {
        scheduledDate: {
          gte: now.toISOString(),
          lte: sevenDaysFromNow.toISOString(),
        },
        status: 'SCHEDULED',
        id: {
          not: attendee.event.id, // Excluir el evento actual
        },
      },
      select: {
        id: true,
        title: true,
        scheduledDate: true,
        startTime: true,
        location: true,
        _count: {
          select: {
            attendees: {
              where: {
                status: {
                  in: ['INVITED', 'CONFIRMED'],
                },
              },
            },
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
      take: 5, // Máximo 5 eventos próximos
    });

    // Formatear lista de eventos disponibles
    const availableEvents = upcomingEvents.map((event) => ({
      title: event.title || 'Capacitación',
      date: formatEventDate(event.scheduledDate.toISOString(), event.startTime),
      location: event.location || 'Por confirmar',
      spotsAvailable: true, // Puedes agregar lógica de cupos aquí
    }));

    // Enviar mensaje de WhatsApp
    try {
      const firstName = normalizeFirstName(driver.fullName);
      const missedEvent = attendee.event.title || 'la capacitación';

      const ipAddress =
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      const messageResult = await messagesService.sendWhatsAppMessage({
        phone: driver.phoneNumber,
        name: firstName,
        type: WhatsAppMessageType.CAPACITATION_NO_SHOW,
        formDriverId: driver.id,
        source: WhatsAppMessageSource.TRIGGER,
        botId: 'bot-adquisicion-prod',
        metadata: {
          triggeredBy: 'onboarding_no_show',
          attendeeId: attendee.id,
          eventId: attendee.event.id,
          missedEventTitle: missedEvent,
          missedEventDate: formatEventDate(
            attendee.event.scheduledDate.toISOString(),
            attendee.event.startTime
          ),
          availableEvents: availableEvents,
          sentAt: new Date().toISOString(),
        },
        ipAddress,
        userAgent,
      });

      if (messageResult.success) {
        console.log('✅ Mensaje de no-show enviado:', {
          driver: driver.fullName,
          phone: driver.phoneNumber,
          messageId: messageResult.messageId,
          botUsed: messageResult.botUsed,
          upcomingEventsCount: availableEvents.length,
        });

        return NextResponse.json({
          success: true,
          messageId: messageResult.messageId,
          botUsed: messageResult.botUsed,
          upcomingEvents: availableEvents.length,
        });
      } else {
        console.error('⚠️ No se pudo enviar mensaje de no-show:', {
          driver: driver.fullName,
          error: messageResult.error,
          warning: messageResult.warning,
        });

        return NextResponse.json(
          {
            success: false,
            error: messageResult.error || 'Error al enviar mensaje',
          },
          { status: 500 }
        );
      }
    } catch (messageError) {
      console.error('❌ Error enviando mensaje de no-show:', messageError);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al enviar mensaje de WhatsApp',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error en /api/onboarding/no-show:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar no-show' },
      { status: 500 }
    );
  }
}