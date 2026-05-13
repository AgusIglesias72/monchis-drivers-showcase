// components/admin/dashboard/drivers-tab.tsx
//
// Server component que recibe el snapshot completo del tab "Drivers" del
// dashboard admin. La data se obtiene con getDriversSnapshot() en el page que
// lo embebe (otro agente integra esto en app/admin/page.tsx).

import type {
  BonusSummary,
  CoverageZoneHour,
  DriversGrowthTrend,
  DriversKpis,
} from "@/lib/services/dashboard-drivers.service"
import { DriversKpiCards } from "./drivers/drivers-kpi-cards"
import { DriversGrowthChart } from "./drivers/drivers-growth-chart"
import { DriversCoverageHeatmap } from "./drivers/drivers-coverage-heatmap"
import { DriversTopBonus } from "./drivers/drivers-top-bonus"

export interface DriversTabProps {
  snapshot: {
    kpis: DriversKpis
    coverage: CoverageZoneHour[]
    bonus: BonusSummary
    growth: DriversGrowthTrend[]
  }
}

export function DriversTab({ snapshot }: DriversTabProps) {
  const { kpis, coverage, bonus, growth } = snapshot

  return (
    <div className="space-y-6">
      <DriversKpiCards kpis={kpis} bonus={bonus} />
      <DriversGrowthChart data={growth} />
      <DriversCoverageHeatmap data={coverage} />
      <DriversTopBonus bonus={bonus} />
    </div>
  )
}
