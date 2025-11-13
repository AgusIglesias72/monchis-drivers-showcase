// app/api/cron/check-pending-applications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { messagesService } from '@/lib/services/messages.service';
import { FormDriverStatus, WhatsAppMessageType, WhatsAppMessageSource } from '@prisma/client';

// ==================== CONFIGURACIÓN DE PROTECCIÓN ====================

// Verificar que la request venga de Vercel Cron
const CRON_SECRET = process.env.CRON_SECRET || '';

// 🛡️ PROTECCIÓN CONTRA BAN (whatsapp-web.js)
const MAX_MESSAGES_PER_EXECUTION = 30; // Máximo 30 mensajes por ejecución (cada 4 horas)
const DELAY_BETWEEN_MESSAGES_MS = 8000; // 8 segundos entre cada mensaje (más humano)
const BATCH_SIZE = 5; // Procesar de a 5 mensajes
const DELAY_BETWEEN_BATCHES_MS = 60000; // 1 minuto entre batches (parece más natural)

// Con esta config:
// - 5 mensajes cada 8 seg = 40 segundos
// - Espera 1 min
// - Repite
// Total: ~6 batches = 30 mensajes en ~7 minutos
// El cron se ejecuta cada 4 horas = máximo 180 mensajes/día (seguro)

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
}

// ==================== HELPERS ====================

/**
 * Calcula las horas de inactividad de un driver
 */
