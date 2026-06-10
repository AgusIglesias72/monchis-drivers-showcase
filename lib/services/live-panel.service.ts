import "server-only"

import { LIVE_PANEL_CONFIG } from "@/lib/config/live-panel.config"
import { prisma } from "@/lib/prisma"
import { detectDriverDepartures } from "@/lib/services/driver-departure.service"
import { enqueueOrderImports } from "@/lib/services/pedidos-import-queue.service"
import { pyLocalIsoToRealIso } from "@/lib/utils/pedidos-time"
import type {
  LiveDriver,
  LivePanelPayload,
  LiveRequest,
  LiveSummary,
  LiveZone,
  RawDelayedRequest,
  RawDriverStatus,
  RawLatLng,
  RawPendingRequest,
  RawZoneStatus,
} from "@/lib/types/live-panel.types"

interface FetchOk<T> {
  ok: true
  data: T
}
interface FetchErr {
  ok: false
  source: string
  message: string
}

async function fetchJson<T>(
  source: string,
  url: string,
): Promise<FetchOk<T> | FetchErr> {
  if (!LIVE_PANEL_CONFIG.token) {
    return { ok: false, source, message: "MONCHIS_DRIVERS_API_TOKEN no configurado" }
  }
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), LIVE_PANEL_CONFIG.fetchTimeoutMs)
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: LIVE_PANEL_CONFIG.token,
      },
      cache: "no-store",
      signal: ctrl.signal,
    })
    if (!res.ok) {
      return { ok: false, source, message: `HTTP ${res.status}` }
    }
    const json = (await res.json()) as { data?: T; success?: boolean; message?: string }
    if (json.success === false) {
      return { ok: false, source, message: json.message || "success:false" }
    }
    return { ok: true, data: (json.data ?? ([] as unknown as T)) }
  } catch (err) {
    return {
      ok: false,
      source,
      message: err instanceof Error ? err.message : "Error desconocido",
    }
  } finally {
    clearTimeout(t)
  }
}

// ----------------------------------------------------------------------------
// Normalización
// ----------------------------------------------------------------------------

function pickLatLng(loc: RawLatLng | undefined): { lat: number; lng: number } | null {
  if (!loc) return null
  const fromPoint = loc.point?.coordinates
  if (fromPoint && fromPoint.length === 2) {
    const [lng, lat] = fromPoint
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng }
  }
  if (typeof loc.latitude === "number" && typeof loc.longitude === "number") {
    return { lat: loc.latitude, lng: loc.longitude }
  }
  return null
}

function normalizeRequest(
  raw: RawPendingRequest | RawDelayedRequest,
): LiveRequest {
  const o = pickLatLng(raw.data_origin)
  const d = pickLatLng(raw.data_destination)
  return {
    requestId: raw._id,
    externalOrderId: raw.external_order_id ?? null,
    state: raw.driver_request_state ?? null,
    origin: o
      ? {
          ...o,
          name: raw.data_origin?.name ?? "",
          address: raw.data_origin?.address ?? "",
        }
      : null,
    destination: d
      ? {
          ...d,
          name: raw.data_destination?.name ?? "",
          address: raw.data_destination?.address ?? "",
        }
      : null,
    // confirmed_at y arriving_time_origin vienen con sufijo Z mal etiquetado
    // (wall-clock es PY/UTC-3). Lo corregimos al instante UTC real para que
    // el cliente compare con Date.now() sin extra lógica.
    confirmedAt: pyLocalIsoToRealIso(raw.data_origin?.confirmed_at),
    createdAt: raw.createdAt ?? null, // este sí viene en UTC real
    // Para PENDING: tiempo en estado = desde que entró al pool de búsqueda.
    currentStateSince: raw.createdAt ?? null,
    arrivingTimeOrigin:
      "arriving_time_origin" in raw
        ? pyLocalIsoToRealIso(raw.arriving_time_origin)
        : null,
    timeStatus: raw.time_status ?? null,
    branchId: raw.data_origin?.branch_id ?? null,
    driverId: null,
    driverName: null,
    driverPhone: null,
    zoneId: null,
    zoneName: null,
    zoneColor: null,
    totalOrder: null,
    paymentType: null,
    isDelayed: false,
  }
}

