// app/api/cron/capacitation-reminder/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { messagesService } from '@/lib/services/messages.service';
import { WhatsAppMessageType, WhatsAppMessageSource } from '@prisma/client';

// ==================== CONFIGURACIÓN ====================

const MAX_MESSAGES_PER_EXECUTION = 50;
const DELAY_BETWEEN_MESSAGES_MS = 5000;
const BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES_MS = 30000;

const BOT_ID = 'bot-adquisicion-prod';

// Máximo de recordatorios por attendee por evento
const MAX_REMINDERS_PER_ATTENDEE = 1;

// ==================== TYPES ====================

type ReminderType = 'day-before' | 'same-day';

interface AttendeeToRemind {
  attendeeId: string;
  formDriverId: string;
  fullName: string;
  phoneNumber: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  remindersSentCount: number;
}

// ==================== HELPERS ====================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normaliza el nombre (solo primer nombre, capitalizado)
 */
function normalizeFirstName(fullName: string | null | undefined): string {
  if (!fullName) return 'Usuario';
  const trimmed = fullName.trim();
  const firstName = trimmed.split(' ')[0];
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

/**
 * Formatea fecha para mostrar en el mensaje
 */
function formatEventDateForMessage(scheduledDate: Date): string {
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    const dayName = days[scheduledDate.getDay()];
    const day = scheduledDate.getDate();
    const month = months[scheduledDate.getMonth()];
    
    return `${dayName} ${day} de ${month}`;  // ✅ Sin hora
  }

/**
 * Obtiene la fecha objetivo según el tipo de recordatorio
 * - day-before: mañana
 * - same-day: hoy
 */
function getTargetDate(reminderType: ReminderType): Date {
  const now = new Date();
  
  // Ajustar a GMT-3 (Paraguay/Argentina)
  const offsetMs = -3 * 60 * 60 * 1000;
  const localNow = new Date(now.getTime() + offsetMs);
  
  if (reminderType === 'day-before') {
    // Mañana
    localNow.setDate(localNow.getDate() + 1);
  }
  // same-day = hoy, no cambiamos la fecha
  
  // Retornar solo la fecha (sin hora)
  return new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate());
}

/**
 * Busca attendees que necesitan recordatorio
 */
