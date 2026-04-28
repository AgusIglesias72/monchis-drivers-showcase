import "server-only"

import { REQUEST_ID_REGEX } from "@/lib/config/pedidos.config"
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
): Promise<QueueBatchResult> {
  const start = Date.now()

  const items = await prisma.monchisOrderImportQueue.findMany({
    where: { status: "pending" },
    orderBy: { enqueuedAt: "asc" },
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

export async function retryFailedQueueItems(): Promise<number> {
  const result = await prisma.monchisOrderImportQueue.updateMany({
    where: { status: "failed" },
    data: { status: "pending", errorMessage: null, processedAt: null },
  })
  return result.count
}
