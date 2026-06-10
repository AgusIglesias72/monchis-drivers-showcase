// app/admin/gestion/anomalias/page.tsx
//
// Lista de "salidas sin acción": eventos detectados por el cron
// collect-live-orders donde un driver llegó a un lugar (comercio o cliente)
// y se fue sin marcar el cambio de estado esperado.

import { AnomaliasContent } from "@/components/admin/gestion/anomalias-content"
import { searchDepartureEvents } from "@/lib/services/driver-departures-read.service"
import type { DepartureEventType } from "@/lib/services/driver-departure.service"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 50

interface PageProps {
  searchParams: Promise<{
    type?: string
    from?: string
    to?: string
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

const TYPE_BY_PARAM: Record<string, DepartureEventType> = {
  origin: "LEFT_ORIGIN_WITHOUT_DELIVERY",
  dest: "LEFT_DESTINATION_WITHOUT_FINALIZE",
}

export default async function AnomaliasPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const typeParam = sp.type && TYPE_BY_PARAM[sp.type] ? sp.type : "all"
  const page = Math.max(1, Number(sp.page) || 1)
  const from = parseDateOrNull(sp.from)
  const to = parseDateOrNull(sp.to, true)

  const { rows, total } = await searchDepartureEvents({
    from,
    to,
    type: typeParam === "all" ? null : TYPE_BY_PARAM[typeParam],
    page,
    pageSize: PAGE_SIZE,
  })

  return (
    <AnomaliasContent
      rows={rows.map((r) => ({
        id: r.id,
        type: r.type,
        requestId: r.requestId,
        externalOrderId: r.externalOrderId,
        driverName: r.driverName,
        placeName: r.placeName,
        zoneName: r.zoneName,
        stateAtEvent: r.stateAtEvent,
        leftAt: r.leftAt.toISOString(),
        detectedAt: r.detectedAt.toISOString(),
        dwellSeconds: r.dwellSeconds,
        distanceAtDetectionM: r.distanceAtDetectionM,
        otherPlaceDistanceM: r.otherPlaceDistanceM,
        currentStatus: r.currentStatus,
      }))}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      filters={{
        type: typeParam,
        from: sp.from || "",
        to: sp.to || "",
      }}
    />
  )
}
