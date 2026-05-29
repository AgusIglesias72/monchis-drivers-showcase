import "server-only"

import { LIVE_CAPTURE_CONFIG } from "@/lib/config/live-capture.config"
import { prisma } from "@/lib/prisma"
import { getOrderImportQueueStats } from "@/lib/services/pedidos-import-queue.service"
import { IN_PROGRESS_STATES } from "@/lib/services/pedidos.service"
import type { QueueStats } from "@/lib/types/pedidos-queue.types"

export interface CaptureHealth {
  lastRunAt: string | null
  captureLagMs: number | null // now - lastRunAt
  isStale: boolean // lag por encima del umbral de alerta
  staleThresholdMs: number
  lastErrors: { source: string; message: string }[]
  // Cobertura de la última corrida: distinct IDs vistos vs referencia de zonas.
  lastIdsSeen: number
  lastZonesTotalRequest: number
  // Operación actual
  inProgressCount: number
  // Cola de importación
  queue: QueueStats
}

export async function getCaptureHealth(): Promise<CaptureHealth> {
  const [lastRun, inProgressCount, queue] = await Promise.all([
    prisma.liveCaptureRun.findFirst({ orderBy: { fetchedAt: "desc" } }),
    prisma.monchisOrderCache.count({
      where: {
        status: { in: IN_PROGRESS_STATES },
        confirmedAt: { not: null },
      },
    }),
    getOrderImportQueueStats(),
  ])

  const lastRunAt = lastRun?.fetchedAt ?? null
  const captureLagMs = lastRunAt ? Date.now() - lastRunAt.getTime() : null

  return {
    lastRunAt: lastRunAt?.toISOString() ?? null,
    captureLagMs,
    isStale:
      captureLagMs === null ||
      captureLagMs > LIVE_CAPTURE_CONFIG.captureLagAlertMs,
    staleThresholdMs: LIVE_CAPTURE_CONFIG.captureLagAlertMs,
    lastErrors: parseErrors(lastRun?.errors),
    lastIdsSeen: lastRun?.idsSeen ?? 0,
    lastZonesTotalRequest: lastRun?.zonesTotalRequest ?? 0,
    inProgressCount,
    queue,
  }
}

function parseErrors(raw: unknown): { source: string; message: string }[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (e): e is { source: string; message: string } =>
      !!e && typeof e === "object" && "source" in e && "message" in e,
  )
}
