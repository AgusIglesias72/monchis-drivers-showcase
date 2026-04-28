// app/admin/gestion/pedidos/page.tsx

import { PedidosHomeContent } from "@/components/admin/gestion/pedidos-home-content"
import { getOrderImportQueueStats } from "@/lib/services/pedidos-import-queue.service"
import {
  getOrdersGlobalStats,
  searchOrders,
  type OrderSignalFilter,
  type OrderSortKey,
  type OrderStatusFilter,
} from "@/lib/services/pedidos.service"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 50

interface PageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    signal?: string
    from?: string
    to?: string
    sortBy?: string
    sortOrder?: string
    page?: string
  }>
}

function parseDateOrNull(s: string | undefined, endOfDay = false): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const [, y, mo, d] = m
  return new Date(`${y}-${mo}-${d}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`)
}

const VALID_STATUS: OrderStatusFilter[] = [
  "all",
  "finalized",
  "cancelled",
  "in_progress",
]
const VALID_SIGNAL: OrderSignalFilter[] = [
  "all",
  "admin_change",
  "slow_acceptance",
  "many_offers",
  "long_e2e",
]
const VALID_SORTBY: OrderSortKey[] = ["confirmedAt", "refreshedAt"]

export default async function PedidosHomePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (sp.q || "").trim()
  const status = (VALID_STATUS as string[]).includes(sp.status || "")
    ? (sp.status as OrderStatusFilter)
    : "all"
  const signal = (VALID_SIGNAL as string[]).includes(sp.signal || "")
    ? (sp.signal as OrderSignalFilter)
    : "all"
  const sortBy = (VALID_SORTBY as string[]).includes(sp.sortBy || "")
    ? (sp.sortBy as OrderSortKey)
    : "confirmedAt"
  const sortOrder = sp.sortOrder === "asc" ? "asc" : "desc"
  const page = Math.max(1, Number(sp.page) || 1)

  const from = parseDateOrNull(sp.from)
  const to = parseDateOrNull(sp.to, true)

  const [{ rows, total }, queueStats, globalStats] = await Promise.all([
    searchOrders({
      q: q || undefined,
      status,
      signal,
      from,
      to,
      page,
      pageSize: PAGE_SIZE,
      sortBy,
      sortOrder,
    }),
    getOrderImportQueueStats(),
    getOrdersGlobalStats(),
  ])

  return (
    <PedidosHomeContent
      rows={rows.map((r) => ({
        requestId: r.requestId,
        externalOrderId: r.externalOrderId,
        driverName: r.driverName,
        branchName: r.branchName,
        status: r.status,
        confirmedAt: r.confirmedAt?.toISOString() ?? null,
        finalizedAt: r.finalizedAt?.toISOString() ?? null,
        refreshedAt: r.refreshedAt.toISOString(),
        hasAdminChange: r.hasAdminChange,
        acceptanceSeconds: r.acceptanceSeconds,
        endToEndSeconds: r.endToEndSeconds,
        offersWithDriverCount: r.offersWithDriverCount,
      }))}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      filters={{
        q,
        status,
        signal,
        from: sp.from || "",
        to: sp.to || "",
        sortBy,
        sortOrder,
      }}
      queuePending={queueStats.pending}
      queueDone={queueStats.done}
      queueTotal={queueStats.total}
      globalStats={globalStats}
    />
  )
}
