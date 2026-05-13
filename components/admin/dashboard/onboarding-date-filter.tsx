"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { format, subDays } from "date-fns"
import { es } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { CalendarDays, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type FilterType = "created" | "completed" | "event"

interface Props {
  currentStartDate?: string
  currentEndDate?: string
  currentFilterType?: FilterType
}

const FILTER_TYPE_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "created", label: "Postulación" },
  { value: "completed", label: "Completación" },
  { value: "event", label: "Capacitación" },
]

// --- Helpers de fecha (espejados del filtro de pedidos) ---

function parseYmd(s: string | undefined): Date | undefined {
  if (!s) return undefined
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return undefined
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function formatRangeLabel(from?: Date, to?: Date): string {
  if (!from && !to) return "Todas las fechas"
  if (from && !to) return `Desde ${format(from, "dd MMM", { locale: es })}`
  if (!from && to) return `Hasta ${format(to, "dd MMM", { locale: es })}`
  if (from && to) {
    const sameYear = from.getFullYear() === to.getFullYear()
    const sameDay =
      sameYear &&
      from.getMonth() === to.getMonth() &&
      from.getDate() === to.getDate()
    if (sameDay) return format(from, "dd MMM yyyy", { locale: es })
    return `${format(from, "dd MMM", { locale: es })} → ${format(to, "dd MMM yyyy", { locale: es })}`
  }
  return ""
}

// inferGroupBy se movió a @/lib/utils/dashboard-group-by — es server-safe
// y la consumen tanto app/admin/page.tsx como este componente client.

export function OnboardingDateFilter({
  currentStartDate,
  currentEndDate,
  currentFilterType = "created",
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = parseYmd(currentStartDate)
    const to = parseYmd(currentEndDate)
    return from || to ? { from, to } : undefined
  })
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)

  const hasFilters =
    !!currentStartDate ||
    !!currentEndDate ||
    currentFilterType !== "created"

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams?.toString() || "")
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key)
      else params.set(key, value)
    }
    startTransition(() => {
      router.push(`/admin?${params.toString()}`)
    })
  }

  // Aplica un rango completo (from+to) a la URL y cierra el popover.
  // Para selección parcial (sólo from), no navegamos — solo pintamos en el state local.
  const commitDateRange = (range: DateRange | undefined) => {
    setDateRange(range)
    updateParams({
      startDate: range?.from ? toYmd(range.from) : null,
      endDate: range?.to ? toYmd(range.to) : null,
    })
    setDatePopoverOpen(false)
  }

  const handleCalendarSelect = (
    range: DateRange | undefined,
    triggerDate: Date | undefined,
  ) => {
    // Si ya había un rango completo y el usuario clickeó otro día, no extendemos
    // el rango — reseteamos como nueva selección.
    if (dateRange?.from && dateRange?.to && triggerDate) {
      setDateRange({ from: triggerDate, to: undefined })
      return
    }
    setDateRange(range)
    if (range?.from && range?.to) {
      commitDateRange(range)
    }
  }

  const handleDatePopoverOpenChange = (open: boolean) => {
    setDatePopoverOpen(open)
    if (!open) {
      // Si cierra sin completar (sólo from), descartamos la selección parcial
      // y volvemos al state representado por la URL.
      if (dateRange?.from && !dateRange?.to) {
        const urlFrom = parseYmd(currentStartDate)
        const urlTo = parseYmd(currentEndDate)
        setDateRange(
          urlFrom || urlTo ? { from: urlFrom, to: urlTo } : undefined,
        )
      }
    }
  }

  const applyPreset = (days: number | "today") => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const from =
      days === "today" ? today : subDays(today, days === 0 ? 0 : days - 1)
    commitDateRange({ from, to: today })
  }

  const handleClearAll = () => {
    setDateRange(undefined)
    startTransition(() => {
      router.push(`/admin`)
    })
  }

  const handleFilterTypeChange = (v: string) => {
    if (!v) return
    updateParams({ filterType: v === "created" ? null : v })
  }

  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          {/* Date range picker */}
          <Popover
            open={datePopoverOpen}
            onOpenChange={handleDatePopoverOpenChange}
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 gap-2 font-normal min-w-[200px] justify-start",
                  !dateRange?.from &&
                    !dateRange?.to &&
                    "text-muted-foreground",
                )}
              >
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {formatRangeLabel(dateRange?.from, dateRange?.to)}
                </span>
                {(dateRange?.from || dateRange?.to) && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      commitDateRange(undefined)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        e.stopPropagation()
                        commitDateRange(undefined)
                      }
                    }}
                    aria-label="Limpiar rango"
                    className="ml-auto text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-auto p-0 flex flex-col sm:flex-row"
            >
              <div className="flex flex-row sm:flex-col gap-1 border-b sm:border-b-0 sm:border-r p-2 min-w-[140px] flex-wrap">
                {[
                  { label: "Hoy", days: "today" as const },
                  { label: "Últimos 7", days: 7 },
                  { label: "Últimos 14", days: 14 },
                  { label: "Últimos 30", days: 30 },
                  { label: "Últimos 90", days: 90 },
                ].map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8 text-xs sm:w-full"
                    onClick={() => applyPreset(p.days)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <Calendar
                mode="range"
                min={1}
                selected={dateRange}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                defaultMonth={dateRange?.from}
                locale={es}
                showOutsideDays={false}
              />
            </PopoverContent>
          </Popover>

          {/* Filter type chips */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Por fecha de
            </span>
            <RadioGroupPrimitive.Root
              value={currentFilterType}
              onValueChange={handleFilterTypeChange}
              className="flex flex-wrap gap-1"
            >
              {FILTER_TYPE_OPTIONS.map((opt) => {
                const isSelected = currentFilterType === opt.value
                return (
                  <RadioGroupPrimitive.Item
                    key={opt.value}
                    value={opt.value}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs transition-colors outline-none",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      isSelected
                        ? "border-foreground bg-foreground text-background hover:bg-foreground hover:text-background"
                        : "border-border bg-background text-foreground",
                    )}
                  >
                    {opt.label}
                  </RadioGroupPrimitive.Item>
                )
              })}
            </RadioGroupPrimitive.Root>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 lg:ml-auto">
            {isPending && (
              <span className="text-xs text-muted-foreground">Aplicando…</span>
            )}
            {hasFilters && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleClearAll}
                disabled={isPending}
              >
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
