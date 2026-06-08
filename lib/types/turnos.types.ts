export type PaymentType = "guaranteed" | "per-order"

export type Metric =
  | "drivers"
  | "occupancy"
  | "active-shifts"
  | "person-hours"

export interface RawDriver {
  first_name?: string
  last_name?: string
}

export interface RawShift {
  _id: string
  zone_id: string
  zone_name: string
  date?: string
  available_time?: {
    from?: string
    to?: string
    available_time_name?: string
  }
  driver_id?: string[]
  drivers?: RawDriver[]
  max_drivers?: number
  percentage_of_hour_compliance?: number
  enabled?: boolean
}

export interface FlattenedShift {
  shiftId: string
  zoneId: string
  zoneName: string
  shiftName: string
  dateIso: string
  dayName: string
  fromHour: number | null
  toHour: number | null
  driversAssigned: number
  maxDrivers: number
  occupancyPct: number
  paymentType: PaymentType
  pctHourCompliance: number
  enabled: boolean
  driverNames: string[]
  driverIds: string[]
}

export interface FetchResult {
  shifts: FlattenedShift[]
  fetchedAt: Date
  errors: { zoneId: string; message: string }[]
}

export interface CellMetric {
  display: string
  numeric: number
  intensity: number
  hasGuaranteed: boolean
  hasPerOrder: boolean
  full: boolean
  shiftCount: number
}

export interface KpiSummary {
  totalAssigned: number
  totalMax: number
  occupancyPct: number
  activeShifts: number
  zonesWithLowOccupancy: number
}

export interface HourlyAggregate {
  hour: number
  label: string
  assigned: number
  max: number
}

export const METRIC_LABELS: Record<Metric, string> = {
  drivers: "Drivers / Max",
  occupancy: "% Ocupación",
  "active-shifts": "# Turnos activos",
  "person-hours": "Horas-persona / máx",
}

// ---------- Comparación con semanas anteriores ----------

export type CompareMode = "final" | "runrate"

export interface CompareCell {
  assigned: number
  max: number
}

export interface ComparisonData {
  mode: CompareMode
  weeksBack: number
  comparisonDate: string // YYYY-MM-DD (día comparado)
  capturedAtIso: string | null // foto usada como referencia (para etiqueta)
  cells: Record<string, Record<number, CompareCell>> // zoneName → hour → cell
  totalsByZone: Record<string, CompareCell> // para la columna "Total día" del heatmap
  totals: { assigned: number; max: number } // KPIs
  shiftCount: number
  hasData: boolean
}
