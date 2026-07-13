"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { CalendarDays, ChevronDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DateRangeValue {
  from?: Date
  to?: Date
}

export interface DateRangePickerProps {
  value?: DateRangeValue
  onChange: (range?: DateRangeValue) => void
  /** Muestra la columna de presets (Hoy / Últimos 7·14·30·90). */
  presets?: boolean
  placeholder?: string
  className?: string
}

const PRESETS: { label: string; days: number | "today" }[] = [
  { label: "Hoy", days: "today" },
  { label: "Últimos 7", days: 7 },
  { label: "Últimos 14", days: 14 },
  { label: "Últimos 30", days: 30 },
  { label: "Últimos 90", days: 90 },
]

function formatRangeLabel(from?: Date, to?: Date): string {
  if (!from && !to) return "Rango de fechas"
  if (from && !to) return `Desde ${format(from, "dd MMM", { locale: es })}`
  if (!from && to) return `Hasta ${format(to, "dd MMM", { locale: es })}`
  if (from && to) {
    const sameDay = from.getTime() === to.getTime()
    if (sameDay) return format(from, "dd MMM yyyy", { locale: es })
    return `${format(from, "dd MMM", { locale: es })} → ${format(to, "dd MMM yyyy", { locale: es })}`
  }
  return "Rango de fechas"
}

/**
 * Selector de rango de fechas STUDIO (patrón Anomalías): trigger outline con el
 * rango + botón de limpiar, y Popover con presets + calendario de 2 meses.
 */
export function DateRangePicker({
  value,
  onChange,
  presets = true,
  placeholder,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const { from, to } = value ?? {}

  const applyPreset = (days: number | "today") => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (days === "today") {
      onChange({ from: today, to: today })
    } else {
      const start = new Date(today)
      start.setDate(start.getDate() - (days - 1))
      onChange({ from: start, to: today })
    }
    setOpen(false)
  }

  const handleSelect = (range?: DateRange) => {
    onChange(range ? { from: range.from, to: range.to } : undefined)
    if (range?.from && range?.to) setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-9 min-w-[200px] justify-start gap-2 font-normal",
            !from && !to && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="size-4 shrink-0" />
          <span className="truncate">
            {from || to ? formatRangeLabel(from, to) : (placeholder ?? "Rango de fechas")}
          </span>
          {from || to ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onChange(undefined)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  e.stopPropagation()
                  onChange(undefined)
                }
              }}
              aria-label="Limpiar rango"
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          ) : (
            <ChevronDown className="ml-auto size-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-auto flex-col p-0 sm:flex-row">
        {presets && (
          <div className="flex min-w-[140px] flex-row flex-wrap gap-1 border-b p-2 sm:flex-col sm:border-b-0 sm:border-r">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 justify-start text-xs sm:w-full"
                onClick={() => applyPreset(p.days)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        )}
        <Calendar
          mode="range"
          min={1}
          selected={from || to ? { from, to } : undefined}
          onSelect={handleSelect}
          numberOfMonths={2}
          defaultMonth={from}
          locale={es}
          showOutsideDays={false}
        />
      </PopoverContent>
    </Popover>
  )
}
