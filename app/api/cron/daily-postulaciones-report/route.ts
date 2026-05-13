// app/api/cron/daily-postulaciones-report/route.ts
//
// Cron diario que corre a las 00hs Paraguay (03:00 UTC).
// Calcula métricas del día que acaba de cerrar y envía el reporte al equipo admin.
//
// Configurado en vercel.json como: "0 3 * * *"
// Se puede invocar manualmente con:
//   GET /api/cron/daily-postulaciones-report?date=2026-04-22
//   (sin ?date, reporta sobre el día anterior a la ejecución)

import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/auth'
import { dailyReportService } from '@/lib/services/daily-report.service'
import { emailService } from '@/lib/services/email.service'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const cronError = requireCronAuth(request)
    if (cronError) return cronError

    // Permitir override de fecha con ?date=YYYY-MM-DD (útil para backfill/testing)
    const dateParam = request.nextUrl.searchParams.get('date')
    const reportDate = dateParam ? new Date(dateParam + 'T12:00:00') : undefined

    console.log('[DAILY REPORT] Calculando métricas...')
    const data = await dailyReportService.getDailyReportData(reportDate)

    console.log(`[DAILY REPORT] Período: ${data.periodStart.toISOString()} → ${data.periodEnd.toISOString()}`)
    console.log(`[DAILY REPORT] Nuevas: ${data.newPostulaciones}, Aprobadas: ${data.approvedToday}, Ready: ${data.readyForOnboarding}`)

    const result = await emailService.sendDailyPostulacionesReport({ data })

    if (result.error) {
      return NextResponse.json(
        { ok: false, error: result.error, stats: data },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      emailId: result.id,
      reportDate: data.reportDate.toISOString(),
      stats: {
        newPostulaciones: data.newPostulaciones,
        completedToday: data.completedToday,
        approvedToday: data.approvedToday,
        readyForOnboarding: data.readyForOnboarding,
        monthNewPostulaciones: data.monthNewPostulaciones,
        monthApproved: data.monthApproved,
        monthActive: data.monthActive,
      },
      durationMs: Date.now() - startTime,
    })
  } catch (err: any) {
    console.error('[DAILY REPORT] Error:', err)
    return NextResponse.json(
      { ok: false, error: err.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
