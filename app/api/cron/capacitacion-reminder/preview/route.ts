// app/api/cron/capacitation-reminder/preview/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WhatsAppMessageType } from '@prisma/client';

// ==================== CONFIGURACIÓN ====================

const BOT_ID = 'bot-adquisicion-prod';
const MAX_REMINDERS_PER_ATTENDEE = 2;

type ReminderType = 'day-before' | 'same-day';

// ==================== HELPERS ====================

function normalizeFirstName(fullName: string | null | undefined): string {
  if (!fullName) return 'Usuario';
  const trimmed = fullName.trim();
  const firstName = trimmed.split(' ')[0];
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

function formatEventDateForMessage(scheduledDate: Date): string {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  const dayName = days[scheduledDate.getDay()];
  const day = scheduledDate.getDate();
  const month = months[scheduledDate.getMonth()];
  
  return `${dayName} ${day} de ${month}`;
}

function getTargetDate(reminderType: ReminderType): { date: Date; startOfDay: Date; endOfDay: Date } {
  const now = new Date();
  
  // Ajustar a GMT-3
  const offsetMs = -3 * 60 * 60 * 1000;
  const localNow = new Date(now.getTime() + offsetMs);
  
  if (reminderType === 'day-before') {
    localNow.setDate(localNow.getDate() + 1);
  }
  
  const targetDate = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate());
  
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  return { date: targetDate, startOfDay, endOfDay };
}

