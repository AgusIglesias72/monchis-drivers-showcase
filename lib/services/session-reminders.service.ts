// lib/services/session-reminders.service.ts
//
// Recordatorio pre-sesión de capacitación (anti no-show). Es TRANSACCIONAL: se
// ancla a la fecha de la sesión, no al backoff de marketing del funnel.
//
// A diferencia del cron send-daily-reminders (que contacta según concepto y
// backoff exponencial), acá mandamos el recordatorio "tenés tu capacitación el
// <fecha>" a cada attendee activo cuando se entra en la ventana
// `scheduledDate − reminderHoursBefore`. Idempotente vía
// OnboardingAttendee.reminderSent: cada attendee recibe el recordatorio una sola
// vez.
//
// scheduledDate del evento YA es el instante UTC real (se materializa con
// combineDateAndTimeInTZ(ymd, startTime, tz)), así que la ventana se calcula
// directo sin re-combinar fecha + hora.

import { prisma } from '@/lib/prisma'
import { sendTemplateByKey } from '@/lib/services/whatsapp-messenger.service'
import { WhatsAppMessageSource, WhatsAppMessageType } from '@prisma/client'

const SESSION_REMINDER_TEMPLATE_KEY = 'capacitacion_reminder'

// Cota de la query: casi nunca se configura un recordatorio con más de unos días
// de anticipación. Eventos más lejos que esto se recogen al entrar en la ventana.
const QUERY_WINDOW_HOURS = 24 * 8

// Pausa entre envíos para no saturar el bot whatsapp-web.js (riesgo de ban).
const SEND_PAUSE_MS = 4000

export interface SessionReminderStats {
  candidates: number
  sent: number
  failed: number
  skipped: number
}

export async function sendSessionReminders(limit = 40): Promise<SessionReminderStats> {
  const now = new Date()
  const horizon = new Date(now.getTime() + QUERY_WINDOW_HOURS * 60 * 60 * 1000)

  // Attendees activos, no recordados, de eventos SCHEDULED futuros con
  // recordatorio habilitado y dentro de la ventana de consulta.
  const candidates = await prisma.onboardingAttendee.findMany({
    where: {
      status: { in: ['INVITED', 'CONFIRMED', 'SCHEDULED'] },
      reminderSent: false,
      event: {
        status: 'SCHEDULED',
        reminderScheduled: true,
        scheduledDate: { gt: now, lte: horizon },
      },
    },
    select: {
      id: true,
      event: { select: { id: true, scheduledDate: true, reminderHoursBefore: true } },
      formDriver: {
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          fullName: true,
        },
      },
    },
    orderBy: { event: { scheduledDate: 'asc' } },
    take: limit * 3,
  })

  // Filtrar a los que ya entraron en la ventana scheduledDate − reminderHoursBefore.
  const due = candidates.filter((a) => {
    const thresholdMs =
      a.event.scheduledDate.getTime() - a.event.reminderHoursBefore * 60 * 60 * 1000
    return now.getTime() >= thresholdMs
  })

  const stats: SessionReminderStats = {
    candidates: due.length,
    sent: 0,
    failed: 0,
    skipped: 0,
  }

  const toProcess = due.slice(0, limit)

  for (let i = 0; i < toProcess.length; i++) {
    const attendee = toProcess[i]
    const driver = attendee.formDriver

    if (!driver?.phoneNumber) {
      stats.skipped++
      continue
    }

    try {
      const result = await sendTemplateByKey(driver, SESSION_REMINDER_TEMPLATE_KEY, {
        source: WhatsAppMessageSource.CRON,
        messageType: WhatsAppMessageType.CAPACITATION_REMINDER,
        step: 'recordatorio_pre_sesion',
      })

      if (result.status === 'sent') {
        await prisma.onboardingAttendee.update({
          where: { id: attendee.id },
          data: { reminderSent: true, reminderSentAt: new Date() },
        })
        stats.sent++
      } else if (result.status === 'skipped') {
        // Template inactivo o sin contenido: no marcamos reminderSent para
        // reintentar cuando se arregle. No cuenta como fallo.
        stats.skipped++
      } else {
        stats.failed++
      }
    } catch (err) {
      console.error('[SESSION_REMINDERS] Error enviando recordatorio', {
        attendeeId: attendee.id,
        driverId: driver.id,
        error: err instanceof Error ? err.message : err,
      })
      stats.failed++
    }

    if (i < toProcess.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, SEND_PAUSE_MS))
    }
  }

  return stats
}