function calculateInactiveHours(lastActivityAt: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - lastActivityAt.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Sleep/delay helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Obtiene drivers pendientes que necesitan recordatorio - OPTIMIZADO
 */
async function getPendingDrivers(): Promise<PendingDriver[]> {
  // 1. Obtener todos los drivers IN_PROGRESS
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

  // Filtrar los que tienen contacto
  const driversWithContact = drivers.filter(
    (driver) => driver.phoneNumber && driver.fullName
  );

  if (driversWithContact.length === 0) {
    return [];
  }

  const driverIds = driversWithContact.map(d => d.id);

  // 2. ✅ OPTIMIZACIÓN: Obtener TODAS las últimas actividades en batch
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

  // Crear mapa de última actividad
  const lastActivityMap = new Map<string, Date>();
  lastStepCompletions.forEach(completion => {
    const driverId = completion.submission.formDriverId;
    if (driverId && !lastActivityMap.has(driverId) && completion.completedAt) {
      lastActivityMap.set(driverId, completion.completedAt);
    }
  });

  // 3. ✅ OPTIMIZACIÓN: Obtener TODOS los contactos manuales en batch
  const manualContacts = await prisma.driverContact.findMany({
    where: {
      formDriverId: { in: driverIds },
    },
    select: {
      formDriverId: true,
    },
  });

  const manualContactSet = new Set(manualContacts.map(c => c.formDriverId));

  // 4. ✅ OPTIMIZACIÓN: Obtener TODOS los mensajes de WhatsApp en batch
  const whatsappMessages = await prisma.whatsAppMessage.findMany({
    where: {
      formDriverId: { in: driverIds },
    },
    select: {
      formDriverId: true,
    },
  });

  const whatsappMessageSet = new Set(whatsappMessages.map(m => m.formDriverId).filter(Boolean));

  // 5. Procesar todos los drivers en memoria
  const pendingDrivers: PendingDriver[] = [];

  for (const driver of driversWithContact) {
    // Obtener última actividad del mapa
    const lastActivity = lastActivityMap.get(driver.id) || driver.lastActivityAt;
    const inactiveHours = calculateInactiveHours(lastActivity);

    // Filtrar: debe tener 6+ horas de inactividad
    if (inactiveHours < 6) {
      continue;
    }

    // Verificar si fue contactado (usando Sets - O(1))
    const wasContacted = manualContactSet.has(driver.id) || whatsappMessageSet.has(driver.id);
    if (wasContacted) {
      continue;
    }

    pendingDrivers.push({
      id: driver.id,
      fullName: driver.fullName || 'Usuario',
      phoneNumber: driver.phoneNumber,
      currentStep: driver.currentStep,
      lastActivityAt: lastActivity,
      inactiveHours,
    });
  }

  return pendingDrivers;
}

/**
 * Envía recordatorio a un driver con rate limiting
 */
async function sendReminder(driver: PendingDriver): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const messageConfig = STEP_TO_MESSAGE_TYPE[driver.currentStep] || {
      type: 'form_incomplete',
      step: 'personal_info',
    };

    const result = await messagesService.sendWhatsAppMessage({
      phone: driver.phoneNumber,
      name: driver.fullName,
      type: WhatsAppMessageType.FORM_INCOMPLETE,
      step: messageConfig.step,
      formDriverId: driver.id,
      source: WhatsAppMessageSource.CRON,
      metadata: {
        inactiveHours: Math.round(driver.inactiveHours),
        lastActivityAt: driver.lastActivityAt.toISOString(),
        cronExecutedAt: new Date().toISOString(),
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

/**
 * Procesa un batch de drivers con rate limiting
 */
async function processBatch(
  drivers: PendingDriver[],
  batchNumber: number
): Promise<Array<{ success: boolean; error?: string }>> {
  console.log(`📦 [CRON] Processing batch ${batchNumber} (${drivers.length} drivers)...`);
  
  const results: Array<{ success: boolean; error?: string }> = [];

  for (let i = 0; i < drivers.length; i++) {
    const driver = drivers[i];
    
    console.log(`   → Sending to ${driver.fullName} (${i + 1}/${drivers.length})...`);
    
    const result = await sendReminder(driver);
    results.push(result);

    // ⏰ Delay entre mensajes (excepto el último del batch)
    if (i < drivers.length - 1) {
      await sleep(DELAY_BETWEEN_MESSAGES_MS);
    }
  }

  return results;
}

/**
 * Handler del cron job con protección contra ban
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Verificar autenticación del cron
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 [CRON] Starting check-pending-applications job...');

    // 2. Obtener drivers pendientes (OPTIMIZADO - 4 queries batch)
    const allPendingDrivers = await getPendingDrivers();

    console.log(`📋 [CRON] Found ${allPendingDrivers.length} drivers to contact`);

    // 🛡️ PROTECCIÓN: Limitar cantidad de mensajes por ejecución
    const driversToProcess = allPendingDrivers.slice(0, MAX_MESSAGES_PER_EXECUTION);
    const driversSkipped = allPendingDrivers.length - driversToProcess.length;

    if (driversSkipped > 0) {
      console.log(`⚠️ [CRON] Limiting to ${MAX_MESSAGES_PER_EXECUTION} messages. ${driversSkipped} drivers will be processed in the next execution.`);
    }

    if (driversToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending drivers found',
        stats: {
          checked: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
          executionTimeMs: Date.now() - startTime,
        },
      });
    }

    // 3. Dividir en batches
    const batches: PendingDriver[][] = [];
    for (let i = 0; i < driversToProcess.length; i += BATCH_SIZE) {
      batches.push(driversToProcess.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 [CRON] Processing ${driversToProcess.length} drivers in ${batches.length} batches...`);

    // 4. Procesar batches con delays
    const allResults: Array<{ success: boolean; error?: string }> = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchResults = await processBatch(batch, i + 1);
      allResults.push(...batchResults);

      // ⏰ Delay entre batches (excepto el último)
      if (i < batches.length - 1) {
        console.log(`   ⏸️  Waiting ${DELAY_BETWEEN_BATCHES_MS}ms before next batch...`);
        await sleep(DELAY_BETWEEN_BATCHES_MS);
      }
    }

    // 5. Procesar resultados
    const stats = {
      checked: driversToProcess.length,
      sent: allResults.filter(r => r.success).length,
      failed: allResults.filter(r => !r.success).length,
      skipped: driversSkipped,
      executionTimeMs: Date.now() - startTime,
    };

    const details: Array<{
      driverId: string;
      name: string;
      phone: string;
      step: number;
      inactiveHours: number;
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
        inactiveHours: Math.round(driver.inactiveHours),
        status: result.success ? 'sent' : 'failed',
        error: result.error,
      });
    });

    console.log(`✅ [CRON] Job completed: ${stats.sent} sent, ${stats.failed} failed, ${stats.skipped} skipped`);

    // 6. Retornar resultado
    return NextResponse.json({
      success: true,
      message: driversSkipped > 0 
        ? `Processed ${stats.checked} drivers: ${stats.sent} sent, ${stats.failed} failed. ${stats.skipped} drivers will be processed in the next execution.`
        : `Processed ${stats.checked} drivers: ${stats.sent} sent, ${stats.failed} failed`,
      stats,
      details,
      warning: driversSkipped > 0 ? `${driversSkipped} drivers were skipped to prevent rate limiting` : undefined,
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
        },
      },
      { status: 500 }
    );
  }
}