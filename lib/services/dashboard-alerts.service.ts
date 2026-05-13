import "server-only"

import { prisma } from "@/lib/prisma"

// ============================================================================
// Tipos públicos
// ============================================================================

export type AlertSeverity = "info" | "warning" | "critical"

export type OrderSignalType =
  | "admin_change"
  | "slow_acceptance"
  | "many_offers"
  | "long_e2e"

export type OrderSignalAlert = {
  requestId: string
  signal: OrderSignalType
  detectedAt: string // ISO
  zone: string | null
  severity: AlertSeverity
  detail: string
}

export type NoShowAlert = {
  attendeeId: string
  driverName: string | null
  eventDate: string // ISO
  zone: string | null
  severity: AlertSeverity
}

export type StuckDocAlert = {
  driverId: string
  driverName: string | null
  docType: string
  pendingSince: string // ISO
  daysPending: number
  severity: AlertSeverity
}

export type AlertsCounts = {
  orderSignals: { total: number; byType: Record<string, number> }
  noShowsLast7Days: number
  stuckDocs: number
  totalCritical: number
}

// ============================================================================
// Umbrales de severidad
// ============================================================================

// Pedidos
const SLOW_ACCEPT_BASE_SEC = 10 * 60 // 10 min: límite que ya usa searchOrders()
const SLOW_ACCEPT_WARNING_SEC = 20 * 60 // >20 min → warning
const SLOW_ACCEPT_CRITICAL_SEC = 40 * 60 // >40 min → critical

const MANY_OFFERS_BASE = 3 // ≥3: límite que ya usa searchOrders()
const MANY_OFFERS_WARNING = 5
const MANY_OFFERS_CRITICAL = 8

const LONG_E2E_BASE_SEC = 60 * 60 // >1h: límite que ya usa searchOrders()
const LONG_E2E_WARNING_SEC = 90 * 60
const LONG_E2E_CRITICAL_SEC = 120 * 60

// Docs
const STUCK_DOC_MIN_DAYS_DEFAULT = 7
const STUCK_DOC_WARNING_DAYS = 14
const STUCK_DOC_CRITICAL_DAYS = 30

// Defaults
const DEFAULT_ORDER_DAYS = 7
const DEFAULT_NO_SHOW_DAYS = 7
const DEFAULT_LIMIT = 20

// ============================================================================
// Helpers
// ============================================================================

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

function formatMinutes(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—"
  const minutes = Math.round(seconds / 60)
  return `${minutes} min`
}

function severityForSlowAccept(sec: number): AlertSeverity {
  if (sec > SLOW_ACCEPT_CRITICAL_SEC) return "critical"
  if (sec > SLOW_ACCEPT_WARNING_SEC) return "warning"
  return "info"
}

function severityForManyOffers(count: number): AlertSeverity {
  if (count >= MANY_OFFERS_CRITICAL) return "critical"
  if (count >= MANY_OFFERS_WARNING) return "warning"
  return "info"
}

function severityForLongE2E(sec: number): AlertSeverity {
  if (sec > LONG_E2E_CRITICAL_SEC) return "critical"
  if (sec > LONG_E2E_WARNING_SEC) return "warning"
  return "info"
}

function severityForStuckDoc(days: number): AlertSeverity {
  if (days > STUCK_DOC_CRITICAL_DAYS) return "critical"
  if (days > STUCK_DOC_WARNING_DAYS) return "warning"
  return "info"
}

// ============================================================================
// Order signal alerts
// ============================================================================

