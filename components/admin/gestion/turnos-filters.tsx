"use client"

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { type CompareMode, type Metric } from "@/lib/types/turnos.types"
import { formatDatePill } from "@/lib/utils/turnos-dates"
import { cn } from "@/lib/utils"

const METRIC_OPTIONS: ReadonlyArray<{ value: Metric; label: string }> = [
  { value: "drivers", label: "Drivers" },
  { value: "occupancy", label: "Ocupación" },
]

interface Props {
  dates: string[]
  selectedDate: string
  onDateChange: (d: string) => void
  metric: Metric
  onMetricChange: (m: Metric) => void
  fetchedAtIso: string
  isRefreshing: boolean
  onRefresh: () => void
  availableWeeks: number[]
  compareWeeksBack: number | null
  onCompareWeeksBackChange: (w: number | null) => void
  compareMode: CompareMode
  onCompareModeChange: (m: CompareMode) => void
  comparisonLoading: boolean
  runRateAllowed: boolean
}

export function TurnosFilters({
  dates,
  selectedDate,
  onDateChange,
  metric,
  onMetricChange,
  fetchedAtIso,
  isRefreshing,
  onRefresh,
  availableWeeks,
  compareWeeksBack,
  onCompareWeeksBackChange,
  compareMode,
  onCompareModeChange,
  comparisonLoading,
  runRateAllowed,
}: Props) {
  const fetchedAt = new Date(fetchedAtIso)
  const relativeFetched = formatDistanceToNow(fetchedAt, {
    addSuffix: true,
    locale: es,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground">Fecha</label>
        {dates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin fechas disponibles.</p>
        ) : (
          <RadioGroupPrimitive.Root
            value={selectedDate}
            onValueChange={onDateChange}
            className="flex flex-wrap gap-2"
          >
            {dates.map((d) => {
              const { primary, secondary } = formatDatePill(d)
              const isSelected = d === selectedDate
              return (
                <RadioGroupPrimitive.Item
                  key={d}
                  value={d}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-md border px-4 py-2 text-sm transition-colors outline-none",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isSelected
                      ? "border-foreground bg-foreground text-background hover:bg-foreground hover:text-background"
                      : "border-border bg-background text-foreground",
                  )}
                >
                  <span className="font-medium leading-none capitalize">{primary}</span>
                  {secondary && (
                    <span
                      className={cn(
                        "mt-0.5 text-xs leading-none",
                        isSelected ? "text-background/70" : "text-muted-foreground",
                      )}
                    >
                      {secondary}
                    </span>
                  )}
                </RadioGroupPrimitive.Item>
              )
            })}
          </RadioGroupPrimitive.Root>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Métrica</label>
          <div className="inline-flex h-9 items-center rounded-md border bg-background p-0.5">
            {METRIC_OPTIONS.map(({ value, label }) => {
              const on = metric === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onMetricChange(value)}
                  className={cn(
                    "rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors",
                    on
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Actualizado {relativeFetched}</span>
          <Button
            onClick={onRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Comparar con
          </label>
          <div className="inline-flex h-9 items-center rounded-md border bg-background p-0.5">
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
                    if (!disabled) onCompareWeeksBackChange(opt.value)
                  }}
                  disabled={disabled}
                  title={disabled ? "Aún sin datos suficientes" : undefined}
                  className={cn(
                    "rounded-sm px-2.5 py-1.5 text-xs font-medium tabular-nums transition-colors",
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
        {compareWeeksBack !== null && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Modo
            </label>
            <div className="inline-flex h-9 items-center rounded-md border bg-background p-0.5">
              <button
                type="button"
                onClick={() => onCompareModeChange("final")}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-sm transition-colors",
                  compareMode === "final"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Final
              </button>
              <button
                type="button"
                onClick={() => {
                  if (runRateAllowed) onCompareModeChange("runrate")
                }}
                disabled={!runRateAllowed}
                title={
                  !runRateAllowed
                    ? "Run rate aplica sólo para turnos a futuro"
                    : undefined
                }
                className={cn(
                  "rounded-sm px-3 py-1.5 text-sm transition-colors",
                  compareMode === "runrate" && runRateAllowed
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                  !runRateAllowed &&
                    "cursor-not-allowed opacity-40 hover:text-muted-foreground",
                )}
              >
                Run rate
              </button>
            </div>
          </div>
        )}
        {compareWeeksBack !== null && (
          <div className="basis-full space-y-0.5 border-t border-border/40 pt-2 text-xs leading-snug text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Final</span>: cómo
              quedó ese turno hace {compareWeeksBack} semana
              {compareWeeksBack === 1 ? "" : "s"} (foto tomada al cerrar esa
              hora, una hora después).
            </div>
            <div>
              <span className="font-medium text-foreground">Run rate</span>:
              cómo veníamos para ese turno hace {compareWeeksBack} semana
              {compareWeeksBack === 1 ? "" : "s"} a esta misma hora.
              {!runRateAllowed && (
                <span className="italic"> Aplica sólo para turnos a futuro.</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
