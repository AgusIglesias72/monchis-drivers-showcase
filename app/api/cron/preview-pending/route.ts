// app/api/cron/preview-pending/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FormDriverStatus } from '@prisma/client';

// Mapeo de steps a tipos de mensajes
const STEP_TO_MESSAGE_TYPE: Record<number, { type: string; step: string }> = {
  1: { type: 'form_incomplete', step: 'personal_info' },
  2: { type: 'form_incomplete', step: 'personal_info' },
  3: { type: 'form_incomplete', step: 'personal_info' },
  4: { type: 'form_incomplete', step: 'documents' },
  5: { type: 'form_incomplete', step: 'bank_info' },
  6: { type: 'form_incomplete', step: 'equipment_payment' },
};

interface PendingDriverPreview {
  id: string;
  fullName: string;
  phoneNumber: string;
  cedula: string;
  currentStep: number;
  lastActivityAt: string;
  inactiveHours: number;
  messageType: string;
  messageStep: string;
  alreadyContacted: boolean;
  contactReason?: string;
  wouldSendMessage: boolean;
}

/**
 * Calcula las horas de inactividad de un driver
 */
function calculateInactiveHours(lastActivityAt: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - lastActivityAt.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Handler del endpoint de preview - OPTIMIZADO
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const cronError = requireCronAuth(request);
    if (cronError) return cronError;

    console.log('🔍 [PREVIEW] Starting preview-pending job...');

    // 1. Buscar todos los drivers IN_PROGRESS
    const drivers = await prisma.formDriver.findMany({
      where: {
        status: FormDriverStatus.IN_PROGRESS,
        assistedCompletion: false,
      },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        cedula: true,
        currentStep: true,
        lastActivityAt: true,
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
    });

    // Filtrar en JS los que tienen phoneNumber y fullName
    const driversWithContact = drivers.filter(
      d => d.phoneNumber && d.fullName
    );

    console.log(`📋 [PREVIEW] Found ${driversWithContact.length} IN_PROGRESS drivers with contact info`);

    if (driversWithContact.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          total: 0,
          wouldSend: 0,
          inactive6Plus: 0,
          alreadyContacted: 0,
          missingContact: drivers.length,
          executionTimeMs: Date.now() - startTime,
        },
        grouped: {
          willSend: [],
          notEnoughInactivity: [],
          alreadyContacted: [],
        },
        allDrivers: [],
      });
    }

    const driverIds = driversWithContact.map(d => d.id);

    // 2. ✅ OPTIMIZACIÓN: Obtener TODAS las últimas actividades en una sola query
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

    // Crear un mapa de última actividad por driver
    const lastActivityMap = new Map<string, Date>();
    lastStepCompletions.forEach(completion => {
      const driverId = completion.submission.formDriverId;
      if (driverId && !lastActivityMap.has(driverId) && completion.completedAt) {
        lastActivityMap.set(driverId, completion.completedAt);
      }
    });

    // 3. ✅ OPTIMIZACIÓN: Obtener TODOS los contactos en una sola query
    const manualContacts = await prisma.driverContact.findMany({
      where: {
        formDriverId: { in: driverIds },
      },
      orderBy: {
        contactedAt: 'desc',
      },
      select: {
        formDriverId: true,
        contactedAt: true,
      },
      distinct: ['formDriverId'],
    });

    const manualContactMap = new Map<string, Date>();
    manualContacts.forEach(contact => {
      if (!manualContactMap.has(contact.formDriverId)) {
        manualContactMap.set(contact.formDriverId, contact.contactedAt);
      }
    });

    // 4. ✅ OPTIMIZACIÓN: Obtener TODOS los mensajes de WhatsApp en una sola query
    const whatsappMessages = await prisma.whatsAppMessage.findMany({
      where: {
        formDriverId: { in: driverIds },
      },
      orderBy: {
        sentAt: 'desc',
      },
      select: {
        formDriverId: true,
        messageType: true,
        sentAt: true,
      },
      distinct: ['formDriverId'],
    });

    const whatsappMessageMap = new Map<string, { type: string; sentAt: Date }>();
    whatsappMessages.forEach(msg => {
      if (msg.formDriverId && !whatsappMessageMap.has(msg.formDriverId)) {
        whatsappMessageMap.set(msg.formDriverId, {
          type: msg.messageType,
          sentAt: msg.sentAt,
        });
      }
    });

    // 5. Procesar cada driver con los datos ya cargados
    const previews: PendingDriverPreview[] = driversWithContact.map(driver => {
      // Obtener última actividad del mapa
      const lastActivity = lastActivityMap.get(driver.id) || driver.lastActivityAt;
      const inactiveHours = calculateInactiveHours(lastActivity);

      // Verificar si fue contactado
      let alreadyContacted = false;
      let contactReason: string | undefined;

      const manualContact = manualContactMap.get(driver.id);
      if (manualContact) {
        alreadyContacted = true;
        contactReason = `Contacto manual el ${manualContact.toLocaleDateString()}`;
      }

      const whatsappMsg = whatsappMessageMap.get(driver.id);
      if (!alreadyContacted && whatsappMsg) {
        alreadyContacted = true;
        contactReason = `Mensaje WhatsApp (${whatsappMsg.type}) el ${whatsappMsg.sentAt.toLocaleDateString()}`;
      }

      // Determinar tipo de mensaje
      const messageConfig = STEP_TO_MESSAGE_TYPE[driver.currentStep] || {
        type: 'form_incomplete',
        step: 'personal_info',
      };

      // Determinar si se enviaría el mensaje
      const wouldSendMessage = 
        inactiveHours >= 6 && 
        !alreadyContacted;

      return {
        id: driver.id,
        fullName: driver.fullName!,
        phoneNumber: driver.phoneNumber!,
        cedula: driver.cedula,
        currentStep: driver.currentStep,
        lastActivityAt: lastActivity.toISOString(),
        inactiveHours: Math.round(inactiveHours * 10) / 10,
        messageType: 'FORM_INCOMPLETE',
        messageStep: messageConfig.step,
        alreadyContacted,
        contactReason,
        wouldSendMessage,
      };
    });

    // 6. Estadísticas
    const stats = {
      total: previews.length,
      wouldSend: previews.filter(p => p.wouldSendMessage).length,
      inactive6Plus: previews.filter(p => p.inactiveHours >= 6).length,
      alreadyContacted: previews.filter(p => p.alreadyContacted).length,
      missingContact: drivers.length - driversWithContact.length,
      executionTimeMs: Date.now() - startTime,
    };

    // 7. Agrupar por motivo
    const grouped = {
      willSend: previews.filter(p => p.wouldSendMessage),
      notEnoughInactivity: previews.filter(p => !p.wouldSendMessage && p.inactiveHours < 6),
      alreadyContacted: previews.filter(p => !p.wouldSendMessage && p.alreadyContacted),
    };

    console.log(`✅ [PREVIEW] Preview completed in ${stats.executionTimeMs}ms:`, {
      total: stats.total,
      wouldSend: stats.wouldSend,
      inactive6Plus: stats.inactive6Plus,
      alreadyContacted: stats.alreadyContacted,
    });

    return NextResponse.json({
      success: true,
      stats,
      grouped,
      allDrivers: previews,
    });

  } catch (error) {
    console.error('❌ [PREVIEW] Preview failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stats: {
          total: 0,
          wouldSend: 0,
          inactive6Plus: 0,
          alreadyContacted: 0,
          missingContact: 0,
          executionTimeMs: Date.now() - startTime,
        },
      },
      { status: 500 }
    );
  }
}