export async function getOrderSignalAlerts(
  days: number = DEFAULT_ORDER_DAYS,
  limit: number = DEFAULT_LIMIT,
): Promise<OrderSignalAlert[]> {
  const since = daysAgo(days)
  const baseWhere = {
    confirmedAt: { gte: since, not: null } as { gte: Date; not: null },
  }

  // Tomamos slots equilibrados por tipo de señal para evitar que una
  // categoría con muchos pedidos tape al resto.
  const perTypeLimit = Math.max(5, Math.ceil(limit / 2))

  const [adminChanges, slow, manyOffers, longE2E] = await Promise.all([
    prisma.monchisOrderCache.findMany({
      where: { ...baseWhere, hasAdminChange: true },
      orderBy: { confirmedAt: "desc" },
      take: perTypeLimit,
      select: {
        requestId: true,
        confirmedAt: true,
        branchName: true,
        acceptanceSeconds: true,
      },
    }),
    prisma.monchisOrderCache.findMany({
      where: {
        ...baseWhere,
        acceptanceSeconds: { gt: SLOW_ACCEPT_BASE_SEC },
      },
      orderBy: { acceptanceSeconds: "desc" },
      take: perTypeLimit,
      select: {
        requestId: true,
        confirmedAt: true,
        branchName: true,
        acceptanceSeconds: true,
      },
    }),
    prisma.monchisOrderCache.findMany({
      where: {
        ...baseWhere,
        offersWithDriverCount: { gte: MANY_OFFERS_BASE },
      },
      orderBy: { offersWithDriverCount: "desc" },
      take: perTypeLimit,
      select: {
        requestId: true,
        confirmedAt: true,
        branchName: true,
        offersWithDriverCount: true,
      },
    }),
    prisma.monchisOrderCache.findMany({
      where: { ...baseWhere, endToEndSeconds: { gt: LONG_E2E_BASE_SEC } },
      orderBy: { endToEndSeconds: "desc" },
      take: perTypeLimit,
      select: {
        requestId: true,
        confirmedAt: true,
        branchName: true,
        endToEndSeconds: true,
      },
    }),
  ])

  const all: OrderSignalAlert[] = []

  for (const row of adminChanges) {
    all.push({
      requestId: row.requestId,
      signal: "admin_change",
      detectedAt: (row.confirmedAt ?? new Date()).toISOString(),
      zone: row.branchName,
      severity: "info",
      detail: "Cambio manual del admin en el pedido",
    })
  }

  for (const row of slow) {
    const sec = row.acceptanceSeconds ?? 0
    all.push({
      requestId: row.requestId,
      signal: "slow_acceptance",
      detectedAt: (row.confirmedAt ?? new Date()).toISOString(),
      zone: row.branchName,
      severity: severityForSlowAccept(sec),
      detail: `Aceptación tomó ${formatMinutes(sec)}`,
    })
  }

  for (const row of manyOffers) {
    const count = row.offersWithDriverCount ?? 0
    all.push({
      requestId: row.requestId,
      signal: "many_offers",
      detectedAt: (row.confirmedAt ?? new Date()).toISOString(),
      zone: row.branchName,
      severity: severityForManyOffers(count),
      detail: `${count} ofertas a drivers antes de aceptar`,
    })
  }

  for (const row of longE2E) {
    const sec = row.endToEndSeconds ?? 0
    all.push({
      requestId: row.requestId,
      signal: "long_e2e",
      detectedAt: (row.confirmedAt ?? new Date()).toISOString(),
      zone: row.branchName,
      severity: severityForLongE2E(sec),
      detail: `Pedido tardó ${formatMinutes(sec)} de punta a punta`,
    })
  }

  // Orden global: critical → warning → info; dentro, más recientes primero.
  const severityRank: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  }
  all.sort((a, b) => {
    const s = severityRank[a.severity] - severityRank[b.severity]
    if (s !== 0) return s
    return b.detectedAt.localeCompare(a.detectedAt)
  })

  return all.slice(0, limit)
}

// ============================================================================
// No-show alerts
// ============================================================================