// Pedidos activos: extraídos de drivers_status[].active_requests[].
// Aprovechamos para vincular driverId/driverName y zona del pedido.
function buildActiveFromDrivers(rawDrivers: RawDriverStatus[]): LiveRequest[] {
  const out: LiveRequest[] = []
  const seen = new Set<string>()
  for (const drv of rawDrivers) {
    if (drv.isMock) continue
    const driverName = `${(drv.first_name || "").trim()} ${(drv.last_name || "").trim()}`
      .replace(/\s+/g, " ")
      .trim()
    for (const r of drv.active_requests || []) {
      if (!r._id || seen.has(r._id)) continue
      seen.add(r._id)
      const o = pickLatLng(r.data_origin)
      const d = pickLatLng(r.data_destination)
      out.push({
        requestId: r._id,
        externalOrderId: r.external_order_id ?? null,
        state: r.driver_request_state ?? null,
        origin: o
          ? {
              ...o,
              name: r.data_origin?.name ?? "",
              address: r.data_origin?.address ?? "",
            }
          : null,
        destination: d
          ? {
              ...d,
              name: r.data_destination?.name ?? "",
              address: r.data_destination?.address ?? "",
            }
          : null,
        confirmedAt: pyLocalIsoToRealIso(r.data_origin?.confirmed_at),
        // En active_requests dentro de drivers_status, createdAt también
        // viene PY-mislabeled (distinto a pending_requests top-level).
        createdAt: pyLocalIsoToRealIso(r.createdAt),
        // updatedAt es UTC real y aproxima la última transición de estado.
        // Si no viene, fallback a request_is_taken (cuando driver aceptó).
        currentStateSince: r.updatedAt ?? r.request_is_taken ?? null,
        arrivingTimeOrigin: pyLocalIsoToRealIso(r.arriving_time_origin),
        timeStatus: r.time_status ?? null,
        branchId: r.data_origin?.branch_id ?? null,
        driverId: drv._id,
        driverName: driverName || drv._id,
        driverPhone: drv.contact?.phone ?? null,
        zoneId: r.zone_id ?? null,
        zoneName: r.zone_name ?? null,
        zoneColor: r.zone_color ?? null,
        totalOrder: r.total_order ?? null,
        paymentType: r.payment_type ?? null,
        isDelayed: !!r.delayed,
      })
    }
  }
  return out
}

function normalizeDriver(raw: RawDriverStatus): LiveDriver {
  const coords = raw.position?.coordinates
  let position: { lat: number; lng: number } | null = null
  if (coords && coords.length === 2) {
    const [lng, lat] = coords
    if (typeof lat === "number" && typeof lng === "number") {
      position = { lat, lng }
    }
  }
  const active = raw.active_requests || []
  const pending = raw.pending_requests || []
  const fullName = `${(raw.first_name || "").trim()} ${(raw.last_name || "").trim()}`
    .replace(/\s+/g, " ")
    .trim()

  // Cuando un driver tiene un active_request, derivamos su zone del request si
  // viene poblada (es la zona del pedido); si no, usamos la zona base del
  // driver. Esto preserva consistencia con el mapa.
  const firstActive = active[0]
  const zoneId = firstActive?.zone_id ?? null
  const zoneName = firstActive?.zone_name ?? raw.zone_name ?? null
  const zoneColor = firstActive?.zone_color ?? raw.zone_color ?? null

  return {
    driverId: raw._id,
    fullName: fullName || raw._id,
    phone: raw.contact?.phone ?? null,
    available: !!raw.available,
    position,
    zoneId,
    zoneName,
    zoneColor,
    activeRequestIds: active.map((r) => r._id).filter(Boolean),
    pendingRequestIds: pending.map((r) => r._id).filter(Boolean),
    hasActive: active.length > 0,
  }
}

function clampWarning(s: string | undefined): "default" | "yellow" | "red" {
  return s === "yellow" || s === "red" ? s : "default"
}

