// lib/types/live-panel.types.ts
//
// Tipos del panel "Live" de Gestión Admin. Agrega 4 endpoints de la API legacy:
//   GET /dashboard/pending_requests
//   GET /dashboard/delayed_requests
//   GET /dashboard/drivers_status
//   GET /admin/zones_status

import type { RequestState } from "@/lib/types/pedidos.types"

// ============================================================================
// Raw shapes — lo que devuelve la API legacy. Lo mantenemos opcional por todos
// lados porque la API es errática.
// ============================================================================

export interface RawLatLng {
  latitude?: number
  longitude?: number
  name?: string
  address?: string
  phone_number?: string
  reference?: string
  branch_id?: number
  confirmed_at?: string
  preptime?: number
  point?: { coordinates?: [number, number]; type?: string }
}

export interface RawPendingRequest {
  _id: string
  external_order_id?: string
  data_origin?: RawLatLng
  data_destination?: RawLatLng
  driver_request_state?: RequestState
  createdAt?: string
  historieCretedAt?: string // sic — typo de la API
  time_status?: number // counter (minutos)
}

export interface RawDelayedRequest extends RawPendingRequest {
  arriving_time_origin?: string
}

export interface RawDriverActiveRequest {
  _id: string
  external_order_id?: string
  driver_request_state?: RequestState
  data_origin?: RawLatLng & { phone_number?: string }
  data_destination?: RawLatLng & { phone_number?: string }
  total_order?: string
  payment_type?: string
  zone_name?: string
  zone_id?: string
  zone_color?: string
  arriving_time_origin?: string
  createdAt?: string
  updatedAt?: string // UTC real, lo usamos como proxy de "tiempo en estado"
  request_is_taken?: string
  delayed?: boolean
  time_status?: number
}

export interface RawDriverStatus {
  _id: string
  available?: boolean
  isMock?: boolean
  first_name?: string
  last_name?: string
  contact?: { phone?: string; email?: string }
  position?: {
    coordinates?: [number, number] // [lng, lat]
    type?: string
  }
  zone_name?: string
  zone_color?: string
  active_requests?: RawDriverActiveRequest[]
  pending_requests?: RawDriverActiveRequest[]
}

export interface RawZoneStatus {
  zone: string
  zone_id: string
  zone_color: string
  total_drivers: number
  available_drivers: number
  active_requests: number
  pending_requests: number
  order_without_driver: number
  total_request: number
  kpi: string
  warning_kpi: "default" | "yellow" | "red" | string
  warning_drivers_conections: "default" | "yellow" | "red" | string
  requests_delayed: number
  coordinates?: number[][][] // [[[lng,lat], ...]] (GeoJSON Polygon)
}

// ============================================================================
// Normalized shapes — lo que consume la UI.
// ============================================================================

export interface LiveRequest {
  requestId: string
  externalOrderId: string | null
  state: RequestState | null
  origin: { lat: number; lng: number; name: string; address: string } | null
  destination: { lat: number; lng: number; name: string; address: string } | null
  confirmedAt: string | null
  createdAt: string | null
  // ISO UTC real desde que el pedido entró al estado actual. Para PENDING
  // sin driver es createdAt (cuando arrancó la búsqueda). Para los demás
  // estados es updatedAt (proxy de "última transición de estado").
  currentStateSince: string | null
  arrivingTimeOrigin: string | null
  timeStatus: number | null
  branchId: number | null
  // Sólo poblados para pedidos activos (los extraemos de drivers_status):
  driverId: string | null
  driverName: string | null
  driverPhone: string | null
  zoneId: string | null
  zoneName: string | null
  zoneColor: string | null
  totalOrder: string | null
  paymentType: string | null
  isDelayed: boolean
}

export interface LiveDriver {
  driverId: string
  fullName: string
  phone: string | null
  available: boolean
  position: { lat: number; lng: number } | null
  zoneId: string | null
  zoneName: string | null
  zoneColor: string | null
  activeRequestIds: string[]
  pendingRequestIds: string[]
  // Ratio resumido para el sidebar
  hasActive: boolean
}

export interface LiveZone {
  zoneId: string
  zoneName: string
  zoneColor: string
  totalDrivers: number
  availableDrivers: number
  activeRequests: number
  pendingRequests: number
  orderWithoutDriver: number
  totalRequest: number
  kpi: number // numérico parseado (ej "0.0" -> 0)
  warningKpi: "default" | "yellow" | "red"
  warningDriversConnections: "default" | "yellow" | "red"
  requestsDelayed: number
  // GeoJSON-friendly: [[lat, lng], ...] (Leaflet usa [lat, lng], la API entrega [lng, lat])
  polygon: [number, number][] | null
}

export interface LiveSummary {
  driversTotal: number
  driversAvailable: number
  driversBusy: number
  pendingCount: number
  delayedCount: number
  activeCount: number
  zonesAlertCount: number // zonas con warning_kpi != default
}

// Comercios — agregación derivada de pending+active+delayed por branchId. No
// se persiste; se reconstruye en el cliente cada poll a partir de LivePanelPayload.
export interface LiveCommerce {
  branchId: number
  name: string
  location: { lat: number; lng: number } | null
  zoneName: string | null
  zoneColor: string | null
  totalActive: number
  // Conteo por estado de pedidos en curso (PENDING/ACCEPTED/WAITING_ORDER/DELIVERY/OUTSIDE)
  countByState: Record<string, number>
  // Demora máxima (en seg) entre todos los pedidos activos — currentStateSince → now
  maxStateAgeSeconds: number | null
  // RequestIds incluidos, ordenados por demora desc (los más viejos primero)
  requestIds: string[]
  drivers: { driverId: string; driverName: string }[]
  pendingNoDriverCount: number
  delayedCount: number
  hasAlert: boolean
}

export interface LivePanelPayload {
  fetchedAt: string
  pending: LiveRequest[]
  delayed: LiveRequest[]
  active: LiveRequest[] // todos los pedidos en curso (con driver asignado)
  drivers: LiveDriver[]
  zones: LiveZone[]
  summary: LiveSummary
  errors: { source: string; message: string }[]
  enqueued: number // requestIds nuevos sumados a la cola en este poll
}

// Ruta histórica de un pedido (sólo origen/destino + polyline) para overlay
// en el mapa live cuando el admin clickea un pedido.
export interface LiveRoutePoint {
  lat: number
  lng: number
  state: string
  date: string
  index: number
  hasDriver: boolean
}

export interface LiveRoute {
  requestId: string
  origin: { lat: number; lng: number; name: string } | null
  destination: { lat: number; lng: number; name: string } | null
  history: LiveRoutePoint[]
  fetchedAt: string
}
