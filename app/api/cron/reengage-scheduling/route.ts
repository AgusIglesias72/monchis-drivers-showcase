// app/api/cron/reengage-scheduling/route.ts
//
// Cron de reenganche al agendamiento. Cada 30 min en horario laboral, empuja a
// dos segmentos (alineados con los filtros rápidos del admin) a agendar su
// capacitación:
//   - "Pendiente de Agendar" → template `capacitaciones`
//   - "No Asistieron"        → template `capacitacion_no_show`
//
// Respeta el backoff exponencial compartido (recordMessageSent) para no spamear
// al mismo postulante, y limita el volumen por corrida (riesgo de ban del bot
// whatsapp-web.js). Convive con:
//   - send-daily-reminders (docs/pago pendiente, ya NO agenda)
//   - send-session-reminders (recordatorio pre-sesión de los que YA reservaron)

import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/auth'
import { WhatsAppMessageSource, WhatsAppMessageType } from '@prisma/client'
import {
  getPendingScheduleDrivers,
  getNoShowReengageDrivers,
  type ReengagementDriver,
} from '@/lib/services/reengagement.service'
import { recordMessageSent } from '@/lib/services/messaging-frequency.service'
import { sendTemplateByKey } from '@/lib/services/whatsapp-messenger.service'
import { whatsappBotService } from '@/lib/services/whatsapp-bot.service'

// 2 segmentos × 5 × ~8s de pausa + latencia del bot ≈ 100s peor caso.
export const maxDuration = 150

interface SegmentResult {
  segment: string
  sent: number
  failed: number
  skipped: number
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  const cronError = requireCronAuth(request)
  if (cronError) return cronError

  try {
    // Circuit breaker: si la sesión de WhatsApp no está conectada, no tiene
    // sentido iterar — abortamos sin enviar ni aplicar backoff. Evita quemar el
    // backlog contra un bot mudo (marcar "enviado" lo que no se entrega).
    const status = await whatsappBotService.getStatus()
    if (!status.connected) {
      console.warn('[REENGAGE] abortado: bot desconectado', { status: status.status })
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: 'whatsapp bot desconectado',
        botStatus: status.status,
      })
    }

    const PENDING_LIMIT = Math.max(0, parseInt(process.env.REENGAGE_PENDING_LIMIT || '5', 10))
    const NOSHOW_LIMIT = Math.max(0, parseInt(process.env.REENGAGE_NOSHOW_LIMIT || '5', 10))
    const DELAY_MS = Math.max(0, parseInt(process.env.REENGAGE_DELAY_MS || '8000', 10))

    const [pending, noShow] = await Promise.all([
      PENDING_LIMIT > 0 ? getPendingScheduleDrivers(PENDING_LIMIT) : Promise.resolve([]),
      NOSHOW_LIMIT > 0 ? getNoShowReengageDrivers(NOSHOW_LIMIT) : Promise.resolve([]),
    ])

    // Procesamos en una sola cola para respetar la pausa entre TODOS los envíos.
    const queue: Array<{ driver: ReengagementDriver; templateKey: string; messageType: WhatsAppMessageType; step: string; segment: string }> = [
      ...pending.map((driver) => ({
        driver,
        templateKey: 'capacitaciones',
        messageType: WhatsAppMessageType.CAPACITATION_REMINDER,
        step: 'reengage_pendiente_agendar',
        segment: 'pending-schedule',
      })),
      ...noShow.map((driver) => ({
        driver,
        templateKey: 'capacitacion_no_show',
        messageType: WhatsAppMessageType.CAPACITATION_NO_SHOW,
        step: 'reengage_no_asistieron',
        segment: 'scheduled-no-show',
      })),
    ]

    const results: Record<string, SegmentResult> = {
      'pending-schedule': { segment: 'pending-schedule', sent: 0, failed: 0, skipped: 0 },
      'scheduled-no-show': { segment: 'scheduled-no-show', sent: 0, failed: 0, skipped: 0 },
    }

    for (let i = 0; i < queue.length; i++) {
      const { driver, templateKey, messageType, step, segment } = queue[i]
      try {
        const result = await sendTemplateByKey(driver, templateKey, {
          source: WhatsAppMessageSource.CRON,
          messageType,
          step,
        })
        if (result.status === 'sent') {
          await recordMessageSent(driver.id)
          results[segment].sent++
        } else if (result.status === 'skipped') {
          results[segment].skipped++
        } else {
          results[segment].failed++
        }
      } catch (err) {
        results[segment].failed++
        console.error('[REENGAGE] error enviando', {
          driverId: driver.id,
          segment,
          error: err instanceof Error ? err.message : err,
        })
      }

      if (DELAY_MS > 0 && i < queue.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
      }
    }

    const executionTimeMs = Date.now() - startTime
    console.log(
      `[REENGAGE] Done in ${executionTimeMs}ms — pendiente: ${results['pending-schedule'].sent} enviados, no-show: ${results['scheduled-no-show'].sent} enviados`,
    )

    return NextResponse.json({
      success: true,
      stats: { ...results, executionTimeMs },
    })
  } catch (error) {
    console.error('[REENGAGE] Fatal:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
