// app/api/cron/send-daily-reminders/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppMessageSource, WhatsAppMessageType } from '@prisma/client'
import { getEligibleDriversForReminder, logReminderExecution } from '@/lib/services/automatic-reminders.service'
import { recordMessageSent, type MessageConcept } from '@/lib/services/messaging-frequency.service'
import { sendOnboardingReminderMessageInternal } from '@/lib/actions/send-onboarding-list.actions'
import { sendFlowByKey } from '@/lib/services/manychat-messaging.service'

/**
 * Cron job para enviar recordatorios automáticos con control de frecuencia.
 *
 * Flujo:
 * 1. Obtiene drivers elegibles (noContactBefore ya pasó + no en estado terminal)
 * 2. Evalúa el concepto de mensaje según el estado de cada driver
 * 3. Envía el mensaje apropiado
 * 4. Registra el envío y calcula el próximo noContactBefore (backoff exponencial)
 *
 * Backoff: 1, 3, 7, 30, 60, 90 días entre mensajes
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verificar autorización
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[DAILY REMINDERS] Starting with frequency control...')

    const DAILY_LIMIT = 20
    const eligibleResult = await getEligibleDriversForReminder(DAILY_LIMIT)

    if (!eligibleResult.success) {
      console.error('[DAILY REMINDERS] Error getting eligible drivers:', eligibleResult.error)
      return NextResponse.json(
        { error: 'Error getting eligible drivers', details: eligibleResult.error },
        { status: 500 }
      )
    }

    const { drivers } = eligibleResult

    console.log(`[DAILY REMINDERS] Found ${drivers.length} eligible drivers`)

    if (drivers.length === 0) {
      const executionTimeMs = Date.now() - startTime
      await logReminderExecution({
        driversProcessed: 0,
        successCount: 0,
        failureCount: 0,
        executionTimeMs,
      })

      return NextResponse.json({
        success: true,
        message: 'No eligible drivers found',
        stats: { processed: 0, sent: 0, failed: 0, skipped: 0, executionTimeMs },
      })
    }

    let successCount = 0
    let failureCount = 0
    let skippedCount = 0
    const errors: string[] = []

    const details: Array<{
      driverId: string
      name: string
      phone: string
      concept: string
      messagesSentCount: number
      backoffDays?: number
      status: 'sent' | 'failed' | 'skipped'
      error?: string
    }> = []

    for (let i = 0; i < drivers.length; i++) {
      const driver = drivers[i]
      const driverName = driver.fullName || driver.firstName || 'Conductor'
      const concept = driver.concept.concept

      try {
        console.log(
          `  [${i + 1}/${drivers.length}] ${driverName} (${driver.id}) - Concept: ${concept} - Messages: ${driver.messagesSentCount}`
        )

        // Enviar mensaje según el concepto
        const sendResult = await sendMessageByConcept(concept, driver)

        if (!sendResult.sent) {
          // Concepto no tiene mensaje implementado, skip
          skippedCount++
          details.push({
            driverId: driver.id,
            name: driverName,
            phone: driver.phoneNumber,
            concept,
            messagesSentCount: driver.messagesSentCount,
            status: 'skipped',
            error: sendResult.reason,
          })
          continue
        }

        if (sendResult.success) {
          // Registrar envío y actualizar backoff
          const record = await recordMessageSent(driver.id)

          successCount++
          console.log(
            `  Sent. Next contact in ${record.backoffDays} days (${record.noContactBefore.toISOString()})`
          )

          details.push({
            driverId: driver.id,
            name: driverName,
            phone: driver.phoneNumber,
            concept,
            messagesSentCount: record.messagesSentCount,
            backoffDays: record.backoffDays,
            status: 'sent',
          })
        } else {
          failureCount++
          const errorMsg = `Driver ${driver.id} (${driverName}): ${sendResult.error}`
          errors.push(errorMsg)
          details.push({
            driverId: driver.id,
            name: driverName,
            phone: driver.phoneNumber,
            concept,
            messagesSentCount: driver.messagesSentCount,
            status: 'failed',
            error: sendResult.error,
          })
        }

        // Pausa entre mensajes para evitar rate limiting
        if (i < drivers.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 5000))
        }
      } catch (error) {
        failureCount++
        const errorMsg = `Driver ${driver.id} (${driverName}): ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        details.push({
          driverId: driver.id,
          name: driverName,
          phone: driver.phoneNumber,
          concept,
          messagesSentCount: driver.messagesSentCount,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const executionTimeMs = Date.now() - startTime

    await logReminderExecution({
      driversProcessed: drivers.length,
      successCount,
      failureCount,
      executionTimeMs,
      errors: errors.length > 0 ? errors : undefined,
    })

    console.log(
      `[DAILY REMINDERS] Done: ${successCount} sent, ${failureCount} failed, ${skippedCount} skipped (${executionTimeMs}ms)`
    )

    return NextResponse.json({
      success: true,
      message: `Processed ${drivers.length} drivers: ${successCount} sent, ${failureCount} failed, ${skippedCount} skipped`,
      stats: {
        processed: drivers.length,
        sent: successCount,
        failed: failureCount,
        skipped: skippedCount,
        executionTimeMs,
      },
      details,
    })
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    console.error('[DAILY REMINDERS] Fatal error:', error)

    await logReminderExecution({
      driversProcessed: 0,
      successCount: 0,
      failureCount: 0,
      executionTimeMs,
      errors: [error instanceof Error ? error.message : 'Unknown fatal error'],
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ==================== MESSAGE SENDING BY CONCEPT ====================

interface SendByConceptResult {
  sent: boolean // true si se intentó enviar, false si se skipeó
  success?: boolean
  error?: string
  reason?: string // razón del skip
}

interface DriverForMessaging {
  id: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  phoneNumber: string
  manychatSubscriberId: string | null
}

/**
 * Mapeo concept → key de WhatsAppTemplate en DB. null = el concepto NO se envía por ManyChat
 * (típicamente porque lo maneja el multi-bot homegrown para otros números).
 * Para activar un concept, crear el template con ese key en la UI/DB y cablear manychatFlowId.
 */
