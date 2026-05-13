"use client"

// Tab "Operaciones" del Dashboard admin.
//
// Es un client component (necesita Recharts + framer-motion). El RSC padre
// debe llamar a `getOpsSnapshot()` desde `lib/services/dashboard-ops.service`
// y pasar el resultado por prop. Esto mantiene la separación: server fetch +
// cache (revalidate), client render.

import type { OpsSnapshot } from "@/lib/services/dashboard-ops.service"
import { OperacionesKpiCards } from "./operaciones/kpi-cards"
import { OperacionesDailyTrendChart } from "./operaciones/daily-trend-chart"
import { OperacionesHourlyChart } from "./operaciones/hourly-chart"
import { OperacionesTopZones } from "./operaciones/top-zones"

interface OperacionesTabProps {
  snapshot: OpsSnapshot
}

export function OperacionesTab({ snapshot }: OperacionesTabProps) {
  const { kpis, hourly, topZones, dailyTrend } = snapshot

  return (
    <div className="space-y-6">
      <OperacionesKpiCards kpis={kpis} />
      <OperacionesDailyTrendChart data={dailyTrend} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OperacionesHourlyChart data={hourly} />
        <OperacionesTopZones data={topZones} />
      </div>
    </div>
  )
}
