"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { loadComparison } from "@/app/admin/gestion/turnos/actions"
import { hourlyAggregates, uniqueZones } from "@/lib/services/turnos-aggregate"
import type {
  CompareMode,
  ComparisonData,
  FlattenedShift,
} from "@/lib/types/turnos.types"
import { todayInPyIso } from "@/lib/utils/turnos-dates"
import { cn } from "@/lib/utils"

interface Props {
  shifts: FlattenedShift[]
  hours: readonly number[]
  /** Día visible del dashboard — necesario para fetchear la comparación. */
  selectedDate?: string
  /** Semanas con datos suficientes (calculadas en el server). */
  availableWeeks?: number[]
}

const CURRENT_STROKE = "hsl(212, 70%, 40%)"
const COMPARE_STROKE = "hsl(212, 45%, 72%)"

export function TurnosHourlyChart({
  shifts,
  hours,
  selectedDate,
  availableWeeks = [],
}: Props) {
  const zones = useMemo(() => uniqueZones(shifts), [shifts])
  const [selectedZone, setSelectedZone] = useState<string>("all")

  // Si la zona elegida desaparece del set (cambio de día/foto), fallback a Todas.
  const effectiveZone =
    selectedZone === "all" || zones.includes(selectedZone)
      ? selectedZone
      : "all"

  // El chart maneja su propia W-N — independiente del selector de arriba —
  // y arranca con W-1 por default (si hay datos) para que la línea de
  // comparación aparezca sin tener que tocar nada.
  const [compareWeeksBack, setCompareWeeksBack] = useState<number | null>(() =>
    availableWeeks.includes(1) ? 1 : null,
  )

  const today = useMemo(() => todayInPyIso(), [])
  const runRateAllowed = !selectedDate || selectedDate >= today
  const compareMode: CompareMode = runRateAllowed ? "runrate" : "final"

  const [comparison, setComparison] = useState<ComparisonData | null>(null)
  const [comparisonLoading, setComparisonLoading] = useState(false)

  useEffect(() => {
    if (compareWeeksBack === null || !selectedDate) {
      setComparison(null)
      return
    }
    let cancelled = false
    setComparisonLoading(true)
    loadComparison({
      mode: compareMode,
      weeksBack: compareWeeksBack,
      selectedDate,
    })
      .then((res) => {
        if (cancelled) return
        if (res.ok && res.data) setComparison(res.data)
        else setComparison(null)
      })
      .finally(() => {
        if (!cancelled) setComparisonLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [compareWeeksBack, compareMode, selectedDate])

  const filteredShifts = useMemo(
    () =>
      effectiveZone === "all"
        ? shifts
        : shifts.filter((s) => s.zoneName === effectiveZone),
    [shifts, effectiveZone],
  )

  const currentSeries = useMemo(
    () => hourlyAggregates(filteredShifts, hours),
    [filteredShifts, hours],
  )

  const slots = useMemo(() => hours.slice(0, -1), [hours])

  const compareSeries = useMemo(() => {
    if (!comparison) return null
    return slots.map((h) => {
      let assigned: number | null = null
      if (effectiveZone === "all") {
        for (const z of Object.keys(comparison.cells)) {
          const cell = comparison.cells[z]?.[h]
          if (cell) {
            if (assigned === null) assigned = 0
            assigned += cell.assigned
          }
        }
      } else {
        const cell = comparison.cells[effectiveZone]?.[h]
        if (cell) assigned = cell.assigned
      }
      return { hour: h, assigned }
    })
  }, [comparison, effectiveZone, slots])

  const compareLabel = comparison
    ? `${comparison.mode === "final" ? "Final" : "Run rate"} W-${comparison.weeksBack}`
    : compareWeeksBack != null
      ? `${compareMode === "final" ? "Final" : "Run rate"} W-${compareWeeksBack}`
      : null
  const showCompare = !!comparison

  const chartData = useMemo(() => {
    return currentSeries.map((cur, i) => ({
      label: cur.label,
      hour: cur.hour,
      assigned: cur.assigned,
      max: cur.max,
      compareAssigned: compareSeries?.[i]?.assigned ?? null,
    }))
  }, [currentSeries, compareSeries])

  const subtitleParts: string[] = [
    effectiveZone === "all" ? "Todas las zonas" : effectiveZone,
  ]
  if (showCompare && compareLabel) {
    subtitleParts.push(`Compara contra ${compareLabel}`)
  }
  if (comparisonLoading) {
    subtitleParts.push("cargando…")
  }

  // Habilitamos el selector W-N si tenemos la metadata para fetchear.
  const comparisonAvailable = !!selectedDate

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Drivers asignados por hora</h2>
          <p className="text-xs text-muted-foreground">
            {subtitleParts.join(" · ")}
          </p>
        </div>

        {comparisonAvailable && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Comparar con</span>
            <div className="inline-flex h-8 items-center rounded-md border bg-background p-0.5">
              {(
                [
                  { value: null as number | null, label: "Sin comp." },
                  { value: 1, label: "W-1" },
                  { value: 2, label: "W-2" },
                  { value: 3, label: "W-3" },
                  { value: 4, label: "W-4" },
                ] as const
              ).map((opt) => {
                const disabled =
                  opt.value !== null && !availableWeeks.includes(opt.value)
                const on = compareWeeksBack === opt.value
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      if (!disabled) setCompareWeeksBack(opt.value)
                    }}
                    disabled={disabled}
                    title={disabled ? "Aún sin datos suficientes" : undefined}
                    className={cn(
                      "rounded-sm px-2 py-1 text-[11px] font-medium tabular-nums transition-colors",
                      on
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                      disabled &&
                        "cursor-not-allowed opacity-40 hover:text-muted-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">Zona:</span>
        {["all", ...zones].map((z) => {
          const on = effectiveZone === z
          const label = z === "all" ? "Todas" : z
          return (
            <button
              key={z}
              type="button"
              onClick={() => setSelectedZone(z)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                on
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.3 }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {showCompare && (
              <Line
                type="monotone"
                dataKey="compareAssigned"
                name={compareLabel ?? "Comparación"}
                stroke={COMPARE_STROKE}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 0, fill: COMPARE_STROKE }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="assigned"
              name="Actual"
              stroke={CURRENT_STROKE}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: CURRENT_STROKE }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
