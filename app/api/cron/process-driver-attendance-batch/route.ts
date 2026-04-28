// app/api/cron/process-driver-attendance-batch/route.ts
//
// Cron horario: rota por los drivers ordenados por antigüedad de su último
// snapshot (NULLS FIRST). Cada ejecución procesa N drivers y refresca su
// snapshot 30d (que es lo que muestra el listado).
//
// Lote default = 10 drivers, ~30s por driver con paralelo de 5 días =>
// cabe holgado en maxDuration=300s. Con 10 corridas/día (cada hora) cubre
// ~240 drivers/día. Pasa los 4049 drivers en ~17 días.
//
// Override: ?limit=N en la URL (1..40).

import { NextRequest, NextResponse } from "next/server"

import { processDriverAttendanceBatch } from "@/lib/services/monchis-driver-attendance.service"

export const maxDuration = 300

// 15 drivers × ~18s c/u = ~270s, cabe en maxDuration=300.
const DEFAULT_LIMIT = 15
const MAX_LIMIT = 40

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("❌ [CRON] Unauthorized request to process-driver-attendance-batch")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const rawLimit = Number(url.searchParams.get("limit")) || DEFAULT_LIMIT
  const limit = Math.max(1, Math.min(rawLimit, MAX_LIMIT))

  console.log(`🔄 [CRON] Driver attendance batch — limit=${limit}`)
  const result = await processDriverAttendanceBatch(limit)

  if (!result.ok) {
    console.error(
      `⚠️  [CRON] Batch terminó con ${result.errors.length} errores`,
      result.errors.slice(0, 3),
    )
  }

  console.log(
    `✅ [CRON] ${result.processedDrivers}/${result.totalDriversConsidered} drivers en ${result.durationMs}ms`,
  )

  return NextResponse.json({
    success: result.ok,
    ...result,
    timestamp: new Date().toISOString(),
  })
}
