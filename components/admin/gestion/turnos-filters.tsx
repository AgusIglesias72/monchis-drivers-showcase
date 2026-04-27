"use client"

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { METRIC_LABELS, type Metric } from "@/lib/types/turnos.types"
import { cn } from "@/lib/utils"

interface Props {
  dates: string[]
  selectedDate: string
  onDateChange: (d: string) => void
  metric: Metric
  onMetricChange: (m: Metric) => void
  fetchedAtIso: string
  isRefreshing: boolean
  onRefresh: () => void
}

function formatDatePill(iso: string): { primary: string; secondary: string } {
  try {
    const d = parseISO(iso)
    if (isToday(d)) return { primary: "Hoy", secondary: format(d, "d MMM", { locale: es }) }
    if (isTomorrow(d)) return { primary: "Mañana", secondary: format(d, "d MMM", { locale: es }) }
    if (isYesterday(d)) return { primary: "Ayer", secondary: format(d, "d MMM", { locale: es }) }
    return {
      primary: format(d, "EEE", { locale: es }),
      secondary: format(d, "d MMM", { locale: es }),
    }
  } catch {
    return { primary: iso, secondary: "" }
  }
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
          <Select value={metric} onValueChange={(v) => onMetricChange(v as Metric)}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(METRIC_LABELS) as [Metric, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
    </div>
  )
}
