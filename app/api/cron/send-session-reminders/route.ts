// app/api/cron/send-session-reminders/route.ts
//
// Cron del recordatorio pre-sesión de capacitación (anti no-show). Corre cada
// hora y manda 'capacitacion_reminder' a los attendees activos cuya sesión entra
// en la ventana scheduledDate − reminderHoursBefore. Es transaccional: ignora el
// backoff de marketing y es idempotente vía OnboardingAttendee.reminderSent.
//
// Separado de send-daily-reminders a propósito: ese cron persigue el funnel por
// concepto/backoff (marketing); este es un recordatorio anclado a la fecha real
// del evento.

import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/auth'
import { sendSessionReminders } from '@/lib/services/session-reminders.service'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  const cronError = requireCronAuth(request)
  if (cronError) return cronError

  try {
    const limit = Math.max(1, parseInt(process.env.SESSION_REMINDER_LIMIT || '40', 10))
    const stats = await sendSessionReminders(limit)

    const executionTimeMs = Date.now() - startTime
    console.log(
      `[SESSION REMINDERS] Done: ${stats.sent} sent, ${stats.failed} failed, ${stats.skipped} skipped of ${stats.candidates} due (${executionTimeMs}ms)`,
    )

    return NextResponse.json({ success: true, stats, executionTimeMs })
  } catch (error) {
    console.error('[SESSION REMINDERS] Fatal error:', error)
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
