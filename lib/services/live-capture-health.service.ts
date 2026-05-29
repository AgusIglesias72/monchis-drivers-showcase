import "server-only"

import { LIVE_CAPTURE_CONFIG } from "@/lib/config/live-capture.config"
import { prisma } from "@/lib/prisma"
import { getOrderImportQueueStats } from "@/lib/services/pedidos-import-queue.service"
import { IN_PROGRESS_STATES } from "@/lib/services/pedidos.service"
import type { QueueStats } from "@/lib/types/pedidos-queue.types"

export interface CaptureRunPoint {
  fetchedAt: string
  idsSeen: number
  idsNewEnqueued: number
  zonesTotalRequest: number
  errorCount: number
  durationMs: number
}

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
  // Tendencia (últimas N corridas, ascendente por tiempo)
  trend: CaptureRunPoint[]
}

export async function getCaptureHealth(
  trendLimit = 30,
): Promise<CaptureHealth> {
  const [lastRun, recent, inProgressCount, queue] = await Promise.all([
    prisma.liveCaptureRun.findFirst({
      orderBy: { fetchedAt: "desc" },
    }),
    prisma.liveCaptureRun.findMany({
      orderBy: { fetchedAt: "desc" },
      take: trendLimit,
      select: {
        fetchedAt: true,
        idsSeen: true,
        idsNewEnqueued: true,
        zonesTotalRequest: true,
        errors: true,
        durationMs: true,
      },
    }),
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
  const lastErrors = parseErrors(lastRun?.errors)

  return {
    lastRunAt: lastRunAt?.toISOString() ?? null,
    captureLagMs,
    isStale:
      captureLagMs === null || captureLagMs > LIVE_CAPTURE_CONFIG.captureLagAlertMs,
    staleThresholdMs: LIVE_CAPTURE_CONFIG.captureLagAlertMs,
    lastErrors,
    lastIdsSeen: lastRun?.idsSeen ?? 0,
    lastZonesTotalRequest: lastRun?.zonesTotalRequest ?? 0,
    inProgressCount,
    queue,
    trend: recent
      .slice()
      .reverse()
      .map((r) => ({
        fetchedAt: r.fetchedAt.toISOString(),
        idsSeen: r.idsSeen,
        idsNewEnqueued: r.idsNewEnqueued,
        zonesTotalRequest: r.zonesTotalRequest,
        errorCount: parseErrors(r.errors).length,
        durationMs: r.durationMs,
      })),
  }
}

function parseErrors(
  raw: unknown,
): { source: string; message: string }[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (e): e is { source: string; message: string } =>
      !!e &&
      typeof e === "object" &&
      "source" in e &&
      "message" in e,
  )
}
