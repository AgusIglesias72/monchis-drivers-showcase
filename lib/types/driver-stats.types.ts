// Types y constantes compartidas entre el service (server) y los componentes
// (client) — separados del .service.ts porque ese tiene `import "server-only"`.

export const HEATMAP_HOURS = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
]
export const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export interface WeekdayBreakdown {
  /** ISO weekday: 1=Lun .. 7=Dom */
  iso: number
  label: string
  sessions: number
  hoursWorked: number
  ordersCount: number
}

export interface DriverStatsFilters {
  zone?: string
  turn?: string
}

export interface OrdersByDayPoint {
  day: string // "YYYY-MM-DD"
  accepted: number
  notTaken: number
  total: number
}

export interface DriverStats {
  daysWithActivity: number
  totalSessions: number
  totalRequests: number
  acceptedRequests: number
  notTakenRequests: number
  acceptedPct: number
  notTakenPct: number
  finalizedRequests: number
  primaryZone: { name: string; sessions: number } | null
  primaryTurn: { name: string; sessions: number } | null
  primaryWeekday: { iso: number; label: string; sessions: number } | null
  zoneBreakdown: { name: string; sessions: number }[]
  turnBreakdown: { name: string; sessions: number }[]
  weekdayBreakdown: WeekdayBreakdown[]
  /** Matriz [weekday-1=0..6][hourIdx 0..N-1] = cantidad de sesiones que cubrieron ese segmento */
  hourlyHeatmap: number[][]
  /** Hours del eje X del heatmap (8..23) */
  heatmapHours: number[]
  /** Pedidos por día (relleno con ceros para días sin actividad) */
  ordersByDay: OrdersByDayPoint[]
  /** Filtros aplicados (para mostrar UI/breadcrumb de filtros activos) */
  appliedFilters: DriverStatsFilters
  /** Lista completa de zonas y turnos disponibles en el periodo (sin filtrar) */
  availableZones: string[]
  availableTurns: string[]
  rangeStartDay: string | null
  rangeEndDay: string | null
}