async function getAttendeesToRemind(reminderType: ReminderType): Promise<AttendeeToRemind[]> {
  const targetDate = getTargetDate(reminderType);
  
  // Rango del día objetivo (inicio y fin)
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  console.log(`📅 Buscando eventos para: ${targetDate.toISOString().split('T')[0]}`);
  console.log(`   Rango: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);

  // Buscar eventos programados para la fecha objetivo
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

  console.log(`📋 Encontrados ${events.length} eventos programados`);

  const attendeesToRemind: AttendeeToRemind[] = [];

  for (const event of events) {
    console.log(`   → Evento: ${event.title || 'Sin título'} (${event.attendees.length} attendees)`);

    for (const attendee of event.attendees) {
      const driver = attendee.formDriver;

      // Validar datos necesarios
      if (!driver.phoneNumber || !driver.fullName) {
        console.log(`     ⚠️ Attendee ${attendee.id} sin teléfono o nombre, saltando...`);
        continue;
      }

      // Contar recordatorios ya enviados para este attendee en este evento
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
        console.log(`     ⏭️ ${driver.fullName} ya recibió ${remindersSent} recordatorios, saltando...`);
        continue;
      }

      // Verificar si ya se envió este tipo específico de recordatorio
      const thisTypeReminderSent = await prisma.whatsAppMessage.count({
        where: {
          formDriverId: driver.id,
          messageType: WhatsAppMessageType.CAPACITATION_REMINDER,
          metadata: {
            path: ['eventId'],
            equals: event.id,
          },
          AND: {
            metadata: {
              path: ['reminderType'],
              equals: reminderType,
            },
          },
        },
      });

      if (thisTypeReminderSent > 0) {
        console.log(`     ⏭️ ${driver.fullName} ya recibió recordatorio tipo "${reminderType}", saltando...`);
        continue;
      }

      attendeesToRemind.push({
        attendeeId: attendee.id,
        formDriverId: driver.id,
        fullName: driver.fullName,
        phoneNumber: driver.phoneNumber,
        eventId: event.id,
        eventTitle: event.title || 'Capacitación Monchis',
        eventDate: formatEventDateForMessage(event.scheduledDate),  // ✅ Solo fecha
        eventTime: event.startTime,  // ✅ Solo hora (ej: "10:00")
        eventLocation: event.location || 'Por confirmar',
        remindersSentCount: remindersSent,
      });
    }
  }

  return attendeesToRemind;
}

/**
 * Envía un recordatorio individual
 */
async function sendReminder(
  attendee: AttendeeToRemind,
  reminderType: ReminderType
): Promise<{ success: boolean; error?: string }> {
  try {
    const firstName = normalizeFirstName(attendee.fullName);

    const result = await messagesService.sendWhatsAppMessage({
      phone: attendee.phoneNumber,
      name: firstName,
      type: WhatsAppMessageType.CAPACITATION_REMINDER,
      formDriverId: attendee.formDriverId,
      source: WhatsAppMessageSource.CRON,
      botId: BOT_ID as any,
      metadata: {
        eventId: attendee.eventId,
        eventTitle: attendee.eventTitle,
        eventDate: attendee.eventDate,
        eventTime: attendee.eventTime,
        eventLocation: attendee.eventLocation,
        reminderType: reminderType,
        reminderNumber: attendee.remindersSentCount + 1,
        cronExecutedAt: new Date().toISOString(),
      },
    });

    return {
      success: result.success,
      error: result.error,
    };
  } catch (error) {
    console.error(`Error sending reminder to ${attendee.fullName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Procesa un batch de attendees
 */
async function processBatch(
  attendees: AttendeeToRemind[],
  reminderType: ReminderType,
  batchNumber: number
): Promise<Array<{ success: boolean; error?: string }>> {
  console.log(`📦 Procesando batch ${batchNumber} (${attendees.length} attendees)...`);

  const results: Array<{ success: boolean; error?: string }> = [];

  for (let i = 0; i < attendees.length; i++) {
    const attendee = attendees[i];

    console.log(`   → Enviando a ${attendee.fullName} (${i + 1}/${attendees.length})...`);

    const result = await sendReminder(attendee, reminderType);
    results.push(result);

    if (result.success) {
      console.log(`     ✅ Enviado`);
    } else {
      console.log(`     ❌ Error: ${result.error}`);
    }

    if (i < attendees.length - 1) {
      await sleep(DELAY_BETWEEN_MESSAGES_MS);
    }
  }

  return results;
}

// ==================== MAIN HANDLER ====================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Autenticación
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ [CRON] Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener tipo de recordatorio desde query params
    const { searchParams } = new URL(request.url);
    const reminderType = (searchParams.get('type') as ReminderType) || 'day-before';

    if (!['day-before', 'same-day'].includes(reminderType)) {
      return NextResponse.json(
        { error: 'Invalid reminder type. Use "day-before" or "same-day"' },
        { status: 400 }
      );
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🔔 [CRON] Iniciando capacitation-reminder (${reminderType})`);
    console.log(`🤖 [CRON] Bot: ${BOT_ID}`);
    console.log('═══════════════════════════════════════════════════════════');

    // Buscar attendees a notificar
    const allAttendees = await getAttendeesToRemind(reminderType);

    console.log(`\n📋 Total attendees a notificar: ${allAttendees.length}`);

    if (allAttendees.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay attendees para notificar',
        reminderType,
        stats: {
          checked: 0,
          sent: 0,
          failed: 0,
          executionTimeMs: Date.now() - startTime,
          botUsed: BOT_ID,
        },
      });
    }

    // Limitar cantidad
    const attendeesToProcess = allAttendees.slice(0, MAX_MESSAGES_PER_EXECUTION);
    const attendeesSkipped = allAttendees.length - attendeesToProcess.length;

    if (attendeesSkipped > 0) {
      console.log(`⚠️ Limitando a ${MAX_MESSAGES_PER_EXECUTION}. ${attendeesSkipped} se procesarán después.`);
    }

    // Dividir en batches
    const batches: AttendeeToRemind[][] = [];
    for (let i = 0; i < attendeesToProcess.length; i += BATCH_SIZE) {
      batches.push(attendeesToProcess.slice(i, i + BATCH_SIZE));
    }

    console.log(`\n📦 Procesando ${attendeesToProcess.length} attendees en ${batches.length} batches...\n`);

    // Procesar batches
    const allResults: Array<{ success: boolean; error?: string }> = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchResults = await processBatch(batch, reminderType, i + 1);
      allResults.push(...batchResults);

      if (i < batches.length - 1) {
        console.log(`   ⏸️ Esperando ${DELAY_BETWEEN_BATCHES_MS / 1000}s antes del siguiente batch...`);
        await sleep(DELAY_BETWEEN_BATCHES_MS);
      }
    }

    // Estadísticas
    const stats = {
      checked: attendeesToProcess.length,
      sent: allResults.filter((r) => r.success).length,
      failed: allResults.filter((r) => !r.success).length,
      skipped: attendeesSkipped,
      executionTimeMs: Date.now() - startTime,
      botUsed: BOT_ID,
    };

    // Detalles
    const details = attendeesToProcess.map((attendee, index) => {
      const result = allResults[index];
      return {
        attendeeId: attendee.attendeeId,
        formDriverId: attendee.formDriverId,
        name: attendee.fullName,
        phone: attendee.phoneNumber,
        eventTitle: attendee.eventTitle,
        eventDate: attendee.eventDate,
        reminderNumber: attendee.remindersSentCount + 1,
        status: result.success ? 'sent' : 'failed',
        error: result.error,
      };
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`✅ [CRON] Completado: ${stats.sent} enviados, ${stats.failed} fallidos`);
    console.log('═══════════════════════════════════════════════════════════');

    return NextResponse.json({
      success: true,
      message: `Recordatorios ${reminderType}: ${stats.sent} enviados, ${stats.failed} fallidos`,
      reminderType,
      stats,
      details,
      warning: attendeesSkipped > 0 
        ? `${attendeesSkipped} attendees se procesarán en la próxima ejecución` 
        : undefined,
    });

  } catch (error) {
    console.error('❌ [CRON] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stats: {
          checked: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
          executionTimeMs: Date.now() - startTime,
          botUsed: BOT_ID,
        },
      },
      { status: 500 }
    );
  }
}