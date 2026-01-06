// app/api/cron/check-pending-applications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { messagesService } from '@/lib/services/messages.service';
import { FormDriverStatus, WhatsAppMessageType, WhatsAppMessageSource } from '@prisma/client';

// ==================== CONFIGURACIÓN ====================

const MAX_MESSAGES_PER_EXECUTION = 30;
const DELAY_BETWEEN_MESSAGES_MS = 8000;
const BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES_MS = 60000;
const MAX_TOTAL_REMINDERS = 10; // Máximo de recordatorios por conductor

// ✅ Bot a usar para recordatorios
const BOT_ID = 'bot-adquisicion-prod';

// ==================== INTERVALOS DE RECORDATORIO ====================

// Intervalos exponenciales en horas
const REMINDER_INTERVALS = [
  { level: 1, hours: 6, description: '6 horas' },           // Primer mensaje
  { level: 2, hours: 72, description: '3 días' },           // 3 días después
  { level: 3, hours: 168, description: '7 días' },          // 7 días después
  { level: 4, hours: 336, description: '14 días' },         // 14 días después
  { level: 5, hours: 720, description: '30 días' },         // 30 días después
  { level: 6, hours: 1440, description: '60 días' },        // 60 días después
  { level: 7, hours: 2160, description: '90 días' },        // 90 días después
  // Después del nivel 7, seguir cada 30 días
  { level: 8, hours: 720, description: '30 días (8)' },
  { level: 9, hours: 720, description: '30 días (9)' },
  { level: 10, hours: 720, description: '30 días (10)' },
];

// ==================== MAPEO DE STEPS ====================

const STEP_TO_MESSAGE_TYPE: Record<number, { type: string; step: string }> = {
  1: { type: 'form_incomplete', step: 'personal_info' },
  2: { type: 'form_incomplete', step: 'personal_info' },
  3: { type: 'form_incomplete', step: 'personal_info' },
  4: { type: 'form_incomplete', step: 'documents' },
  5: { type: 'form_incomplete', step: 'bank_info' },
  6: { type: 'form_incomplete', step: 'equipment_payment' },
};

interface PendingDriver {
  id: string;
  fullName: string;
  phoneNumber: string;
  currentStep: number;
  lastActivityAt: Date;
  inactiveHours: number;
  lastReminderLevel: number;
  lastReminderSentAt: Date | null;
  hoursSinceLastReminder: number | null;
}

// ==================== HELPERS ====================

