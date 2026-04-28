"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

import { REQUEST_ID_REGEX } from "@/lib/config/pedidos.config"
import {
  enqueueOrderImports,
  getOrderImportQueueStats,
  retryFailedQueueItems,
} from "@/lib/services/pedidos-import-queue.service"
import {
  PedidoLookupError,
  getOrderByRequestId,
} from "@/lib/services/pedidos.service"
import type { QueueStats } from "@/lib/types/pedidos-queue.types"

export interface RefreshPedidoResult {
  ok: boolean
  error?: string
}

export async function refreshPedido(requestId: string): Promise<RefreshPedidoResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "No autorizado" }

  if (!REQUEST_ID_REGEX.test(requestId)) {
    return { ok: false, error: "Formato inválido" }
  }

  try {
    await getOrderByRequestId(requestId, { forceRefresh: true })
    revalidatePath(`/admin/gestion/pedidos/${requestId}`)
    return { ok: true }
  } catch (err) {
    if (err instanceof PedidoLookupError) return { ok: false, error: err.message }
    return { ok: false, error: "Error inesperado" }
  }
}

export interface BulkImportResult {
  ok: boolean
  inserted: number
  alreadyEnqueued: number
  invalid: number
  totalSubmitted: number
  durationMs: number
  queueStats: QueueStats
  error?: string
}

/**
 * Encola IDs para que el cron los procese en background. Es prácticamente
 * instantáneo — un solo INSERT con skipDuplicates en lugar de 1 API call por ID.
 */
export async function bulkImportPedidos(
  rawIds: string[],
): Promise<BulkImportResult> {
  const start = Date.now()
  const { userId } = await auth()
  if (!userId) {
    const stats = await getOrderImportQueueStats().catch(() => emptyStats())
    return {
      ok: false,
      inserted: 0,
      alreadyEnqueued: 0,
      invalid: 0,
      totalSubmitted: 0,
      durationMs: Date.now() - start,
      queueStats: stats,
      error: "No autorizado",
    }
  }

  const enqueue = await enqueueOrderImports(rawIds)
  const queueStats = await getOrderImportQueueStats()
  revalidatePath("/admin/gestion/pedidos")
  revalidatePath("/admin/gestion/pedidos/import")

  return {
    ok: true,
    inserted: enqueue.inserted,
    alreadyEnqueued: enqueue.alreadyEnqueued,
    invalid: enqueue.invalid,
    totalSubmitted: enqueue.totalSubmitted,
    durationMs: Date.now() - start,
    queueStats,
  }
}

function emptyStats(): QueueStats {
  return {
    pending: 0,
    done: 0,
    failed: 0,
    notFound: 0,
    total: 0,
    oldestPendingAt: null,
    lastProcessedAt: null,
  }
}

export async function getQueueStats(): Promise<QueueStats> {
  return getOrderImportQueueStats()
}

export async function retryFailedImports(): Promise<{ retried: number }> {
  const { userId } = await auth()
  if (!userId) return { retried: 0 }
  const retried = await retryFailedQueueItems()
  revalidatePath("/admin/gestion/pedidos/import")
  return { retried }
}

