"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { format, subDays } from "date-fns"
import { es } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { ArrowRight, CalendarDays, X } from "lucide-react"

import { AdminHeader } from "@/components/admin/admin-header"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatDistance } from "@/lib/utils/geo"
import { cn } from "@/lib/utils"

interface EventRow {
  id: number
  type: string // LEFT_ORIGIN_WITHOUT_DELIVERY | LEFT_DESTINATION_WITHOUT_FINALIZE
  requestId: string
  externalOrderId: string | null
  driverName: string | null
  placeName: string | null
  zoneName: string | null
  stateAtEvent: string
  leftAt: string
  detectedAt: string
  dwellSeconds: number
  distanceAtDetectionM: number
  otherPlaceDistanceM: number | null
  currentStatus: string | null
}

interface FilterState {
  type: string // "all" | "origin" | "dest"
  from: string
  to: string
}

interface Props {
  rows: EventRow[]
  total: number
  page: number
  pageSize: number
  filters: FilterState
}

const TYPE_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "origin", label: "Salió del comercio" },
  { value: "dest", label: "Se fue del cliente" },
]

// Acción que el driver omitió, en los mismos labels que usa el resto del panel.
const TYPE_DESCRIPTION: Record<string, { action: string; place: string }> = {
  LEFT_ORIGIN_WITHOUT_DELIVERY: {
    action: "Salió del comercio sin marcar En camino",
    place: "Comercio",
  },
  LEFT_DESTINATION_WITHOUT_FINALIZE: {
    action: "Se fue del cliente sin marcar Entregado",
    place: "Cliente",
  },
}

const STATUS_LABEL: Record<string, string> = {
  FINALIZED: "Entregado",
  CANCELED: "Cancelado",
  CANCELED_BY_CLIENT: "Cancelado por cliente",
  CANCELLED: "Cancelado",
  DELIVERY: "En camino",
  OUTSIDE: "Afuera",
  WAITING_ORDER: "En el comercio",
  ACCEPTED: "Aceptado",
  PENDING: "Buscando driver",
}

function statusLabel(status: string | null): string {
  if (!status) return "—"
  return STATUS_LABEL[status] || status
}