export async function getNoShowAlerts(
  days: number = DEFAULT_NO_SHOW_DAYS,
  limit: number = DEFAULT_LIMIT,
): Promise<NoShowAlert[]> {
  const since = daysAgo(days)
  const rows = await prisma.onboardingAttendee.findMany({
    where: {
      status: "NO_SHOW",
      OR: [
        { markedNoShowAt: { gte: since } },
        { event: { scheduledDate: { gte: since } } },
      ],
    },
    orderBy: [{ markedNoShowAt: "desc" }, { invitedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      markedNoShowAt: true,
      formDriver: {
        select: {
          fullName: true,
          firstName: true,
          lastName: true,
          workZone: true,
          city: true,
        },
      },
      event: {
        select: {
          scheduledDate: true,
          location: true,
        },
      },
    },
  })

  return rows.map((r) => {
    const fallbackName =
      [r.formDriver.firstName, r.formDriver.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || null
    const driverName = r.formDriver.fullName ?? fallbackName
    const zone =
      r.formDriver.workZone ?? r.formDriver.city ?? r.event.location ?? null
    const when = r.markedNoShowAt ?? r.event.scheduledDate
    return {
      attendeeId: r.id,
      driverName,
      eventDate: when.toISOString(),
      zone,
      severity: "warning" as AlertSeverity,
    }
  })
}

// ============================================================================
// Stuck docs alerts
// ============================================================================

export async function getStuckDocAlerts(
  minDays: number = STUCK_DOC_MIN_DAYS_DEFAULT,
  limit: number = DEFAULT_LIMIT,
): Promise<StuckDocAlert[]> {
  const cutoff = daysAgo(minDays)
  const rows = await prisma.formDocument.findMany({
    where: {
      status: "PENDING",
      uploadedAt: { lt: cutoff },
    },
    orderBy: { uploadedAt: "asc" },
    take: limit,
    select: {
      id: true,
      documentType: true,
      uploadedAt: true,
      formDriver: {
        select: {
          id: true,
          fullName: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  const now = Date.now()
  return rows.map((r) => {
    const fallbackName =
      [r.formDriver.firstName, r.formDriver.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || null
    const driverName = r.formDriver.fullName ?? fallbackName
    const days = Math.floor(
      (now - r.uploadedAt.getTime()) / (1000 * 60 * 60 * 24),
    )
    return {
      driverId: r.formDriver.id,
      driverName,
      docType: String(r.documentType),
      pendingSince: r.uploadedAt.toISOString(),
      daysPending: days,
      severity: severityForStuckDoc(days),
    }
  })
}

// ============================================================================
// Counts y snapshot
// ============================================================================

export async function getAlertsCounts(): Promise<AlertsCounts> {
  const orderSince = daysAgo(DEFAULT_ORDER_DAYS)
  const noShowSince = daysAgo(DEFAULT_NO_SHOW_DAYS)
  const stuckCutoff = daysAgo(STUCK_DOC_MIN_DAYS_DEFAULT)

  const baseOrder = {
    confirmedAt: { gte: orderSince, not: null } as {
      gte: Date
      not: null
    },
  }

  const [
    adminChangeCount,
    slowCount,
    manyOffersCount,
    longE2ECount,
    slowCriticalCount,
    manyOffersCriticalCount,
    longE2ECriticalCount,
    noShowsLast7Days,
    stuckDocsTotal,
    stuckDocsCritical,
  ] = await Promise.all([
    prisma.monchisOrderCache.count({
      where: { ...baseOrder, hasAdminChange: true },
    }),
    prisma.monchisOrderCache.count({
      where: { ...baseOrder, acceptanceSeconds: { gt: SLOW_ACCEPT_BASE_SEC } },
    }),
    prisma.monchisOrderCache.count({
      where: {
        ...baseOrder,
        offersWithDriverCount: { gte: MANY_OFFERS_BASE },
      },
    }),
    prisma.monchisOrderCache.count({
      where: { ...baseOrder, endToEndSeconds: { gt: LONG_E2E_BASE_SEC } },
    }),
    prisma.monchisOrderCache.count({
      where: {
        ...baseOrder,
        acceptanceSeconds: { gt: SLOW_ACCEPT_CRITICAL_SEC },
      },
    }),
    prisma.monchisOrderCache.count({
      where: {
        ...baseOrder,
        offersWithDriverCount: { gte: MANY_OFFERS_CRITICAL },
      },
    }),
    prisma.monchisOrderCache.count({
      where: { ...baseOrder, endToEndSeconds: { gt: LONG_E2E_CRITICAL_SEC } },
    }),
    prisma.onboardingAttendee.count({
      where: {
        status: "NO_SHOW",
        OR: [
          { markedNoShowAt: { gte: noShowSince } },
          { event: { scheduledDate: { gte: noShowSince } } },
        ],
      },
    }),
    prisma.formDocument.count({
      where: { status: "PENDING", uploadedAt: { lt: stuckCutoff } },
    }),
    prisma.formDocument.count({
      where: {
        status: "PENDING",
        uploadedAt: { lt: daysAgo(STUCK_DOC_CRITICAL_DAYS) },
      },
    }),
  ])

  const orderTotal =
    adminChangeCount + slowCount + manyOffersCount + longE2ECount

  // Críticas: contamos solo los buckets que pueden ser críticos.
  // admin_change es siempre "info" por diseño, así que no suma.
  const totalCritical =
    slowCriticalCount +
    manyOffersCriticalCount +
    longE2ECriticalCount +
    stuckDocsCritical

  return {
    orderSignals: {
      total: orderTotal,
      byType: {
        admin_change: adminChangeCount,
        slow_acceptance: slowCount,
        many_offers: manyOffersCount,
        long_e2e: longE2ECount,
      },
    },
    noShowsLast7Days,
    stuckDocs: stuckDocsTotal,
    totalCritical,
  }
}

export async function getAlertsSnapshot(): Promise<{
  counts: AlertsCounts
  orderSignals: OrderSignalAlert[]
  noShows: NoShowAlert[]
  stuckDocs: StuckDocAlert[]
}> {
  const [counts, orderSignals, noShows, stuckDocs] = await Promise.all([
    getAlertsCounts(),
    getOrderSignalAlerts(),
    getNoShowAlerts(),
    getStuckDocAlerts(),
  ])
  return { counts, orderSignals, noShows, stuckDocs }
}
