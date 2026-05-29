import "server-only"

import { LIVE_CAPTURE_CONFIG } from "@/lib/config/live-capture.config"
import { PEDIDOS_CONFIG, REQUEST_ID_REGEX } from "@/lib/config/pedidos.config"
import { prisma } from "@/lib/prisma"
import {
  PedidoLookupError,
  getOrderByRequestId,
} from "@/lib/services/pedidos.service"
import type { QueueStats } from "@/lib/types/pedidos-queue.types"

export type { QueueStats }

const PROCESS_PARALLEL = 5

export interface EnqueueResult {
  totalSubmitted: number
  inserted: number
  invalid: number
  alreadyEnqueued: number
}

export async function enqueueOrderImports(
  rawIds: string[],
): Promise<EnqueueResult> {
  const seen = new Set<string>()
  const valid: string[] = []
  let invalid = 0
  for (const raw of rawIds) {
    const cleaned = (raw || "").replace(/^['"]+|['"]+$/g, "").trim()
    if (!cleaned) continue
    if (!REQUEST_ID_REGEX.test(cleaned)) {
      invalid += 1
      continue
    }
    if (seen.has(cleaned)) continue
    seen.add(cleaned)
    valid.push(cleaned)
  }

  if (valid.length === 0) {
    return {
      totalSubmitted: rawIds.length,
      inserted: 0,
      invalid,
      alreadyEnqueued: 0,
    }
  }

  // createMany con skipDuplicates → si ya estaba encolado, no lo re-toca.
  // No respeta el default(now()) si lo dejamos así, pero está bien porque
  // queremos preservar el enqueuedAt original de los duplicados.
  const result = await prisma.monchisOrderImportQueue.createMany({
    data: valid.map((requestId) => ({ requestId })),
    skipDuplicates: true,
  })

  return {
    totalSubmitted: rawIds.length,
    inserted: result.count,
    invalid,
    alreadyEnqueued: valid.length - result.count,
  }
}

export async function getOrderImportQueueStats(): Promise<QueueStats> {
  const [byStatus, oldest, last] = await Promise.all([
    prisma.monchisOrderImportQueue.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.monchisOrderImportQueue.findFirst({
      where: { status: "pending" },
      orderBy: { enqueuedAt: "asc" },
      select: { enqueuedAt: true },
    }),
    prisma.monchisOrderImportQueue.findFirst({
      where: { processedAt: { not: null } },
      orderBy: { processedAt: "desc" },
      select: { processedAt: true },
    }),
  ])

  const counts = { pending: 0, done: 0, failed: 0, notFound: 0 }
  for (const row of byStatus) {
    if (row.status === "pending") counts.pending = row._count._all
    else if (row.status === "done") counts.done = row._count._all
    else if (row.status === "failed") counts.failed = row._count._all
    else if (row.status === "not_found") counts.notFound = row._count._all
  }

  return {
    ...counts,
    total: counts.pending + counts.done + counts.failed + counts.notFound,
    oldestPendingAt: oldest?.enqueuedAt ?? null,
    lastProcessedAt: last?.processedAt ?? null,
  }
}

export interface QueueBatchResult {
  ok: boolean
  picked: number
  done: number
  notFound: number
  failed: number
  durationMs: number
}

export async function processOrderImportQueueBatch(
  limit: number,
  priority: "oldest" | "recent" = "oldest",
): Promise<QueueBatchResult> {
  const start = Date.now()

  const items = await prisma.monchisOrderImportQueue.findMany({
    where: { status: "pending" },
    orderBy: { enqueuedAt: priority === "recent" ? "desc" : "asc" },
    take: limit,
    select: { requestId: true, attempts: true },
  })

  if (items.length === 0) {
    return {
      ok: true,
      picked: 0,
      done: 0,
      notFound: 0,
      failed: 0,
      durationMs: Date.now() - start,
    }
  }

  let done = 0
  let notFound = 0
  let failed = 0

  for (let i = 0; i < items.length; i += PROCESS_PARALLEL) {
    const chunk = items.slice(i, i + PROCESS_PARALLEL)
    await Promise.all(
      chunk.map(async (item) => {
        try {
          await getOrderByRequestId(item.requestId)
          await prisma.monchisOrderImportQueue.update({
            where: { requestId: item.requestId },
            data: {
              status: "done",
              processedAt: new Date(),
              attempts: { increment: 1 },
              errorMessage: null,
            },
          })
          done += 1
        } catch (err) {
          if (err instanceof PedidoLookupError && err.code === "NOT_FOUND") {
            await prisma.monchisOrderImportQueue.update({
              where: { requestId: item.requestId },
              data: {
                status: "not_found",
                processedAt: new Date(),
                attempts: { increment: 1 },
                errorMessage: null,
              },
            })
            notFound += 1
            return
          }
          await prisma.monchisOrderImportQueue.update({
            where: { requestId: item.requestId },
            data: {
              status: "failed",
              processedAt: new Date(),
              attempts: { increment: 1 },
              errorMessage:
                err instanceof Error ? err.message.slice(0, 500) : "Error",
            },
          })
          failed += 1
        }
      }),
    )
  }

  return {
    ok: failed === 0,
    picked: items.length,
    done,
    notFound,
    failed,
    durationMs: Date.now() - start,
  }
}

export interface RefreshNonTerminalResult {
  scanned: number
  reset: number
  inserted: number
  durationMs: number
}

// Re-encola pedidos cacheados que aún no llegaron a estado terminal para que
// el processor vuelva a consultar la API y refresque su estado. Barrido LENTO:
// sólo los capturados hace > recentWindowMs (los recientes los cubre el lane
// rápido refreshRecentNonTerminalOrders). Ancla en capturedAt — NO confirmedAt,
// que viene PY-mislabeled y quedaría ~3h atrasado en cache.
export async function enqueueNonTerminalOrdersForRefresh(): Promise<RefreshNonTerminalResult> {
  const start = Date.now()
  const ageCutoff = new Date(Date.now() - LIVE_CAPTURE_CONFIG.recentWindowMs)

  const cacheRows = await prisma.monchisOrderCache.findMany({
    where: {
      AND: [
        {
          OR: [
            { status: null },
            { status: { notIn: [...PEDIDOS_CONFIG.terminalStates] } },
          ],
        },
        { capturedAt: { lt: ageCutoff } },
      ],
    },
    select: { requestId: true },
  })

  if (cacheRows.length === 0) {
    return { scanned: 0, reset: 0, inserted: 0, durationMs: Date.now() - start }
  }

  const requestIds = cacheRows.map((r) => r.requestId)

  const [resetResult, insertResult] = await Promise.all([
    prisma.monchisOrderImportQueue.updateMany({
      where: {
        requestId: { in: requestIds },
        status: { in: ["done", "failed", "not_found"] },
      },
      data: {
        status: "pending",
        processedAt: null,
        errorMessage: null,
      },
    }),
    prisma.monchisOrderImportQueue.createMany({
      data: requestIds.map((requestId) => ({ requestId })),
      skipDuplicates: true,
    }),
  ])

  return {
    scanned: cacheRows.length,
    reset: resetResult.count,
    inserted: insertResult.count,
    durationMs: Date.now() - start,
  }
}

export async function retryFailedQueueItems(): Promise<number> {
  const result = await prisma.monchisOrderImportQueue.updateMany({
    where: { status: "failed" },
    data: { status: "pending", errorMessage: null, processedAt: null },
  })
  return result.count
}

export interface RefreshRecentResult {
  scanned: number
  refreshed: number
  terminalNow: number
  failed: number
  dropped: number
  notFoundRetried: number
  durationMs: number
}

// Lane rápido: refresca DIRECTO (forceRefresh) los pedidos no-terminales
// recientes (< recentWindowMs) para que su estado en admin esté fresco sin
// esperar al barrido lento de >2h. Llama la API en chunks paralelos, con tope
// y oldest-first para que ninguno del rango quede sin refrescar.
export async function refreshRecentNonTerminalOrders(): Promise<RefreshRecentResult> {
  const start = Date.now()
  const since = new Date(Date.now() - LIVE_CAPTURE_CONFIG.recentWindowMs)
  const max = LIVE_CAPTURE_CONFIG.recentRefreshMax

  // Anclamos la ventana en capturedAt (now() real al insertar), NO en
  // confirmedAt: el endpoint del pedido devuelve confirmed_at como PY local
  // mal etiquetado Z, así que en cache queda ~3h atrasado y "gte now-2h"
  // casi nunca matchearía. capturedAt = primera vez que vimos el pedido.
  const where = {
    AND: [
      {
        OR: [
          { status: null },
          { status: { notIn: [...PEDIDOS_CONFIG.terminalStates] } },
        ],
      },
      { capturedAt: { gte: since } },
    ],
  }

  const [total, rows] = await Promise.all([
    prisma.monchisOrderCache.count({ where }),
    prisma.monchisOrderCache.findMany({
      where,
      // Oldest-first dentro del rango: prioriza los que están por cruzar las 2h.
      orderBy: { capturedAt: "asc" },
      take: max,
      select: { requestId: true },
    }),
  ])

  const dropped = Math.max(0, total - rows.length)

  let refreshed = 0
  let terminalNow = 0
  let failed = 0

  const parallel = LIVE_CAPTURE_CONFIG.recentRefreshParallel
  for (let i = 0; i < rows.length; i += parallel) {
    const chunk = rows.slice(i, i + parallel)
    await Promise.all(
      chunk.map(async (row) => {
        try {
          const res = await getOrderByRequestId(row.requestId, {
            forceRefresh: true,
          })
          refreshed += 1
          const state = res.order.driver_request_state
          if (state && PEDIDOS_CONFIG.terminalStates.has(state)) {
            terminalNow += 1
          }
        } catch {
          // No rompemos el batch por un pedido puntual; el próximo ciclo reintenta.
          failed += 1
        }
      }),
    )
  }

  // Reintento de not_found recientes (carrera: visto en live pero todavía no
  // consultable en request_histories). Los reseteamos a pending para que el
  // processor los vuelva a intentar, hasta un máximo de intentos.
  const notFoundCutoff = new Date(
    Date.now() - LIVE_CAPTURE_CONFIG.notFoundRetryWindowMs,
  )
  const retry = await prisma.monchisOrderImportQueue.updateMany({
    where: {
      status: "not_found",
      enqueuedAt: { gte: notFoundCutoff },
      attempts: { lt: LIVE_CAPTURE_CONFIG.notFoundMaxAttempts },
    },
    data: { status: "pending", processedAt: null, errorMessage: null },
  })

  return {
    scanned: rows.length,
    refreshed,
    terminalNow,
    failed,
    dropped,
    notFoundRetried: retry.count,
    durationMs: Date.now() - start,
  }
}