// ==================== MAIN HANDLER ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reminderType = (searchParams.get('type') as ReminderType) || 'day-before';
    const filterPhone = searchParams.get('phone'); // Filtrar por teléfono específico

    if (!['day-before', 'same-day'].includes(reminderType)) {
      return NextResponse.json(
        { error: 'Invalid reminder type. Use "day-before" or "same-day"' },
        { status: 400 }
      );
    }

    const { date: targetDate, startOfDay, endOfDay } = getTargetDate(reminderType);

    // ===== BUSCAR EVENTOS =====
    const events = await prisma.onboardingEvent.findMany({
      where: {
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'SCHEDULED',
      },
      include: {
        attendees: {
          where: {
            status: {
              in: ['INVITED', 'CONFIRMED'],
            },
          },
          include: {
            formDriver: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    // ===== ARMAR PREVIEW DATA =====
    const previewData: any[] = [];
    const skippedAttendees: any[] = [];

    for (const event of events) {
      for (const attendee of event.attendees) {
        const driver = attendee.formDriver;

        // Validar datos
        if (!driver.phoneNumber || !driver.fullName) {
          skippedAttendees.push({
            attendeeId: attendee.id,
            reason: 'Sin teléfono o nombre',
            driverData: {
              id: driver.id,
              fullName: driver.fullName,
              phoneNumber: driver.phoneNumber,
            },
          });
          continue;
        }

        // Filtrar por teléfono si se especificó
        if (filterPhone) {
          const normalizedFilter = filterPhone.replace(/\D/g, '');
          const normalizedPhone = driver.phoneNumber.replace(/\D/g, '');
          if (!normalizedPhone.includes(normalizedFilter) && !normalizedFilter.includes(normalizedPhone)) {
            continue;
          }
        }

        // Contar recordatorios previos
        const remindersSent = await prisma.whatsAppMessage.count({
          where: {
            formDriverId: driver.id,
            messageType: WhatsAppMessageType.CAPACITATION_REMINDER,
            metadata: {
              path: ['eventId'],
              equals: event.id,
            },
          },
        });

        if (remindersSent >= MAX_REMINDERS_PER_ATTENDEE) {
          skippedAttendees.push({
            attendeeId: attendee.id,
            driverName: driver.fullName,
            phone: driver.phoneNumber,
            reason: `Ya recibió ${remindersSent}/${MAX_REMINDERS_PER_ATTENDEE} recordatorios`,
          });
          continue;
        }

        // Verificar si ya se envió este tipo específico
        const thisTypeReminderSent = await prisma.whatsAppMessage.count({
          where: {
            formDriverId: driver.id,
            messageType: WhatsAppMessageType.CAPACITATION_REMINDER,
            AND: [
              {
                metadata: {
                  path: ['eventId'],
                  equals: event.id,
                },
              },
              {
                metadata: {
                  path: ['reminderType'],
                  equals: reminderType,
                },
              },
            ],
          },
        });

        if (thisTypeReminderSent > 0) {
          skippedAttendees.push({
            attendeeId: attendee.id,
            driverName: driver.fullName,
            phone: driver.phoneNumber,
            reason: `Ya recibió recordatorio tipo "${reminderType}"`,
          });
          continue;
        }

        // ===== ESTE ES EL OBJETO QUE SE ENVIARÍA AL BOT =====
        const messagePayload = {
          phone: driver.phoneNumber,
          name: normalizeFirstName(driver.fullName),
          type: 'CAPACITATION_REMINDER',
          formDriverId: driver.id,
          source: 'CRON',
          botId: BOT_ID,
          metadata: {
            eventId: event.id,
            eventTitle: event.title || 'Capacitación Monchis',
            eventDate: formatEventDateForMessage(event.scheduledDate),
            eventTime: event.startTime,
            eventLocation: event.location || 'Por confirmar',
            reminderType: reminderType,
            reminderNumber: remindersSent + 1,
            cronExecutedAt: new Date().toISOString(),
          },
        };

        previewData.push({
          // Info del attendee
          attendee: {
            id: attendee.id,
            status: attendee.status,
          },
          driver: {
            id: driver.id,
            fullName: driver.fullName,
            phoneNumber: driver.phoneNumber,
          },
          event: {
            id: event.id,
            title: event.title,
            scheduledDate: event.scheduledDate,
            startTime: event.startTime,
            location: event.location,
          },
          // Lo que se enviaría al servicio de mensajes
          messagePayload: messagePayload,
          // Preview del mensaje que generaría el bot
          expectedMessage: generateExpectedMessage(
            normalizeFirstName(driver.fullName),
            messagePayload.metadata
          ),
          remindersSentPreviously: remindersSent,
        });
      }
    }

    return NextResponse.json({
      preview: true,
      reminderType,
      targetDate: targetDate.toISOString().split('T')[0],
      searchRange: {
        from: startOfDay.toISOString(),
        to: endOfDay.toISOString(),
      },
      summary: {
        eventsFound: events.length,
        attendeesToNotify: previewData.length,
        attendeesSkipped: skippedAttendees.length,
      },
      // ===== LOS MENSAJES QUE SE ENVIARÍAN =====
      messagesToSend: previewData,
      // ===== LOS QUE SE SALTEARÍAN =====
      skipped: skippedAttendees,
      // Info de eventos encontrados
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        scheduledDate: e.scheduledDate,
        startTime: e.startTime,
        location: e.location,
        totalAttendees: e.attendees.length,
      })),
    });

  } catch (error: any) {
    console.error('❌ [PREVIEW] Error:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

/**
 * Genera el mensaje esperado (simulando lo que haría el bot)
 */
function generateExpectedMessage(firstName: string, metadata: any): string {
  const { 
    eventTitle = 'tu capacitación',
    eventDate = '',
    eventTime = '',
    eventLocation = 'Por confirmar',
    reminderType = 'day-before',
  } = metadata;

  if (reminderType === 'same-day') {
    return `¡Hola ${firstName}! 👋

⏰ *¡Hoy es el día!*

Te recordamos que tenés ${eventTitle} programada para hoy a las *${eventTime}*.

📍 *Lugar:* ${eventLocation}

📋 *Recordá traer:*
- Cédula de identidad
- Gs. 200.000 para el kit (si no pagaste por transferencia)

¡Te esperamos! 🚗
Equipo Monchis 💪🍔`;
  } else {
    return `¡Hola ${firstName}! 👋

Te recordamos que mañana tenés ${eventTitle}.

📅 *Fecha:* ${eventDate}
📍 *Lugar:* ${eventLocation}

📋 *Recordá traer:*
- Cédula de identidad
- Gs. 200.000 para el kit (si no pagaste por transferencia)

Si tenés algún inconveniente para asistir, por favor avisanos respondiendo este mensaje.

¡Te esperamos! 🚗
Equipo Monchis 💪🍔`;
  }
}