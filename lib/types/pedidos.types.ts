export type RequestState =
  | "PENDING"
  | "ACCEPTED"
  | "WAITING_ORDER"
  | "DELIVERY"
  | "OUTSIDE"
  | "FINALIZED"
  | "CANCELLED"
  | string

// admin_changed_state llega como objeto {admin: email, reason, admin_id} en
// los datos reales (el string suelto no se observó nunca, pero lo toleramos).
export type RawAdminChangedState =
  | string
  | { admin?: string | null; reason?: string | null; admin_id?: string | null }

export interface RawHistoryEntry {
  date: string
  request_state: RequestState
  latitude: number | null
  longitude: number | null
  drivers_by_id?: string[]
  drivers_by_name?: string[]
  admin_changed_state?: RawAdminChangedState | null
}

export interface RawLocation {
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

export interface RawOrderItem {
  quantity: number
  name: string
  checked?: boolean
}

export interface RawOrder {
  _id: string
  external_order_id?: string
  items?: RawOrderItem[]
  payment_type?: string
  invoice?: { ruc?: string | null; razon_social?: string | null }
  data_origin?: RawLocation
  data_destination?: RawLocation
  arriving_time_origin?: string
  driver_request_state?: RequestState
  driver_id?: string
  total_order?: string
  order_comment?: string
  histories?: RawHistoryEntry[]
}

export interface KpiValue {
  label: string
  seconds: number | null
  description?: string
}

export interface OrderKpis {
  endToEnd: KpiValue
  prep: KpiValue
  accepting: KpiValue
  toBranch: KpiValue
  atBranch: KpiValue
  delivery: KpiValue
  outside: KpiValue
}

export interface MapPoint {
  kind: "origin" | "destination" | "history"
  lat: number
  lng: number
  label: string
  state?: RequestState
  date?: string
  driverNames?: string[]
  index?: number
  hasDriver?: boolean
  adminChangedState?: string | null
  prevDate?: string | null
}

export type FetchSource = "api" | "cache"

export interface OrderFetchResult {
  order: RawOrder
  fetchedAt: Date
  source: FetchSource
}

// ===== Driver attendance =====

export interface RawAttendanceRequest {
  external_order_id: string
  request_date_time: string
  branch: string
  accepted: string
  reason?: string
  request_state: RequestState
}

export interface RawAttendance {
  zone: string
  day: string
  turn: string
  turn_entry_time: string
  turn_exit_time: string
  driver_entry_time: string
  driver_exit_time: string
  driver_exit_reason: string
  request_qty: number
  requests: RawAttendanceRequest[]
}

export interface AttendanceFetchResult {
  attendances: RawAttendance[]
  fetchedAt: Date
  error?: string
}
