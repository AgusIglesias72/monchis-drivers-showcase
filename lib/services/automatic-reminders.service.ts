// lib/services/automatic-reminders.service.ts

import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'

/**
 * Obtiene conductores elegibles para recibir recordatorio automático de capacitación
 *
 * Criterios:
 * - Status: COMPLETED
 * - onboardingStatus: null, NOT_READY, o READY (Pendiente de Agendar)
 * - EXCLUYE: SCHEDULED, IN_PROGRESS, COMPLETED (ya tienen capacitación agendada o completada)
 * - No han recibido mensaje personalizado en los últimos 5 días
 * - Postulación completada hace más de 10 días
 * - Límite: configurable (por defecto 10 conductores por ejecución)
 */
export async function getEligibleDriversForReminder(limit: number = 10) {
  const now = new Date()
  const fiveDaysAgo = subDays(now, 5)
  const tenDaysAgo = subDays(now, 10)

  try {
    // Obtener conductores que cumplen los criterios básicos
    const drivers = await prisma.formDriver.findMany({
      where: {
        status: 'COMPLETED',
        // Pendiente de Agendar: solo NOT_READY, READY o null
        // Explícitamente NO incluir SCHEDULED, IN_PROGRESS ni COMPLETED
        OR: [
          { onboardingStatus: 'NOT_READY' },
          { onboardingStatus: 'READY' },
          { onboardingStatus: null },
        ],
        createdAt: {
          lte: tenDaysAgo, // Postulación completada hace más de 10 días
        },
      },
      select: {
        id: true,
        firstName: true,
        fullName: true,
        phoneNumber: true,
        createdAt: true,
        // Incluir mensajes de WhatsApp para filtrar
        whatsappMessages: {
          where: {
            createdAt: {
              gte: fiveDaysAgo,
            },
            // Filtrar solo mensajes personalizados (sin templateId)
            templateId: null,
          },
          select: {
            id: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'asc', // Priorizar postulaciones más antiguas
      },
    })

    // Filtrar conductores que NO han recibido mensajes personalizados en los últimos 5 días
    const eligibleDrivers = drivers
      .filter((driver) => driver.whatsappMessages.length === 0)
      .slice(0, limit) // Limitar a la cantidad especificada
      .map((driver) => ({
        id: driver.id,
        firstName: driver.firstName,
        fullName: driver.fullName,
        phoneNumber: driver.phoneNumber,
        createdAt: driver.createdAt,
      }))

    return {
      success: true,
      drivers: eligibleDrivers,
      count: eligibleDrivers.length,
    }
  } catch (error) {
    console.error('Error getting eligible drivers for reminder:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      drivers: [],
      count: 0,
    }
  }
}

/**
 * Registra la ejecución del cron job de recordatorios
 */
export async function logReminderExecution(data: {
  driversProcessed: number
  successCount: number
  failureCount: number
  executionTimeMs: number
  errors?: string[]
}) {
  try {
    const timestamp = new Date().toISOString()

    console.log('✅ [DAILY REMINDERS] Execution completed:', {
      timestamp,
      driversProcessed: data.driversProcessed,
      successCount: data.successCount,
      failureCount: data.failureCount,
      executionTimeMs: data.executionTimeMs,
      errorCount: data.errors?.length || 0,
    })

    if (data.errors && data.errors.length > 0) {
      console.error('❌ [DAILY REMINDERS] Errors during execution:', data.errors)
    }

    // TODO: Aquí se podría agregar integración con servicios de monitoreo
    // como Sentry, DataDog, o guardar en una tabla de logs de la base de datos

    return { success: true }
  } catch (error) {
    console.error('❌ [DAILY REMINDERS] Error logging execution:', error)
    return { success: false }
  }
}
