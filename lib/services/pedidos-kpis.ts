import type {
  MapPoint,
  OrderKpis,
  RawHistoryEntry,
  RawOrder,
} from "@/lib/types/pedidos.types"

function ts(s: string | undefined | null): number | null {
  if (!s) return null
  const d = new Date(s).getTime()
  return isNaN(d) ? null : d
}

function diffSec(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null
  return Math.max(0, Math.round((b - a) / 1000))
}

function findFirstHistory(
  histories: RawHistoryEntry[],
  predicate: (h: RawHistoryEntry) => boolean,
): RawHistoryEntry | null {
  return histories.find(predicate) || null
}

function findLastHistory(
  histories: RawHistoryEntry[],
  predicate: (h: RawHistoryEntry) => boolean,
): RawHistoryEntry | null {
  for (let i = histories.length - 1; i >= 0; i--) {
    if (predicate(histories[i])) return histories[i]
  }
  return null
}

export function computeKpis(order: RawOrder): OrderKpis {
  const histories = order.histories || []

  const firstEvent = histories[0]
  const firstPendingNoDriver = findFirstHistory(
    histories,
    (h) => h.request_state === "PENDING" && (h.drivers_by_id || []).length === 0,
  )
  const firstPendingWithDriver = findFirstHistory(
    histories,
    (h) => h.request_state === "PENDING" && (h.drivers_by_id || []).length > 0,
  )
  const lastPendingWithDriver = findLastHistory(
    histories,
    (h) => h.request_state === "PENDING" && (h.drivers_by_id || []).length > 0,
  )
  const accepted = findFirstHistory(histories, (h) => h.request_state === "ACCEPTED")
  const waitingOrder = findFirstHistory(
    histories,
    (h) => h.request_state === "WAITING_ORDER",
  )
  const delivery = findFirstHistory(histories, (h) => h.request_state === "DELIVERY")
  const finalized = findLastHistory(histories, (h) => h.request_state === "FINALIZED")

  const tConfirmed = ts(order.data_origin?.confirmed_at)
  const tFirstEvent = ts(firstEvent?.date) ?? ts(firstPendingNoDriver?.date)
  const tFirstPendingNoDriver = ts(firstPendingNoDriver?.date) ?? tFirstEvent
  const tFirstPendingWithDriver = ts(firstPendingWithDriver?.date)
  const tLastPendingWithDriver = ts(lastPendingWithDriver?.date)
  const tAccepted = ts(accepted?.date)
  const tWaiting = ts(waitingOrder?.date)
  const tDelivery = ts(delivery?.date)
  const tFinalized = ts(finalized?.date)

  return {
    endToEnd: {
      label: "Tiempo total",
      seconds: diffSec(tConfirmed, tFinalized),
      description: "Desde que el comercio confirmó hasta entregar al cliente",
    },
    prep: {
      label: "Preparación",
      seconds: diffSec(tConfirmed, tFirstPendingNoDriver),
      description: "Pedido en cocina antes de buscar driver",
    },
    matching: {
      label: "Búsqueda de driver",
      seconds: diffSec(tFirstPendingNoDriver, tFirstPendingWithDriver),
      description: "Hasta encontrar un driver dispuesto",
    },
    accepting: {
      label: "Aceptación",
      seconds: diffSec(tLastPendingWithDriver, tAccepted),
      description: "De la oferta enviada hasta aceptar",
    },
    toBranch: {
      label: "Camino al comercio",
      seconds: diffSec(tAccepted, tWaiting),
      description: "El driver aceptó y fue al local",
    },
    atBranch: {
      label: "En el comercio",
      seconds: diffSec(tWaiting, tDelivery),
      description: "El driver esperando para retirar",
    },
    delivery: {
      label: "Entrega",
      seconds: diffSec(tDelivery, tFinalized),
      description: "Camino del comercio al cliente",
    },
  }
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—"
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m`
}

export function buildMapPoints(order: RawOrder): MapPoint[] {
  const points: MapPoint[] = []

  const origin = order.data_origin
  if (origin?.latitude && origin?.longitude) {
    points.push({
      kind: "origin",
      lat: origin.latitude,
      lng: origin.longitude,
      label: origin.name || "Origen",
      state: undefined,
    })
  }

  const dest = order.data_destination
  if (dest?.latitude && dest?.longitude) {
    points.push({
      kind: "destination",
      lat: dest.latitude,
      lng: dest.longitude,
      label: dest.name || "Destino",
    })
  }

  const histories = order.histories || []
  histories.forEach((h, idx) => {
    if (h.latitude == null || h.longitude == null) return
    points.push({
      kind: "history",
      lat: h.latitude,
      lng: h.longitude,
      label: `${idx + 1}. ${h.request_state}`,
      state: h.request_state,
      date: h.date,
      driverNames: h.drivers_by_name || [],
      index: idx + 1,
      hasDriver: (h.drivers_by_id || []).length > 0,
      adminChangedState: h.admin_changed_state ?? null,
      prevDate: idx > 0 ? histories[idx - 1].date : null,
    })
  })

  return points
}