const CONCEPT_TO_TEMPLATE_KEY: Record<MessageConcept, string | null> = {
  FORM_STEP_1: 'form_step_1',
  FORM_STEP_2: 'form_step_2',
  FORM_STEP_3: 'form_step_3',
  FORM_STEP_4: 'form_step_4',
  FORM_INCOMPLETE: 'form_incomplete',
  DOCUMENTS_PENDING: 'documents_pending',
  DOCUMENTS_CORRECTIONS: 'documents_corrections',
  PAYMENT_PENDING: 'payment_pending',
  GENERAL_FOLLOWUP: 'general_followup',
  // Capacitación sigue en el multi-bot (número existente).
  SCHEDULE_CAPACITACION: null,
  CAPACITACION_REMINDER: null,
}

/**
 * Mapeo concept → WhatsAppMessageType (enum existente) para auditoría en WhatsAppMessage.
 */
const CONCEPT_TO_MESSAGE_TYPE: Record<MessageConcept, WhatsAppMessageType> = {
  FORM_STEP_1: WhatsAppMessageType.FORM_INCOMPLETE,
  FORM_STEP_2: WhatsAppMessageType.FORM_INCOMPLETE,
  FORM_STEP_3: WhatsAppMessageType.FORM_INCOMPLETE,
  FORM_STEP_4: WhatsAppMessageType.FORM_INCOMPLETE,
  FORM_INCOMPLETE: WhatsAppMessageType.FORM_INCOMPLETE,
  DOCUMENTS_PENDING: WhatsAppMessageType.CUSTOM,
  DOCUMENTS_CORRECTIONS: WhatsAppMessageType.DOCUMENT_REJECTED,
  PAYMENT_PENDING: WhatsAppMessageType.CUSTOM,
  GENERAL_FOLLOWUP: WhatsAppMessageType.CUSTOM,
  SCHEDULE_CAPACITACION: WhatsAppMessageType.CAPACITATION_REMINDER,
  CAPACITACION_REMINDER: WhatsAppMessageType.CAPACITATION_REMINDER,
}

/**
 * Envía el mensaje apropiado según el concepto.
 * - Capacitación (SCHEDULE_CAPACITACION / CAPACITACION_REMINDER) → multi-bot homegrown existente
 * - Resto (form abandonado, documentos, pago, followup) → ManyChat vía template resuelto por key
 */
async function sendMessageByConcept(
  concept: MessageConcept,
  driver: DriverForMessaging
): Promise<SendByConceptResult> {
  const driverName = driver.firstName || driver.fullName || 'Conductor'

  // Capacitación mantiene el canal existente (multi-bot).
  if (concept === 'SCHEDULE_CAPACITACION' || concept === 'CAPACITACION_REMINDER') {
    const result = await sendOnboardingReminderMessageInternal({
      driverId: driver.id,
      driverName,
      phoneNumber: driver.phoneNumber,
    })
    return {
      sent: true,
      success: result.success,
      error: result.success ? undefined : result.error,
    }
  }

  const templateKey = CONCEPT_TO_TEMPLATE_KEY[concept]
  if (!templateKey) {
    return { sent: false, reason: `Concepto sin template key: ${concept}` }
  }

  const result = await sendFlowByKey(driver, templateKey, {
    source: WhatsAppMessageSource.CRON,
    messageType: CONCEPT_TO_MESSAGE_TYPE[concept],
    step: concept.toLowerCase(),
  })

  if (result.status === 'sent') {
    return { sent: true, success: true }
  }
  if (result.status === 'skipped') {
    return { sent: false, reason: result.reason ?? 'skipped' }
  }
  return {
    sent: true,
    success: false,
    error: result.error ?? result.reason ?? 'manychat failed',
  }
}
