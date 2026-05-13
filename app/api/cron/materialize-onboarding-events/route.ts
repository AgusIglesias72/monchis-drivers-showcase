// app/api/cron/materialize-onboarding-events/route.ts
//
// Cron diario que pre-genera OnboardingEvent rows para las próximas N semanas
// a partir de las OnboardingScheduleRule activas. Idempotente: no duplica
// eventos ya creados (lookup por scheduleRuleId + scheduledDate).
//
// Schedule sugerido: "0 5 * * *" (diario 05:00 UTC, ~01:00 PY).

import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/auth'
import { materializeAllActiveRules } from '@/lib/services/onboarding-materialization.service'

export const maxDuration = 300

const DEFAULT_WEEKS_AHEAD = 8

export async function GET(request: NextRequest) {
  const cronError = requireCronAuth(request)
  if (cronError) return cronError

  const { searchParams } = new URL(request.url)
  const weeksAheadParam = searchParams.get('weeksAhead')
  let weeksAhead = DEFAULT_WEEKS_AHEAD
  if (weeksAheadParam) {
    const parsed = parseInt(weeksAheadParam, 10)
    if (Number.isInteger(parsed) && parsed > 0 && parsed <= 26) {
      weeksAhead = parsed
    }
  }

  console.log(`[cron:materialize-onboarding-events] weeksAhead=${weeksAhead}`)
  try {
    const result = await materializeAllActiveRules(weeksAhead)
    console.log('[cron:materialize-onboarding-events] resumen', {
      totalCreated: result.totalCreated,
      totalSkipped: result.totalSkipped,
      rules: result.perRule.length,
    })
    return NextResponse.json({ success: true, weeksAhead, ...result })
  } catch (err: any) {
    console.error('[cron:materialize-onboarding-events] error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Error desconocido' },
      { status: 500 },
    )
  }
}
