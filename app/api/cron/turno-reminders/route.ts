// app/api/cron/turno-reminders/route.ts
//
// Cron del recordatorio pre-turno (Intercom). Corre cada 15 min y manda un
// mensaje 1-1 a cada driver con un turno reservado que arranca en 15-30 min,
// asignado a Abel Cardozo. Idempotente vía TurnoReminderSent.unique(shiftId,
// driverId). Soporta ?dryRun=true para previsualizar candidatos sin enviar.

import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/auth'
import { sendTurnoReminders } from '@/lib/services/turno-reminders.service'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  const cronError = requireCronAuth(request)
  if (cronError) return cronError

  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true'

  try {
    const stats = await sendTurnoReminders({ dryRun })
    const executionTimeMs = Date.now() - startTime

    console.log(
      `[TURNO REMINDERS] shiftsDue=${stats.shiftsDue} candidates=${stats.candidates} sent=${stats.sent} failed=${stats.failed} skippedNoContact=${stats.skippedNoContact} skippedAlready=${stats.skippedAlready} skippedCapped=${stats.skippedCapped} (${executionTimeMs}ms)${dryRun ? ' [dryRun]' : ''}`,
    )

    return NextResponse.json({ success: true, dryRun, stats, executionTimeMs })
  } catch (error) {
    console.error('[TURNO REMINDERS] Fatal error:', error)
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
