import "server-only"

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

// Edad mínima de un pedido para entrar al refresh: < 2h se asume que está en
// flujo normal y refrescarlo es gasto al pedo. Sólo pedidos viejos que aún no
// llegaron a estado terminal son candidatos a estar "trabados" en la cache.
const REFRESH_MIN_AGE_MS = 2 * 60 * 60 * 1000

// Re-encola pedidos cacheados que aún no llegaron a estado terminal
// (FINALIZED/CANCELLED) para que el processor vuelva a consultar la API
// y refresque su estado.
export async function enqueueNonTerminalOrdersForRefresh(): Promise<RefreshNonTerminalResult> {
  const start = Date.now()
  const ageCutoff = new Date(Date.now() - REFRESH_MIN_AGE_MS)

  const cacheRows = await prisma.monchisOrderCache.findMany({
    where: {
      AND: [
        {
          OR: [
            { status: null },
            { status: { notIn: [...PEDIDOS_CONFIG.terminalStates] } },
          ],
        },
        {
          // Pedido con >2h de antigüedad real (confirmedAt) o de captura
          // si nunca fue confirmado, para no procesar al pedo pedidos en
          // flujo normal.
          OR: [
            { confirmedAt: { lt: ageCutoff } },
            {
              AND: [
                { confirmedAt: null },
                { capturedAt: { lt: ageCutoff } },
              ],
            },
          ],
        },
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
