import "server-only"

import { PEDIDOS_CONFIG, REQUEST_ID_REGEX } from "@/lib/config/pedidos.config"
import { prisma } from "@/lib/prisma"
import { computeKpis } from "@/lib/services/pedidos-kpis"
import type { OrderFetchResult, RawOrder } from "@/lib/types/pedidos.types"

export class PedidoLookupError extends Error {
  constructor(
    message: string,
    public code:
      | "INVALID_ID"
      | "NOT_FOUND"
      | "API_ERROR"
      | "MISSING_TOKEN"
      | "UNAUTHORIZED",
  ) {
    super(message)
  }
}

function lastDriver(order: RawOrder): { id?: string; name?: string } {
  const histories = order.histories || []
  for (let i = histories.length - 1; i >= 0; i--) {
    const h = histories[i]
    const ids = h.drivers_by_id || []
    const names = h.drivers_by_name || []
    if (ids.length > 0) {
      return { id: ids[0], name: names[0] }
    }
  }
  return { id: order.driver_id }
}

function finalizedAt(order: RawOrder): Date | null {
  const histories = order.histories || []
  for (let i = histories.length - 1; i >= 0; i--) {
    if (histories[i].request_state === "FINALIZED") {
      return new Date(histories[i].date)
    }
  }
  return null
}

function safeDate(s: string | undefined | null): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function computeOrderFlags(order: RawOrder): {
  hasAdminChange: boolean
  acceptanceSeconds: number | null
  endToEndSeconds: number | null
  offersWithDriverCount: number
} {
  const histories = order.histories || []
  const hasAdminChange = histories.some((h) => !!h.admin_changed_state)
  const offersWithDriverCount = histories.filter(
    (h) => h.request_state === "PENDING" && (h.drivers_by_id || []).length > 0,
  ).length
  const kpis = computeKpis(order)
  return {
    hasAdminChange,
    acceptanceSeconds: kpis.accepting.seconds,
    endToEndSeconds: kpis.endToEnd.seconds,
    offersWithDriverCount,
  }
}

async function saveToCache(order: RawOrder) {
  const { id: driverId, name: driverName } = lastDriver(order)
  const flags = computeOrderFlags(order)
  const data = {
    externalOrderId: order.external_order_id ?? null,
    driverId: driverId ?? null,
    driverName: driverName ?? null,
    branchName: order.data_origin?.name ?? null,
    status: order.driver_request_state ?? null,
    totalOrder: order.total_order ?? null,
    confirmedAt: safeDate(order.data_origin?.confirmed_at),
    finalizedAt: finalizedAt(order),
    rawData: order as unknown as object,
    ...flags,
  }
  await prisma.monchisOrderCache.upsert({
    where: { requestId: order._id },
    create: { requestId: order._id, ...data },
    update: data,
  })
}

async function fetchFromApi(requestId: string): Promise<RawOrder> {
  if (!PEDIDOS_CONFIG.token) {
    throw new PedidoLookupError(
      "MONCHIS_DRIVERS_API_TOKEN no configurado",
      "MISSING_TOKEN",
    )
  }

  const url = `${PEDIDOS_CONFIG.detailUrl}?request_id=${encodeURIComponent(requestId)}`
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: PEDIDOS_CONFIG.token,
    },
    cache: "no-store",
  })

  if (res.status === 401) {
    throw new PedidoLookupError("Token inválido o expirado", "UNAUTHORIZED")
  }

  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new PedidoLookupError(
      `Respuesta no-JSON de la API (HTTP ${res.status})`,
      "API_ERROR",
    )
  }

  const json = body as {
    data?: RawOrder[] | Record<string, unknown>
    success?: boolean
    message?: string
  }

  if (!res.ok || json.success === false) {
    if (
      json.message?.toLowerCase().includes("no fue encontrado") ||
      json.message?.toLowerCase().includes("not found")
    ) {
      throw new PedidoLookupError(
        "El pedido no fue encontrado en Monchis",
        "NOT_FOUND",
      )
    }
    throw new PedidoLookupError(
      json.message || `HTTP ${res.status}`,
      "API_ERROR",
    )
  }

  if (!Array.isArray(json.data) || json.data.length === 0) {
    throw new PedidoLookupError(
      "El pedido no fue encontrado en Monchis",
      "NOT_FOUND",
    )
  }

  return json.data[0]
}

