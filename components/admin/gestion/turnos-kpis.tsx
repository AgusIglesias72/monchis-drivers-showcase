"use client"

import { Fragment } from "react"

import type {
  CompareMode,
  ComparisonData,
  KpiSummary,
} from "@/lib/types/turnos.types"

interface Props {
  kpis: KpiSummary
  comparison?: ComparisonData | null
  comparisonLoading?: boolean
  compareMode?: CompareMode
  compareWeeksBack?: number | null
}

export function TurnosKpis({
  kpis,
  comparison,
  comparisonLoading = false,
  compareMode = "final",
  compareWeeksBack = null,
}: Props) {
  const occupancyText =
    kpis.totalMax > 0 ? `${Math.round(kpis.occupancyPct * 100)}%` : "—"

  // El label/comparable se derivan de los props del selector (no de la data),
  // así renderizamos la línea de comparación apenas el user elige W — el valor
  // sale como skeleton hasta que llega la respuesta.
  const compareOn = compareWeeksBack !== null
  const compareLabel = compareOn
    ? `${compareMode === "final" ? "Final" : "Run rate"} W-${compareWeeksBack}`
    : null

  const compareOccupancy =
    comparison && comparison.totals.max > 0
      ? `${Math.round((comparison.totals.assigned / comparison.totals.max) * 100)}%`
      : null

  let compareLowZones = 0
  if (comparison) {
    for (const z of Object.values(comparison.totalsByZone)) {
      if (z.max > 0 && z.assigned / z.max < 0.6) compareLowZones += 1
    }
  }

  const stats: {
    label: string
    value: string
    compare: string | null
  }[] = [
    {
      label: "Drivers",
      value: `${kpis.totalAssigned}/${kpis.totalMax}`,
      compare: comparison
        ? `${comparison.totals.assigned}/${comparison.totals.max}`
        : null,
    },
    {
      label: "Ocupación",
      value: occupancyText,
      compare: compareOccupancy,
    },
    {
      label: "Turnos",
      value: String(kpis.activeShifts),
      compare: comparison ? String(comparison.shiftCount) : null,
    },
    {
      label: "Zonas baja",
      value: String(kpis.zonesWithLowOccupancy),
      compare: comparison ? String(compareLowZones) : null,
    },
  ]

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-md border bg-card px-3 py-2 text-sm">
      {stats.map((s, idx) => (
        <Fragment key={s.label}>
          {idx > 0 && (
            <span aria-hidden className="text-muted-foreground/30">
              ·
            </span>
          )}
          <span className="inline-flex items-baseline gap-1">
            <span className="font-semibold tabular-nums">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
            {compareOn &&
              compareLabel &&
              (comparisonLoading ? (
                <span
                  aria-hidden
                  className="ml-1 inline-block h-3 w-20 animate-pulse rounded bg-muted-foreground/15 align-middle"
                />
              ) : (
                <span className="ml-1 text-[11px] tabular-nums text-muted-foreground/60">
                  ({compareLabel} {s.compare ?? "—"})
                </span>
              ))}
          </span>
        </Fragment>
      ))}
    </div>
  )
}
