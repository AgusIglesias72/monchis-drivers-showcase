// app/api/cron/collect-live-orders/route.ts
//
// Cron cada minuto (`* * * * *`): captura autónoma de órdenes. Consulta los
// endpoints live de api.monchis-drivers.com SERVER-SIDE (sin depender de que
// alguien tenga el panel /admin/gestion/live abierto), encola los requestIds
// nuevos en MonchisOrderImportQueue y deja un snapshot en LiveCaptureRun.
//
// Es la fuente de verdad de la captura. El enqueue del panel queda como
// redundancia idempotente (skipDuplicates) cuando alguien lo mira.

import { NextRequest, NextResponse } from "next/server"

import { requireCronAuth } from "@/lib/auth"
import { LIVE_CAPTURE_CONFIG } from "@/lib/config/live-capture.config"
import { prisma } from "@/lib/prisma"
import { captureLiveOrders } from "@/lib/services/live-panel.service"
import { sendSlackMessage } from "@/lib/services/slack.service"

export const maxDuration = 30

export async function GET(request: NextRequest) {
  const cronError = requireCronAuth(request)
  if (cronError) {
    console.error("❌ [CRON collect-live-orders] Unauthorized")
    return cronError
  }

  // Alerta de transición: ¿la corrida anterior ya estaba 100% caída? Si no lo
  // estaba y ésta sí, mandamos un único aviso a Slack (evita spam por minuto).
  const prev = await prisma.liveCaptureRun.findFirst({
    orderBy: { fetchedAt: "desc" },
    select: { errors: true },
  })
  const prevAllFailed = Array.isArray(prev?.errors) && prev!.errors.length >= 4

  const result = await captureLiveOrders()

  console.log(
    `✅ [CRON collect-live-orders] seen=${result.idsSeen} new=${result.idsNewEnqueued} ` +
      `pending=${result.pendingCount} delayed=${result.delayedCount} active=${result.activeCount} ` +
      `errors=${result.errors.length} (${result.durationMs}ms)`,
  )

  if (result.allEndpointsFailed && !prevAllFailed) {
    await sendSlackMessage(
      `🚨 *Captura de órdenes caída*: las 4 rutas de api.monchis-drivers.com fallaron. ` +
        `Posible token vencido o API caída. Errores: ` +
        result.errors.map((e) => `${e.source}=${e.message}`).join(", "),
    ).catch((err) =>
      console.error("[collect-live-orders] slack error:", err),
    )
  }

  // Poda horaria (al minuto 0) para no acumular snapshots indefinidamente.
  let pruned = 0
  if (new Date().getUTCMinutes() === 0) {
    const cutoff = new Date(
      Date.now() - LIVE_CAPTURE_CONFIG.retentionDays * 24 * 60 * 60 * 1000,
    )
    const del = await prisma.liveCaptureRun.deleteMany({
      where: { fetchedAt: { lt: cutoff } },
    })
    pruned = del.count
  }

  return NextResponse.json({
    success: !result.allEndpointsFailed,
    ...result,
    pruned,
    timestamp: new Date().toISOString(),
  })
}
