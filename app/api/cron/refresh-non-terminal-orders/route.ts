// app/api/cron/refresh-non-terminal-orders/route.ts
//
// Cron cada 5 min (offset @ minuto 4,9,14,...): busca todos los pedidos en
// MonchisOrderCache que NO estén en estado terminal (FINALIZED/CANCELLED)
// y los re-encola para que el processor-pedidos-import-queue los vuelva a
// consultar contra la API externa.
//
// Estrategia "re-encolar" en vez de "llamar API directo":
// - reusa rate limit, batch y manejo de errores del processor existente
// - el cron es ultra liviano (solo dos queries a la DB)
// - offset de 1 min asegura que el processor a `*/5` agarre lo recién reseteado

import { NextRequest, NextResponse } from "next/server"

import { enqueueNonTerminalOrdersForRefresh } from "@/lib/services/pedidos-import-queue.service"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error(
      "❌ [CRON] Unauthorized request to refresh-non-terminal-orders",
    )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("🔄 [CRON] Refresh non-terminal orders — re-enqueue start")
  const result = await enqueueNonTerminalOrdersForRefresh()

  console.log(
    `✅ [CRON] scanned=${result.scanned} reset=${result.reset} inserted=${result.inserted} (${result.durationMs}ms)`,
  )

  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  })
}
