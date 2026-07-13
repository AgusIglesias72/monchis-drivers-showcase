// app/admin/gestion/pedidos/[requestId]/page.tsx

import { notFound } from "next/navigation"

import { PedidoDetailContent } from "@/components/admin/gestion/pedido-detail-content"
import { REQUEST_ID_REGEX } from "@/lib/config/pedidos.config"
import { fetchDriverAttendance } from "@/lib/services/pedidos-driver-attendance.service"
import {
  PedidoLookupError,
  getOrderByRequestId,
} from "@/lib/services/pedidos.service"

interface PageProps {
  params: Promise<{ requestId: string }>
}

export const dynamic = "force-dynamic"

export default async function PedidoDetailPage({ params }: PageProps) {
  const { requestId } = await params

  if (!REQUEST_ID_REGEX.test(requestId)) {
    notFound()
  }

  let order
  let source: "api" | "cache"
  let fetchedAtIso: string

  try {
    const result = await getOrderByRequestId(requestId)
    order = result.order
    source = result.source
    fetchedAtIso = result.fetchedAt.toISOString()
  } catch (err) {
    if (err instanceof PedidoLookupError && err.code === "NOT_FOUND") {
      notFound()
    }
    return (
      <PedidoDetailContent
        requestId={requestId}
        error={
          err instanceof PedidoLookupError
            ? err.message
            : "Error inesperado al traer el pedido"
        }
      />
    )
  }

  // Para el segundo endpoint necesitamos el driver_id y la fecha del pedido
  const driverId = order.driver_id || extractDriverIdFromHistories(order)
  const dayIso = (
    order.data_origin?.confirmed_at ||
    order.histories?.[0]?.date ||
    ""
  ).slice(0, 10)

  let attendance: Awaited<ReturnType<typeof fetchDriverAttendance>> | null = null
  if (driverId && dayIso) {
    attendance = await fetchDriverAttendance(driverId, dayIso)
  }

  return (
    <PedidoDetailContent
      requestId={requestId}
      order={order}
      source={source}
      fetchedAtIso={fetchedAtIso}
      attendance={attendance}
    />
  )
}

function extractDriverIdFromHistories(order: {
  histories?: { drivers_by_id?: string[] }[]
}): string | null {
  const histories = order.histories || []
  for (let i = histories.length - 1; i >= 0; i--) {
    const ids = histories[i].drivers_by_id || []
    if (ids.length > 0) return ids[0]
  }
  return null
}
