import "server-only"

import { prisma } from "@/lib/prisma"
import type { DepartureEventType } from "@/lib/services/driver-departure.service"

// Lectura de eventos de salida sin acción para /admin/gestion/anomalias.

export interface DepartureEventRow {
  id: number
  type: DepartureEventType
  requestId: string
  externalOrderId: string | null
  driverId: string
  driverName: string | null
  branchName: string | null
  placeName: string | null
  zoneName: string | null
  stateAtEvent: string
  arrivedAt: Date
  leftAt: Date
  detectedAt: Date
  dwellSeconds: number
  distanceAtDetectionM: number
  otherPlaceDistanceM: number | null
  // Join manual con MonchisOrderCache: estado actual de la orden (para ver si
  // el driver marcó la acción después del evento).
  currentStatus: string | null
  finalizedAt: Date | null
}

export async function searchDepartureEvents(opts: {
  from?: Date | null
  to?: Date | null
  type?: DepartureEventType | null
  page: number
  pageSize: number
}): Promise<{ rows: DepartureEventRow[]; total: number }> {
  const where = {
    ...(opts.from || opts.to
      ? {
          detectedAt: {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          },
        }
      : {}),
    ...(opts.type ? { type: opts.type } : {}),
  }

  const [events, total] = await Promise.all([
    prisma.driverDepartureEvent.findMany({
      where,
      orderBy: { detectedAt: "desc" },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
    }),
    prisma.driverDepartureEvent.count({ where }),
  ])

  const requestIds = [...new Set(events.map((e) => e.requestId))]
  const cached =
    requestIds.length > 0
      ? await prisma.monchisOrderCache.findMany({
          where: { requestId: { in: requestIds } },
          select: { requestId: true, status: true, finalizedAt: true },
        })
      : []
  const cacheById = new Map(cached.map((c) => [c.requestId, c]))

  const rows: DepartureEventRow[] = events.map((e) => {
    const c = cacheById.get(e.requestId)
    return {
      ...e,
      type: e.type as DepartureEventType,
      currentStatus: c?.status ?? null,
      finalizedAt: c?.finalizedAt ?? null,
    }
  })

  return { rows, total }
}
