// app/api/cron/process-pedidos-import-queue/route.ts
//
// Cron cada 5 min: drena la cola MonchisOrderImportQueue de a lotes de 200,
// llamando request_histories y poblando MonchisOrderCache.
//
// 200/lote × 12 corridas/h × 24h = ~57.6k pedidos/día → 132k tarda ~2.3 días.
// Override de tamaño: ?limit=N (1..400).

import { NextRequest, NextResponse } from "next/server"

import { processOrderImportQueueBatch } from "@/lib/services/pedidos-import-queue.service"

export const maxDuration = 300

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 400

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("❌ [CRON] Unauthorized request to process-pedidos-import-queue")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const rawLimit = Number(url.searchParams.get("limit")) || DEFAULT_LIMIT
  const limit = Math.max(1, Math.min(rawLimit, MAX_LIMIT))

  console.log(`🔄 [CRON] Pedidos import queue — limit=${limit}`)
  const result = await processOrderImportQueueBatch(limit)

  console.log(
    `✅ [CRON] picked=${result.picked} done=${result.done} not_found=${result.notFound} failed=${result.failed} (${result.durationMs}ms)`,
  )

  return NextResponse.json({
    success: result.ok,
    ...result,
    timestamp: new Date().toISOString(),
  })
}
