// app/admin/gestion/drivers/page.tsx

import { DriversListContent } from "@/components/admin/gestion/drivers-list-content"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    q?: string
    enabled?: string
    page?: string
    createdFrom?: string
    createdTo?: string
    sort?: string
    order?: string
  }>
}

const PAGE_SIZE = 50

const SORT_FIELD_MAP: Record<string, string> = {
  orders: "ordersCount30d",
  accepted: "acceptedOrders30d",
  sessions: "sessions30d",
  hours: "hoursWorked30d",
  days: "daysWithActivity30d",
  enabled: "enabled",
  name: "fullName",
}

const DEFAULT_ORDER_BY_SORT: Record<string, "asc" | "desc"> = {
  orders: "desc",
  accepted: "desc",
  sessions: "desc",
  hours: "desc",
  days: "desc",
  enabled: "desc",
  name: "asc",
}

function parseDateOrNull(s: string | undefined, endOfDay = false): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const [, y, mo, d] = m
  return new Date(`${y}-${mo}-${d}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`)
}

export default async function DriversPage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = (params.q || "").trim()
  const enabled = params.enabled // "true" | "false" | undefined
  const page = Math.max(1, Number(params.page) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const sort = SORT_FIELD_MAP[params.sort || ""] ? params.sort! : "orders"
  const order: "asc" | "desc" =
    params.order === "asc" || params.order === "desc"
      ? params.order
      : DEFAULT_ORDER_BY_SORT[sort]
  const sortField = SORT_FIELD_MAP[sort]

  const orderBy: Record<string, "asc" | "desc">[] =
    sortField === "fullName"
      ? [{ fullName: order }]
      : [{ [sortField]: order }, { fullName: "asc" }]

  const createdFrom = parseDateOrNull(params.createdFrom)
  const createdTo = parseDateOrNull(params.createdTo, true)

  const where: any = {}
  if (enabled === "true") where.enabled = true
  if (enabled === "false") where.enabled = false
  if (createdFrom || createdTo) {
    where.createdAtRemote = {}
    if (createdFrom) where.createdAtRemote.gte = createdFrom
    if (createdTo) where.createdAtRemote.lte = createdTo
  }
  if (query) {
    where.OR = [
      { fullName: { contains: query, mode: "insensitive" } },
      { firstName: { contains: query, mode: "insensitive" } },
      { lastName: { contains: query, mode: "insensitive" } },
      { documentNumber: { contains: query } },
      { phone: { contains: query } },
      { email: { contains: query, mode: "insensitive" } },
    ]
  }

  const [drivers, total, lastSync, enabledCount, disabledCount] = await Promise.all([
    prisma.monchisDriverCache.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: {
        driverId: true,
        firstName: true,
        lastName: true,
        fullName: true,
        documentNumber: true,
        email: true,
        phone: true,
        enabled: true,
        updatedAtRemote: true,
        syncedAt: true,
        attendanceLastProcessedAt: true,
        ordersCount30d: true,
        acceptedOrders30d: true,
        sessions30d: true,
        daysWithActivity30d: true,
        hoursWorked30d: true,
        primaryZone30d: true,
        primaryTurn30d: true,
      },
    }),
    prisma.monchisDriverCache.count({ where }),
    prisma.monchisDriverCache.findFirst({
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true },
    }),
    prisma.monchisDriverCache.count({ where: { enabled: true } }),
    prisma.monchisDriverCache.count({ where: { enabled: false } }),
  ])

  return (
    <DriversListContent
      drivers={drivers.map((d) => ({
        ...d,
        updatedAtRemote: d.updatedAtRemote?.toISOString() ?? null,
        syncedAt: d.syncedAt.toISOString(),
        attendanceLastProcessedAt:
          d.attendanceLastProcessedAt?.toISOString() ?? null,
      }))}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      query={query}
      enabledFilter={enabled || "all"}
      lastSyncAtIso={lastSync?.syncedAt.toISOString() ?? null}
      enabledCount={enabledCount}
      disabledCount={disabledCount}
      createdFrom={params.createdFrom || ""}
      createdTo={params.createdTo || ""}
      sort={sort}
      order={order}
    />
  )
}