function calculateHoursDifference(date1: Date, date2: Date): number {
  const diffMs = date2.getTime() - date1.getTime();
  return diffMs / (1000 * 60 * 60);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getPendingDrivers(): Promise<PendingDriver[]> {
  const now = new Date();

  // 1. Obtener todos los drivers con formulario en progreso
  const drivers = await prisma.formDriver.findMany({
    where: {
      status: FormDriverStatus.IN_PROGRESS,
      assistedCompletion: false,
    },
    select: {
      id: true,
      fullName: true,
      phoneNumber: true,
      currentStep: true,
      lastActivityAt: true,
    },
  });

  // 2. Filtrar solo los que tienen teléfono y nombre
  const driversWithContact = drivers.filter((driver) => driver.phoneNumber && driver.fullName);

  if (driversWithContact.length === 0) {
    return [];
  }

  const driverIds = driversWithContact.map((d) => d.id);

  // 3. Obtener la última actividad real (último step completado)
  const lastStepCompletions = await prisma.formStepCompletion.findMany({
    where: {
      submission: {
        formDriverId: { in: driverIds },
      },
      completedAt: { not: null },
    },
    orderBy: {
      completedAt: 'desc',
    },
    select: {
      submission: {
        select: {
          formDriverId: true,
        },
      },
      completedAt: true,
    },
  });

  const lastActivityMap = new Map<string, Date>();
  lastStepCompletions.forEach((completion) => {
    const driverId = completion.submission.formDriverId;
    if (driverId && !lastActivityMap.has(driverId) && completion.completedAt) {
      lastActivityMap.set(driverId, completion.completedAt);
    }
  });

  // 4. Obtener el último mensaje de FORM_INCOMPLETE enviado a cada driver
  const lastMessages = await prisma.whatsAppMessage.findMany({
    where: {
      formDriverId: { in: driverIds },
      type: WhatsAppMessageType.FORM_INCOMPLETE,
      status: { in: ['SENT', 'DELIVERED', 'READ'] }, // Solo mensajes exitosos
    },
    orderBy: {
      sentAt: 'desc',
    },
    select: {
      formDriverId: true,
      sentAt: true,
      metadata: true,
    },
  });

  const lastMessageMap = new Map<string, { sentAt: Date; reminderLevel: number }>();
  lastMessages.forEach((message) => {
    if (message.formDriverId && !lastMessageMap.has(message.formDriverId)) {
      const reminderLevel = (message.metadata as any)?.reminderLevel || 0;
      lastMessageMap.set(message.formDriverId, {
        sentAt: message.sentAt,
        reminderLevel,
      });
    }
  });

  // 5. Procesar cada driver para determinar si debe recibir recordatorio
  const pendingDrivers: PendingDriver[] = [];

  for (const driver of driversWithContact) {
    const lastActivity = lastActivityMap.get(driver.id) || driver.lastActivityAt;
    const lastMessage = lastMessageMap.get(driver.id);

    const currentReminderLevel = lastMessage?.reminderLevel || 0;
    const nextReminderLevel = currentReminderLevel + 1;

    // 6. Verificar si ya alcanzó el máximo de recordatorios
    if (currentReminderLevel >= MAX_TOTAL_REMINDERS) {
      continue; // Ya recibió el máximo de recordatorios
    }

    // 7. Obtener el intervalo del siguiente recordatorio
    let nextInterval = REMINDER_INTERVALS.find((i) => i.level === nextReminderLevel);

    // Si ya pasó el nivel 7, usar intervalos de 30 días
    if (!nextInterval && nextReminderLevel > 7) {
      nextInterval = { level: nextReminderLevel, hours: 720, description: '30 días' };
    }

    if (!nextInterval) {
      continue; // No hay más intervalos configurados
    }

    // 8. Calcular tiempo desde la referencia apropiada
    let referenceDate: Date;
    let hoursSinceReference: number;

    if (lastMessage) {
      // Si ya recibió mensajes, usar la fecha del último mensaje
      referenceDate = lastMessage.sentAt;
      hoursSinceReference = calculateHoursDifference(referenceDate, now);
    } else {
      // Si es el primer mensaje, usar la última actividad
      referenceDate = lastActivity;
      hoursSinceReference = calculateHoursDifference(referenceDate, now);
    }

    // 9. Verificar si corresponde enviar el siguiente recordatorio
    if (hoursSinceReference >= nextInterval.hours) {
      pendingDrivers.push({
        id: driver.id,
        fullName: driver.fullName || 'Usuario',
        phoneNumber: driver.phoneNumber,
        currentStep: driver.currentStep,
        lastActivityAt: lastActivity,
        inactiveHours: calculateHoursDifference(lastActivity, now),
        lastReminderLevel: currentReminderLevel,
        lastReminderSentAt: lastMessage?.sentAt || null,
        hoursSinceLastReminder: hoursSinceReference,
      });

      console.log(
        `   📋 Driver ${driver.fullName}: Level ${currentReminderLevel} → ${nextReminderLevel} (${Math.round(hoursSinceReference)}h since last reminder)`
      );
    }
  }

  return pendingDrivers;
}

async function sendReminder(
  driver: PendingDriver
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const messageConfig = STEP_TO_MESSAGE_TYPE[driver.currentStep] || {
      type: 'form_incomplete',
      step: 'personal_info',
    };

    const nextReminderLevel = driver.lastReminderLevel + 1;

    const result = await messagesService.sendWhatsAppMessage({
      phone: driver.phoneNumber,
      name: driver.fullName,
      type: WhatsAppMessageType.FORM_INCOMPLETE,
      step: messageConfig.step,
      formDriverId: driver.id,
      source: WhatsAppMessageSource.CRON,
      botId: BOT_ID as any,
      metadata: {
        reminderLevel: nextReminderLevel, // ✨ NUEVO: Nivel de recordatorio
        previousReminderLevel: driver.lastReminderLevel,
        hoursSinceLastReminder: driver.hoursSinceLastReminder
          ? Math.round(driver.hoursSinceLastReminder)
          : null,
        inactiveHours: Math.round(driver.inactiveHours),
        lastActivityAt: driver.lastActivityAt.toISOString(),
        lastReminderSentAt: driver.lastReminderSentAt?.toISOString() || null,
        cronExecutedAt: new Date().toISOString(),
        currentStep: driver.currentStep,
      },
    });

    return {
      success: result.success,
      error: result.error,
    };
  } catch (error) {
    console.error(`Error sending reminder to driver ${driver.id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function processBatch(
  drivers: PendingDriver[],
  batchNumber: number
): Promise<Array<{ success: boolean; error?: string }>> {
  console.log(`📦 [CRON] Processing batch ${batchNumber} (${drivers.length} drivers)...`);

  const results: Array<{ success: boolean; error?: string }> = [];

  for (let i = 0; i < drivers.length; i++) {
    const driver = drivers[i];
    const nextLevel = driver.lastReminderLevel + 1;

    console.log(
      `   → [Level ${nextLevel}] Sending to ${driver.fullName} (${i + 1}/${drivers.length})...`
    );

    const result = await sendReminder(driver);
    results.push(result);

    if (i < drivers.length - 1) {
      await sleep(DELAY_BETWEEN_MESSAGES_MS);
    }
  }

  return results;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ [CRON] Unauthorized: Invalid or missing authorization');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 [CRON] Starting check-pending-applications job (Exponential Re-engagement)...');
    console.log(`🤖 [CRON] Using bot: ${BOT_ID}`);
    console.log(
      `📊 [CRON] Reminder intervals: ${REMINDER_INTERVALS.map((i) => `L${i.level}:${i.description}`).join(', ')}`
    );

    const allPendingDrivers = await getPendingDrivers();

    console.log(`📋 [CRON] Found ${allPendingDrivers.length} drivers eligible for reminders`);

    const driversToProcess = allPendingDrivers.slice(0, MAX_MESSAGES_PER_EXECUTION);
    const driversSkipped = allPendingDrivers.length - driversToProcess.length;

    if (driversSkipped > 0) {
      console.log(
        `⚠️ [CRON] Limiting to ${MAX_MESSAGES_PER_EXECUTION} messages. ${driversSkipped} drivers will be processed in the next execution.`
      );
    }

    if (driversToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No drivers eligible for reminders',
        stats: {
          checked: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
          executionTimeMs: Date.now() - startTime,
          botUsed: BOT_ID,
        },
      });
    }

    const batches: PendingDriver[][] = [];
    for (let i = 0; i < driversToProcess.length; i += BATCH_SIZE) {
      batches.push(driversToProcess.slice(i, i + BATCH_SIZE));
    }

    console.log(
      `📦 [CRON] Processing ${driversToProcess.length} drivers in ${batches.length} batches...`
    );

    const allResults: Array<{ success: boolean; error?: string }> = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchResults = await processBatch(batch, i + 1);
      allResults.push(...batchResults);

      if (i < batches.length - 1) {
        console.log(`   ⏸️  Waiting ${DELAY_BETWEEN_BATCHES_MS}ms before next batch...`);
        await sleep(DELAY_BETWEEN_BATCHES_MS);
      }
    }

    const stats = {
      checked: driversToProcess.length,
      sent: allResults.filter((r) => r.success).length,
      failed: allResults.filter((r) => !r.success).length,
      skipped: driversSkipped,
      executionTimeMs: Date.now() - startTime,
      botUsed: BOT_ID,
      maxRemindersLimit: MAX_TOTAL_REMINDERS,
    };

    const details: Array<{
      driverId: string;
      name: string;
      phone: string;
      step: number;
      reminderLevel: number;
      hoursSinceLastReminder: number | null;
      status: 'sent' | 'failed';
      error?: string;
    }> = [];

    driversToProcess.forEach((driver, index) => {
      const result = allResults[index];
      details.push({
        driverId: driver.id,
        name: driver.fullName,
        phone: driver.phoneNumber,
        step: driver.currentStep,
        reminderLevel: driver.lastReminderLevel + 1,
        hoursSinceLastReminder: driver.hoursSinceLastReminder
          ? Math.round(driver.hoursSinceLastReminder)
          : null,
        status: result.success ? 'sent' : 'failed',
        error: result.error,
      });
    });

    console.log(
      `✅ [CRON] Job completed: ${stats.sent} sent, ${stats.failed} failed, ${stats.skipped} skipped`
    );

    return NextResponse.json({
      success: true,
      message:
        driversSkipped > 0
          ? `Processed ${stats.checked} drivers: ${stats.sent} sent, ${stats.failed} failed. ${stats.skipped} drivers will be processed in the next execution.`
          : `Processed ${stats.checked} drivers: ${stats.sent} sent, ${stats.failed} failed`,
      stats,
      details,
      warning:
        driversSkipped > 0
          ? `${driversSkipped} drivers were skipped to prevent rate limiting`
          : undefined,
    });
  } catch (error) {
    console.error('❌ [CRON] Job failed:', error);

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
