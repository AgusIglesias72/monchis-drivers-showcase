// app/api/cron/refresh-recent-orders/route.ts
//
// Cron cada 2 min (offset `1-59/2 * * * *`): lane RÁPIDO de refresh. Refresca
// directo (forceRefresh) los pedidos no-terminales recientes (< 2h) para que
// su estado en /admin/gestion/pedidos y /admin/gestion/ordenes esté fresco,
// cerrando la "zona muerta" del barrido lento (refresh-non-terminal-orders, >2h).
//
// También reintenta IDs not_found recientes (carrera live ↔ request_histories).

import { NextRequest, NextResponse } from "next/server"

import { requireCronAuth } from "@/lib/auth"
import { refreshRecentNonTerminalOrders } from "@/lib/services/pedidos-import-queue.service"

export const maxDuration = 120

export async function GET(request: NextRequest) {
  const cronError = requireCronAuth(request)
  if (cronError) {
    console.error("❌ [CRON refresh-recent-orders] Unauthorized")
    return cronError
  }

  console.log("⚡ [CRON refresh-recent-orders] start")
  const result = await refreshRecentNonTerminalOrders()

  if (result.dropped > 0) {
    console.warn(
      `⚠️ [CRON refresh-recent-orders] ${result.dropped} pedidos recientes ` +
        `quedaron fuera del tope este ciclo (se tomarán en el próximo).`,
    )
  }

  console.log(
    `✅ [CRON refresh-recent-orders] scanned=${result.scanned} refreshed=${result.refreshed} ` +
      `terminalNow=${result.terminalNow} failed=${result.failed} dropped=${result.dropped} ` +
      `notFoundRetried=${result.notFoundRetried} (${result.durationMs}ms)`,
  )

  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  })
}