function normalizeZone(raw: RawZoneStatus): LiveZone {
  const numericKpi = Number(raw.kpi)
  // La API entrega coords como [[[lng,lat], ...]]; tomamos el anillo externo
  // y lo convertimos a [lat, lng] para Leaflet.
  let polygon: [number, number][] | null = null
  const ring = raw.coordinates?.[0]
  if (ring && ring.length > 0) {
    polygon = ring
      .map((p): [number, number] | null => {
        if (!Array.isArray(p) || p.length < 2) return null
        const [lng, lat] = p
        if (typeof lat !== "number" || typeof lng !== "number") return null
        return [lat, lng]
      })
      .filter((p): p is [number, number] => p !== null)
  }

  return {
    zoneId: raw.zone_id,
    zoneName: raw.zone,
    zoneColor: raw.zone_color || "#888",
    totalDrivers: raw.total_drivers ?? 0,
    availableDrivers: raw.available_drivers ?? 0,
    activeRequests: raw.active_requests ?? 0,
    pendingRequests: raw.pending_requests ?? 0,
    orderWithoutDriver: raw.order_without_driver ?? 0,
    totalRequest: raw.total_request ?? 0,
    kpi: isNaN(numericKpi) ? 0 : numericKpi,
    warningKpi: clampWarning(raw.warning_kpi),
    warningDriversConnections: clampWarning(raw.warning_drivers_conections),
    requestsDelayed: raw.requests_delayed ?? 0,
    polygon,
  }
}

function buildSummary(
  pending: LiveRequest[],
  delayed: LiveRequest[],
  active: LiveRequest[],
  drivers: LiveDriver[],
  zones: LiveZone[],
): LiveSummary {
  const driversAvailable = drivers.filter((d) => d.available).length
  const driversBusy = drivers.filter((d) => d.hasActive).length
  const zonesAlertCount = zones.filter((z) => z.warningKpi !== "default").length
  return {
    driversTotal: drivers.length,
    driversAvailable,
    driversBusy,
    pendingCount: pending.length,
    delayedCount: delayed.length,
    activeCount: active.length,
    zonesAlertCount,
  }
}

// ----------------------------------------------------------------------------
// Captura de requestIds → cola
// ----------------------------------------------------------------------------

function collectAllRequestIds(
  pending: LiveRequest[],
  delayed: LiveRequest[],
  drivers: LiveDriver[],
): string[] {
  const set = new Set<string>()
  for (const r of pending) set.add(r.requestId)
  for (const r of delayed) set.add(r.requestId)
  for (const d of drivers) {
    for (const id of d.activeRequestIds) set.add(id)
    for (const id of d.pendingRequestIds) set.add(id)
  }
  return [...set]
}

// ----------------------------------------------------------------------------
// Fetch + normalización compartida (consumida por el panel y por el cron de
// captura). Hace las 4 llamadas a la API legacy, normaliza y ordena.
// ----------------------------------------------------------------------------

interface LiveData {
  pending: LiveRequest[]
  delayed: LiveRequest[]
  active: LiveRequest[]
  drivers: LiveDriver[]
  zones: LiveZone[]
  errors: { source: string; message: string }[]
}

async function collectLiveData(): Promise<LiveData> {
  const e = LIVE_PANEL_CONFIG.endpoints

  const [pendingRes, delayedRes, driversRes, zonesRes] = await Promise.all([
    fetchJson<RawPendingRequest[]>("pending_requests", e.pendingRequests),
    fetchJson<RawDelayedRequest[]>("delayed_requests", e.delayedRequests),
    fetchJson<RawDriverStatus[]>("drivers_status", e.driversStatus),
    fetchJson<RawZoneStatus[]>("zones_status", e.zonesStatus),
  ])

  const errors: { source: string; message: string }[] = []
  for (const r of [pendingRes, delayedRes, driversRes, zonesRes]) {
    if (!r.ok) errors.push({ source: r.source, message: r.message })
  }

  const pending = pendingRes.ok ? pendingRes.data.map(normalizeRequest) : []
  const delayed = delayedRes.ok ? delayedRes.data.map(normalizeRequest) : []
  const drivers = driversRes.ok
    ? driversRes.data.filter((d) => !d.isMock).map(normalizeDriver)
    : []
  const active = driversRes.ok ? buildActiveFromDrivers(driversRes.data) : []
  const zones = zonesRes.ok ? zonesRes.data.map(normalizeZone) : []

  // Orden estable: por timeStatus/isDelayed desc cuando aplica.
  pending.sort((a, b) => (b.timeStatus ?? 0) - (a.timeStatus ?? 0))
  delayed.sort((a, b) => (b.timeStatus ?? 0) - (a.timeStatus ?? 0))
  active.sort((a, b) => {
    if (a.isDelayed !== b.isDelayed) return a.isDelayed ? -1 : 1
    return (b.timeStatus ?? 0) - (a.timeStatus ?? 0)
  })
  zones.sort((a, b) => a.zoneName.localeCompare(b.zoneName, "es"))
  drivers.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1
    return a.fullName.localeCompare(b.fullName, "es")
  })

  return { pending, delayed, active, drivers, zones, errors }
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export async function fetchLivePanel(
  options: { enqueue?: boolean } = {},
): Promise<LivePanelPayload> {
  const { enqueue = true } = options
  const { pending, delayed, active, drivers, zones, errors } =
    await collectLiveData()

  let enqueued = 0
  if (enqueue) {
    const ids = collectAllRequestIds(pending, delayed, drivers)
    if (ids.length > 0) {
      try {
        const result = await enqueueOrderImports(ids)
        enqueued = result.inserted
      } catch (err) {
        // Fire-and-forget: si la cola falla, el panel sigue funcionando.
        console.error("[live-panel] enqueue error:", err)
      }
    }
  }

  return {
    fetchedAt: new Date().toISOString(),
    pending,
    delayed,
    active,
    drivers,
    zones,
    summary: buildSummary(pending, delayed, active, drivers, zones),
    errors,
    enqueued,
  }
}

