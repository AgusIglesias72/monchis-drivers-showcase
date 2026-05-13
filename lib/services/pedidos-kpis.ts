import type {
  MapPoint,
  OrderKpis,
  RawHistoryEntry,
  RawOrder,
} from "@/lib/types/pedidos.types"
import { parseApiInstant } from "@/lib/utils/pedidos-time"

const ts = parseApiInstant

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

  const firstPending = findFirstHistory(
    histories,
    (h) => h.request_state === "PENDING",
  )
  const firstPendingNoDriver = findFirstHistory(
    histories,
    (h) => h.request_state === "PENDING" && (h.drivers_by_id || []).length === 0,
  )
  const accepted = findFirstHistory(histories, (h) => h.request_state === "ACCEPTED")
  const waitingOrder = findFirstHistory(
    histories,
    (h) => h.request_state === "WAITING_ORDER",
  )
  const delivery = findFirstHistory(histories, (h) => h.request_state === "DELIVERY")
  const outside = findFirstHistory(
    histories,
    (h) => h.request_state === "OUTSIDE",
  )
  const finalized = findLastHistory(histories, (h) => h.request_state === "FINALIZED")

  const tConfirmed = ts(order.data_origin?.confirmed_at)
  const tFirstPending = ts(firstPending?.date)
  // El "primer evento que cuenta" para preparación es el primer PENDING sin
  // driver, o si no existió, el primer PENDING en general.
  const tFirstPendingNoDriver =
    ts(firstPendingNoDriver?.date) ?? tFirstPending
  const tAccepted = ts(accepted?.date)
  const tWaiting = ts(waitingOrder?.date)
  const tDelivery = ts(delivery?.date)
  const tOutside = ts(outside?.date)
  const tFinalized = ts(finalized?.date)

  return {
    endToEnd: {
      label: "Tiempo total",
      seconds: diffSec(tConfirmed, tFinalized),
      description:
        "Tiempo desde que el comercio confirmó el pedido hasta la entrega al cliente",
    },
    prep: {
      label: "Preparación",
      seconds: diffSec(tConfirmed, tFirstPendingNoDriver),
      description: "Pedido en cocina antes de buscar driver",
    },
    accepting: {
      label: "Aceptación",
      seconds: diffSec(tFirstPending, tAccepted),
      description:
        "Desde la primera oferta enviada hasta que un driver acepta el pedido",
    },
    toBranch: {
      label: "Camino al comercio",
      seconds: diffSec(tAccepted, tWaiting),
      description: "El driver aceptó y va camino al local",
    },
    atBranch: {
      label: "Esperando orden",
      seconds: diffSec(tWaiting, tDelivery),
      description: "El driver esperando en el comercio para retirar",
    },
    delivery: {
      label: "Camino al cliente",
      seconds: diffSec(tDelivery, tOutside ?? tFinalized),
      description: "El driver salió del comercio rumbo al cliente",
    },
    outside: {
      label: "Afuera",
      seconds: diffSec(tOutside, tFinalized),
      description: "Driver en zona del cliente hasta completar la entrega",
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