// ¿La orden avanzó después del evento? (marcado tardío: la señal sigue siendo
// válida, pero el admin ve que al final lo marcó).
function markedLater(row: EventRow): boolean {
  if (!row.currentStatus) return false
  if (row.type === "LEFT_ORIGIN_WITHOUT_DELIVERY") {
    return ["DELIVERY", "OUTSIDE", "FINALIZED"].includes(row.currentStatus)
  }
  return row.currentStatus === "FINALIZED"
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—"
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

// detectedAt/leftAt son timestamps UTC reales generados por nuestro cron →
// formateamos directo en la TZ del browser (a diferencia de los timestamps
// PY-mislabeled de la API de pedidos).
function formatEventDate(iso: string): { strong: string; weak: string } {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { strong: iso, weak: "" }
  return {
    strong: format(d, "dd MMM", { locale: es }),
    weak: format(d, "HH:mm", { locale: es }),
  }
}

function parseYmd(s: string): Date | undefined {
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

export function AnomaliasContent({ rows, total, page, pageSize, filters }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = parseYmd(filters.from)
    const to = parseYmd(filters.to)
    return from || to ? { from, to } : undefined
  })
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasFilters = !!(filters.from || filters.to) || filters.type !== "all"

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key)
      else params.set(key, value)
    }
    if (!("page" in updates)) params.delete("page")
    startTransition(() => {
      router.push(`/admin/gestion/anomalias?${params.toString()}`)
    })
  }

  const handleClearAll = () => {
    setDateRange(undefined)
    startTransition(() => {
      router.push(`/admin/gestion/anomalias`)
    })
  }

  // Aplica un rango completo (from+to) a la URL y cierra el popover.
  // Para selección parcial (sólo from), no navegamos — solo pintamos en el state local.
  const commitDateRange = (range: DateRange | undefined) => {
    setDateRange(range)
    updateParams({
      from: range?.from ? toYmd(range.from) : null,
      to: range?.to ? toYmd(range.to) : null,
    })
    setDatePopoverOpen(false)
  }

  const handleCalendarSelect = (
    range: DateRange | undefined,
    triggerDate: Date | undefined,
  ) => {
    // Si ya había un rango completo y el usuario clickeó otro día, no extendemos
    // el rango (default de react-day-picker) — reseteamos como nueva selección.
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
        const urlFrom = parseYmd(filters.from)
        const urlTo = parseYmd(filters.to)
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

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        breadcrumbs={[
          { label: "Gestión Admin" },
          { label: "Anomalías", href: "/admin/gestion/anomalias" },
        ]}
      />

      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Anomalías</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Drivers que se fueron de un lugar sin marcar el cambio de estado del
            pedido. Detección automática por posición (cron cada minuto).
          </p>
        </div>

        {/* Filtros */}
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

              {/* Tipo pills */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Tipo
                </span>
                <RadioGroupPrimitive.Root
                  value={filters.type}
                  onValueChange={(v) =>
                    updateParams({ type: v === "all" ? null : v })
                  }
                  className="flex flex-wrap gap-1"
                >
                  {TYPE_OPTIONS.map((opt) => {
                    const isSelected = filters.type === opt.value
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

              {hasFilters && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleClearAll}
                  disabled={isPending}
                  className="lg:ml-auto"
                >
                  Limpiar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {total.toLocaleString("es-AR")} eventos
              {hasFilters && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  con los filtros activos
                </span>
              )}
            </h2>
            {isPending && (
              <span className="text-xs text-muted-foreground">Aplicando...</span>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {hasFilters
                ? "Sin eventos con los filtros aplicados."
                : "Todavía no hay eventos detectados. La detección corre cada minuto sobre los pedidos activos."}
            </div>
          ) : (
            <TooltipProvider delayDuration={150}>
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="px-4 py-2 font-medium">Momento</th>
                        <th className="px-4 py-2 font-medium">Acción omitida</th>
                        <th className="px-4 py-2 font-medium">Pedido</th>
                        <th className="px-4 py-2 font-medium">Driver</th>
                        <th className="px-4 py-2 font-medium">Lugar</th>
                        <th className="px-4 py-2 font-medium">Tiempo en el lugar</th>
                        <th className="px-4 py-2 font-medium">Distancia</th>
                        <th className="px-4 py-2 font-medium">Estado actual</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <EventRowItem key={r.id} row={r} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs">
                    <span>
                      Página {page} de {totalPages} · {total.toLocaleString("es-AR")}{" "}
                      resultados
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={page <= 1 || isPending}
                        onClick={() => updateParams({ page: String(page - 1) })}
                      >
                        Anterior
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={page >= totalPages || isPending}
                        onClick={() => updateParams({ page: String(page + 1) })}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  )
}

function EventRowItem({ row }: { row: EventRow }) {
  const desc = TYPE_DESCRIPTION[row.type] ?? { action: row.type, place: "—" }
  // leftAt = cuándo se fue realmente (primera muestra lejos); detectedAt es la
  // confirmación unos minutos después.
  const date = formatEventDate(row.leftAt)
  const later = markedLater(row)

  return (
    <tr className="border-t hover:bg-muted/30">
      <td className="px-4 py-2.5">
        <div className="font-medium tabular-nums">{date.strong}</div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {date.weak}
        </div>
      </td>

      <td className="px-4 py-2.5">
        <div className="leading-tight max-w-[240px]">{desc.action}</div>
        <div className="text-[10px] text-muted-foreground">
          estaba en {statusLabel(row.stateAtEvent)}
        </div>
      </td>

      <td className="px-4 py-2.5">
        <div className="font-medium leading-tight">
          {row.externalOrderId ? `#${row.externalOrderId}` : "—"}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-[10px] text-muted-foreground/70 font-mono cursor-default">
              …{row.requestId.slice(-6)}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-mono text-[11px]">{row.requestId}</span>
          </TooltipContent>
        </Tooltip>
      </td>

      <td className="px-4 py-2.5">
        <div className="truncate max-w-[160px]">{row.driverName || "—"}</div>
        {row.zoneName && (
          <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">
            {row.zoneName}
          </div>
        )}
      </td>

      <td className="px-4 py-2.5">
        <div className="truncate max-w-[180px]">{row.placeName || "—"}</div>
        <div className="text-[10px] text-muted-foreground">{desc.place}</div>
      </td>

      <td className="px-4 py-2.5">
        <span className="text-xs tabular-nums">
          {formatDuration(row.dwellSeconds)}
        </span>
      </td>

      <td className="px-4 py-2.5">
        <div className="text-xs tabular-nums">
          {formatDistance(row.distanceAtDetectionM)}
        </div>
        {row.otherPlaceDistanceM !== null && row.otherPlaceDistanceM < 350 && (
          <div className="text-[10px] text-muted-foreground">
            {row.type === "LEFT_ORIGIN_WITHOUT_DELIVERY"
              ? "cliente"
              : "comercio"}{" "}
            a {formatDistance(row.otherPlaceDistanceM)}
          </div>
        )}
      </td>

      <td className="px-4 py-2.5">
        <div className="text-xs">{statusLabel(row.currentStatus)}</div>
        {later && (
          <div className="text-[10px] text-muted-foreground">marcó después</div>
        )}
      </td>

      <td className="px-4 py-2.5">
        <Link
          href={`/admin/gestion/pedidos/${row.requestId}`}
          className="inline-flex items-center gap-1 text-primary hover:underline whitespace-nowrap"
        >
          Ver
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  )
}