// ----------------------------------------------------------------------------
// Captura autónoma (cron). Independiente de que alguien tenga el panel abierto:
// consulta los endpoints live server-side, encola los requestIds nuevos y deja
// un snapshot en LiveCaptureRun para observabilidad/cobertura.
// ----------------------------------------------------------------------------

export interface CaptureLiveOrdersResult {
  fetchedAt: string
  pendingCount: number
  delayedCount: number
  activeCount: number
  idsSeen: number
  idsNewEnqueued: number
  zonesTotalRequest: number
  departures: { tracked: number; samples: number; eventsCreated: number }
  errors: { source: string; message: string }[]
  allEndpointsFailed: boolean
  durationMs: number
}

export async function captureLiveOrders(): Promise<CaptureLiveOrdersResult> {
  const start = Date.now()
  const { pending, delayed, active, drivers, zones, errors } =
    await collectLiveData()

  // Las 4 rutas fallaron → captura inútil (token vencido / API caída).
  const allEndpointsFailed = errors.length >= 4

  const ids = collectAllRequestIds(pending, delayed, drivers)
  let idsNewEnqueued = 0
  if (ids.length > 0) {
    try {
      const result = await enqueueOrderImports(ids)
      idsNewEnqueued = result.inserted
    } catch (err) {
      console.error("[capture-live] enqueue error:", err)
    }
  }

  // Detección de salidas sin acción (driver se va sin marcar estado).
  // Fail-safe: si falla, la captura sigue. Solo corre acá (cadencia 1/min del
  // cron); fetchLivePanel() NO la llama para no acelerar los streaks cuando
  // alguien tiene el panel abierto.
  let departures = { tracked: 0, samples: 0, eventsCreated: 0 }
  try {
    departures = await detectDriverDepartures(active, drivers)
  } catch (err) {
    console.error("[capture-live] departure detection error:", err)
  }

  const zonesTotalRequest = zones.reduce(
    (sum, z) => sum + (z.totalRequest || 0),
    0,
  )

  const fetchedAt = new Date().toISOString()
  const durationMs = Date.now() - start

  // Snapshot de cobertura. No rompemos la captura si el insert falla.
  try {
    await prisma.liveCaptureRun.create({
      data: {
        pendingCount: pending.length,
        delayedCount: delayed.length,
        activeCount: active.length,
        idsSeen: ids.length,
        idsNewEnqueued,
        zonesTotalRequest,
        errors: errors.length > 0 ? errors : undefined,
        durationMs,
      },
    })
  } catch (err) {
    console.error("[capture-live] error guardando LiveCaptureRun:", err)
  }

  return {
    fetchedAt,
    pendingCount: pending.length,
    delayedCount: delayed.length,
    activeCount: active.length,
    idsSeen: ids.length,
    idsNewEnqueued,
    zonesTotalRequest,
    departures,
    errors,
    allEndpointsFailed,
    durationMs,
  }
}
