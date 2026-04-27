// lib/services/automatic-reminders.service.ts

import { getEligibleDriversForContact, type MessageConceptResult } from './messaging-frequency.service'

/**
 * Obtiene conductores elegibles para recibir recordatorio automático.
 *
 * Usa el nuevo sistema de frecuencia con backoff exponencial:
 * - noContactBefore ya pasó o nunca fue seteado
 * - No está en estado terminal de onboarding (COMPLETED, IN_PROGRESS)
 * - Determina el concepto de mensaje según el estado actual del postulante
 * - Prioriza los que recibieron menos mensajes y los más antiguos
 */
export async function getEligibleDriversForReminder(limit: number = 20) {
  try {
    const eligible = await getEligibleDriversForContact(limit)

    return {
      success: true,
      drivers: eligible.map((d) => ({
        id: d.id,
        firstName: d.firstName,
        lastName: d.lastName,
        fullName: d.fullName,
        phoneNumber: d.phoneNumber,
        accessToken: d.accessToken,
        manychatSubscriberId: d.manychatSubscriberId,
        messagesSentCount: d.messagesSentCount,
        concept: d.concept,
      })),
      count: eligible.length,
    }
  } catch (error) {
    console.error('Error getting eligible drivers for reminder:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      drivers: [] as Array<{
        id: string
        firstName: string | null
        lastName: string | null
        fullName: string | null
        phoneNumber: string
        accessToken: string | null
        manychatSubscriberId: string | null
        messagesSentCount: number
        concept: MessageConceptResult
      }>,
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

    console.log('[DAILY REMINDERS] Execution completed:', {
      timestamp,
      driversProcessed: data.driversProcessed,
      successCount: data.successCount,
      failureCount: data.failureCount,
      executionTimeMs: data.executionTimeMs,
      errorCount: data.errors?.length || 0,
    })

    if (data.errors && data.errors.length > 0) {
      console.error('[DAILY REMINDERS] Errors during execution:', data.errors)
    }

    return { success: true }
  } catch (error) {
    console.error('[DAILY REMINDERS] Error logging execution:', error)
    return { success: false }
  }
}
