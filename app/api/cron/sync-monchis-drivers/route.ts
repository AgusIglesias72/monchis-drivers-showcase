// app/api/cron/sync-monchis-drivers/route.ts
//
// Cron diario que sincroniza la lista completa de drivers de Monchis a
// nuestra tabla MonchisDriverCache (ver lib/services/monchis-drivers-sync.service.ts).

import { NextRequest, NextResponse } from "next/server"

import { syncMonchisDrivers } from "@/lib/services/monchis-drivers-sync.service"

export const maxDuration = 300 // hasta 5 min — el endpoint devuelve ~4k drivers

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("❌ [CRON] Unauthorized request to sync-monchis-drivers")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("🔄 [CRON] Starting Monchis drivers sync...")
  const result = await syncMonchisDrivers()

  if (!result.ok) {
    console.error("❌ [CRON] Drivers sync failed:", result.error)
    return NextResponse.json(
      {
        success: false,
        ...result,
      },
      { status: 500 },
    )
  }

  console.log(
    `✅ [CRON] Drivers synced: ${result.upserted}/${result.fetched} en ${result.durationMs}ms`,
  )
  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  })
}