export async function getOrderByRequestId(
  requestId: string,
  options: { forceRefresh?: boolean } = {},
): Promise<OrderFetchResult> {
  const id = requestId.trim()
  if (!REQUEST_ID_REGEX.test(id)) {
    throw new PedidoLookupError(
      "Formato inválido. Debe ser un Mongo ObjectId (24 hex)",
      "INVALID_ID",
    )
  }

  if (!options.forceRefresh) {
    const cached = await prisma.monchisOrderCache.findUnique({
      where: { requestId: id },
    })
    if (cached && cached.status && PEDIDOS_CONFIG.terminalStates.has(cached.status)) {
      return {
        order: cached.rawData as unknown as RawOrder,
        fetchedAt: cached.refreshedAt,
        source: "cache",
      }
    }
  }

  const order = await fetchFromApi(id)
  await saveToCache(order).catch((err) => {
    // Si el upsert falla no rompemos la respuesta — la próxima vez se reintenta.
    console.error("[pedidos] error guardando cache:", err)
  })

  return { order, fetchedAt: new Date(), source: "api" }
}

export type OrderStatusFilter =
  | "all"
  | "finalized"
  | "cancelled"
  | "in_progress" // ACCEPTED, PENDING, WAITING_ORDER, DELIVERY, OUTSIDE

export type OrderSignalFilter =
  | "all"
  | "admin_change"
  | "slow_acceptance"
  | "many_offers"
  | "long_e2e"

export type OrderSortKey = "confirmedAt" | "refreshedAt"

export interface SearchOrdersParams {
  q?: string
  status?: OrderStatusFilter
  signal?: OrderSignalFilter
  from?: Date | null // confirmedAt >= from
  to?: Date | null // confirmedAt <= to
  page?: number
  pageSize?: number
  sortBy?: OrderSortKey
  sortOrder?: "asc" | "desc"
}

const SLOW_ACCEPT_THRESHOLD = 10 * 60
const LONG_E2E_THRESHOLD = 60 * 60
const MANY_OFFERS_THRESHOLD = 3

const IN_PROGRESS_STATES = [
  "PENDING",
  "ACCEPTED",
  "WAITING_ORDER",
  "DELIVERY",
  "OUTSIDE",
]

export async function searchOrders(params: SearchOrdersParams = {}) {
  const {
    q,
    status = "all",
    signal = "all",
    from = null,
    to = null,
    page = 1,
    pageSize = 50,
    sortBy = "confirmedAt",
    sortOrder = "desc",
  } = params

  // Excluimos pedidos sin confirmedAt — son data inconsistente que la API
  // devuelve a veces y no aporta nada en la tabla.
  const where: Record<string, unknown> = {
    confirmedAt: { not: null },
  }

  if (status === "finalized") where.status = "FINALIZED"
  else if (status === "cancelled") where.status = "CANCELLED"
  else if (status === "in_progress")
    where.status = { in: IN_PROGRESS_STATES }

  if (signal === "admin_change") where.hasAdminChange = true
  else if (signal === "slow_acceptance")
    where.acceptanceSeconds = { gt: SLOW_ACCEPT_THRESHOLD }
  else if (signal === "many_offers")
    where.offersWithDriverCount = { gte: MANY_OFFERS_THRESHOLD }
  else if (signal === "long_e2e")
    where.endToEndSeconds = { gt: LONG_E2E_THRESHOLD }

  if (from || to) {
    const cf = where.confirmedAt as Record<string, unknown>
    if (from) cf.gte = from
    if (to) cf.lte = to
  }

  if (q && q.trim()) {
    const term = q.trim()
    where.OR = [
      { requestId: { equals: term } },
      { externalOrderId: { contains: term } },
      { driverName: { contains: term, mode: "insensitive" } },
      { branchName: { contains: term, mode: "insensitive" } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.monchisOrderCache.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        requestId: true,
        externalOrderId: true,
        driverName: true,
        branchName: true,
        status: true,
        confirmedAt: true,
        finalizedAt: true,
        refreshedAt: true,
        hasAdminChange: true,
        acceptanceSeconds: true,
        endToEndSeconds: true,
        offersWithDriverCount: true,
      },
    }),
    prisma.monchisOrderCache.count({ where }),
  ])

  return { rows, total }
}

export async function getOrdersGlobalStats() {
  const baseWhere = { confirmedAt: { not: null } }
  const [total, finalized, cancelled, withAdminChange] = await Promise.all([
    prisma.monchisOrderCache.count({ where: baseWhere }),
    prisma.monchisOrderCache.count({
      where: { ...baseWhere, status: "FINALIZED" },
    }),
    prisma.monchisOrderCache.count({
      where: { ...baseWhere, status: "CANCELLED" },
    }),
    prisma.monchisOrderCache.count({
      where: { ...baseWhere, hasAdminChange: true },
    }),
  ])
  return { total, finalized, cancelled, withAdminChange }
}
