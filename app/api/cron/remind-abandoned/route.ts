// app/api/cron/remind-abandoned/route.ts
//
// Cron cada 20 min en horario laboral (PYT 9:00–16:40 = 12-19 UTC; Paraguay es
// UTC-3 fijo, sin DST): recordatorio a postulaciones con el formulario a medias
// (status IN_PROGRESS) que llevan al menos 24h sin movimiento. Manda el template
// `form_incomplete` y aplica el backoff exponencial compartido (recordMessageSent)
// para no atormentar. Convive con send-daily-reminders, que solo sigue a los que
// YA completaron el form (docs / pago / capacitación).

import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/auth'
import { WhatsAppMessageSource, WhatsAppMessageType } from '@prisma/client'
import {
  getAbandonedFormDrivers,
  recordMessageSent,
} from '@/lib/services/messaging-frequency.service'
import { sendTemplateByKey } from '@/lib/services/whatsapp-messenger.service'

// 5 mensajes × 10s de pausa + envíos del bot ≈ 90s peor caso. 120s da margen.
export const maxDuration = 120

const TEMPLATE_KEY = 'form_incomplete'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const cronError = requireCronAuth(request)
    if (cronError) return cronError

    // Tope por corrida: bajo a propósito (bot whatsapp-web.js, riesgo de ban).
    const LIMIT = Math.max(1, parseInt(process.env.ABANDONED_REMINDER_LIMIT || '5', 10))
    // Horas de inactividad para considerar "abandonada".
    const STALE_HOURS = Math.max(1, parseInt(process.env.ABANDONED_STALE_HOURS || '24', 10))
    // Tope de antigüedad: no perseguir abandonos más viejos que esto (evita
    // escribir a postulaciones de hace meses y dispara de volumen / ban).
    const MAX_AGE_DAYS = Math.max(1, parseInt(process.env.ABANDONED_MAX_AGE_DAYS || '30', 10))
    // Pausa entre mensajes (anti rate-limit / anti ban).
    const DELAY_MS = Math.max(0, parseInt(process.env.ABANDONED_REMINDER_DELAY_MS || '10000', 10))

    const drivers = await getAbandonedFormDrivers(LIMIT, STALE_HOURS, MAX_AGE_DAYS)
    console.log(`[REMIND ABANDONED] ${drivers.length} postulaciones abandonadas a contactar`)

    let sent = 0
    let failed = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < drivers.length; i++) {
      const driver = drivers[i]
      const name = driver.fullName || driver.firstName || 'Postulante'

      try {
        const result = await sendTemplateByKey(driver, TEMPLATE_KEY, {
          source: WhatsAppMessageSource.CRON,
          messageType: WhatsAppMessageType.FORM_INCOMPLETE,
          step: 'abandoned_form',
        })

        if (result.status === 'sent') {
          // Bumpea messagesSentCount + setea noContactBefore (backoff).
          const record = await recordMessageSent(driver.id)
          sent++
          console.log(
            `  [${i + 1}/${drivers.length}] ${name} enviado. Próximo contacto en ${record.backoffDays}d`,
          )
        } else if (result.status === 'skipped') {
          skipped++
          console.log(`  [${i + 1}/${drivers.length}] ${name} skip: ${result.reason}`)
        } else {
          failed++
          const msg = `${name} (${driver.id}): ${result.error ?? result.reason}`
          errors.push(msg)
          console.error(`  [${i + 1}/${drivers.length}] ${msg}`)
        }
      } catch (error) {
        failed++
        const msg = `${name} (${driver.id}): ${error instanceof Error ? error.message : 'error'}`
        errors.push(msg)
        console.error(`  [${i + 1}/${drivers.length}] ${msg}`)
      }

      // Pausa entre envíos (no después del último).
      if (DELAY_MS > 0 && i < drivers.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
      }
    }

    const executionTimeMs = Date.now() - startTime
    console.log(
      `[REMIND ABANDONED] Done: ${sent} enviados, ${failed} fallidos, ${skipped} skip (${executionTimeMs}ms)`,
    )

    return NextResponse.json({
      success: true,
      stats: { processed: drivers.length, sent, failed, skipped, executionTimeMs },
      ...(errors.length > 0 ? { errors } : {}),
    })
  } catch (error) {
    console.error('[REMIND ABANDONED] Fatal:', error)
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
