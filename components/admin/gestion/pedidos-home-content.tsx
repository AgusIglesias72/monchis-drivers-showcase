"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { format, subDays } from "date-fns"
import { es } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bike,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  Clock,
  Handshake,
  Repeat,
  Search,
  ShieldCheck,
  Timer,
  Upload,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react"

import { AdminHeader } from "@/components/admin/admin-header"
import { PedidoSearchForm } from "@/components/admin/gestion/pedido-search-form"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { parseOrderInstant } from "@/lib/utils/pedidos-time"
import { cn } from "@/lib/utils"

interface OrderRow {
  requestId: string
  externalOrderId: string | null
  driverName: string | null
  branchName: string | null
  status: string | null
  confirmedAt: string | null
  finalizedAt: string | null
  refreshedAt: string
  hasAdminChange: boolean
  acceptanceSeconds: number | null
  endToEndSeconds: number | null
  offersWithDriverCount: number
}

interface FilterState {
  q: string
  status: string // "all" | "finalized" | "cancelled" | "in_progress"
  signal: string // "all" | "admin_change" | "slow_acceptance" | "many_offers" | "long_e2e"
  from: string
  to: string
  sortBy: string // "confirmedAt" | "refreshedAt"
  sortOrder: string // "asc" | "desc"
}

interface CaptureStatus {
  lastRunAt: string | null
  captureLagMs: number | null
  isStale: boolean
  staleThresholdMs: number
  inProgressCount: number
  queuePending: number
  queueFailed: number
}

interface Props {
  rows: OrderRow[]
  total: number
  page: number
  pageSize: number
  capture: CaptureStatus
  filters: FilterState
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "finalized", label: "Entregados" },
  { value: "in_progress", label: "En curso" },
  { value: "cancelled", label: "Cancelados" },
]

const SIGNAL_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "admin_change", label: "Con cambio admin" },
  { value: "slow_acceptance", label: "Aceptación lenta (>10m)" },
  { value: "many_offers", label: "Muchas ofertas (≥3)" },
  { value: "long_e2e", label: "Entrega larga (>1h)" },
]

interface StatusGlyph {
  icon: LucideIcon
  hex: string
  label: string
}

const STATUS_MAP: Record<string, StatusGlyph> = {
  FINALIZED: { icon: CheckCircle2, hex: "#059669", label: "Entregado" },
  CANCELLED: { icon: XCircle, hex: "#ef4444", label: "Cancelado" },
  DELIVERY: { icon: Bike, hex: "#2563eb", label: "En camino" },
  OUTSIDE: { icon: Bike, hex: "#0891b2", label: "Afuera" },
  WAITING_ORDER: { icon: ChefHat, hex: "#0ea5e9", label: "En el comercio" },
  ACCEPTED: { icon: Handshake, hex: "#8b5cf6", label: "Aceptado" },
  PENDING: { icon: Search, hex: "#f59e0b", label: "Buscando driver" },
}

function statusGlyph(status: string | null): StatusGlyph {
  if (!status) return { icon: Clock, hex: "#64748b", label: "Desconocido" }
  return STATUS_MAP[status] || { icon: Clock, hex: "#64748b", label: status }
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

function formatOrderDate(iso: string | null): { strong: string; weak: string } {
  if (!iso) return { strong: "—", weak: "" }
  // Los timestamps del pedido vienen en wall-clock PY local (con sufijo Z falso),
  // así que parseOrderInstant extrae los componentes UTC y los planta en TZ del
  // browser. Eso muestra el wall-clock PY tal cual, sin shift.
  const d = parseOrderInstant(iso)
  if (!d) return { strong: iso, weak: "" }
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

export function PedidosHomeContent({
  rows,
  total,
  page,
  pageSize,
  capture,
  filters,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(filters.q)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = parseYmd(filters.from)
    const to = parseYmd(filters.to)
    return from || to ? { from, to } : undefined
  })
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasFilters =
    !!(filters.q || filters.from || filters.to) ||
    filters.status !== "all" ||
    filters.signal !== "all"

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key)
      else params.set(key, value)
    }
    if (!("page" in updates)) params.delete("page")
    startTransition(() => {
      router.push(`/admin/gestion/pedidos?${params.toString()}`)
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams({
      q: searchInput.trim() || null,
    })
  }

  const handleClearAll = () => {
    setSearchInput("")
    setDateRange(undefined)
    startTransition(() => {
      router.push(`/admin/gestion/pedidos`)
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

  const handleSort = (key: "confirmedAt" | "refreshedAt") => {
    if (filters.sortBy === key) {
      updateParams({ sortOrder: filters.sortOrder === "asc" ? "desc" : "asc" })
    } else {
      updateParams({ sortBy: key, sortOrder: "desc" })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        breadcrumbs={[
          { label: "Gestión Admin" },
          { label: "Pedidos", href: "/admin/gestion/pedidos" },
        ]}
      />

      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pedidos</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Tabla completa de pedidos cacheados desde la API de Monchis.
            </p>
          </div>
          <Link href="/admin/gestion/pedidos/import">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Importar en bloque
            </Button>
          </Link>
        </div>

        <CaptureStatusBar capture={capture} />

        {/* Búsqueda directa por request_id (atajo a detalle) */}
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Ir directo a un pedido
            </div>
            <PedidoSearchForm />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              ID interno (24 hex) — abre la página del pedido. Para buscar en la tabla, usá el filtro debajo.
            </p>
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center"
            >
              {/* Search: full width on mobile, grow on desktop */}
              <div className="relative flex-1 min-w-[260px]">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar por request_id, external_order_id, driver o comercio…"
                  className="h-9 pl-8 pr-8"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

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

              {/* Status chips */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Estado
                </span>
                <RadioGroupPrimitive.Root
                  value={filters.status}
                  onValueChange={(v) =>
                    updateParams({ status: v === "all" ? null : v })
                  }
                  className="flex flex-wrap gap-1"
                >
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = filters.status === opt.value
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

              {/* Signal select */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Señal
                </span>
                <Select
                  value={filters.signal}
                  onValueChange={(v) =>
                    updateParams({ signal: v === "all" ? null : v })
                  }
                >
                  <SelectTrigger className="h-9 w-[200px]">
                    <SelectValue placeholder="Cualquiera" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIGNAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 lg:ml-auto">
                <Button type="submit" size="sm" disabled={isPending}>
                  Aplicar
                </Button>
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
            </form>
          </CardContent>
        </Card>

        {/* Tabla */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {total.toLocaleString("es-AR")} pedidos
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
                ? "Sin resultados con los filtros aplicados."
                : "Todavía no hay pedidos cacheados. Importá un CSV o buscá por ID."}
            </div>
          ) : (
            <TooltipProvider delayDuration={150}>
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="px-3 py-2 w-8"></th>
                        <th className="px-4 py-2 font-medium">Pedido</th>
                        <SortHeader
                          label="Fecha"
                          sortKey="confirmedAt"
                          activeSortBy={filters.sortBy}
                          activeSortOrder={filters.sortOrder}
                          onSort={handleSort}
                        />
                        <th className="px-4 py-2 font-medium">Comercio</th>
                        <th className="px-4 py-2 font-medium">Driver</th>
                        <th className="px-4 py-2 font-medium">Señales</th>
                        <th className="px-4 py-2 font-medium">Tiempo</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <OrderRowItem key={r.requestId} row={r} />
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

function SortHeader({
  label,
  sortKey,
  activeSortBy,
  activeSortOrder,
  onSort,
}: {
  label: string
  sortKey: "confirmedAt" | "refreshedAt"
  activeSortBy: string
  activeSortOrder: string
  onSort: (key: "confirmedAt" | "refreshedAt") => void
}) {
  const isActive = activeSortBy === sortKey
  return (
    <th className="px-4 py-2 font-medium">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        {isActive ? (
          activeSortOrder === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </button>
    </th>
  )
}

function OrderRowItem({ row }: { row: OrderRow }) {
  const status = statusGlyph(row.status)
  const StatusIcon = status.icon
  const date = formatOrderDate(row.confirmedAt)

  return (
    <tr className="border-t hover:bg-muted/30">
      <td className="px-3 py-2.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: status.hex }}
            >
              <StatusIcon className="h-3.5 w-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div className="font-medium">{status.label}</div>
              <div className="text-muted-foreground font-mono text-[10px]">
                {row.status}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
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
        <div className="font-medium tabular-nums">{date.strong}</div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {date.weak}
        </div>
      </td>

      <td className="px-4 py-2.5">
        <div className="truncate max-w-[180px]">{row.branchName || "—"}</div>
      </td>

      <td className="px-4 py-2.5">
        <div className="truncate max-w-[160px]">{row.driverName || "—"}</div>
      </td>

      <td className="px-4 py-2.5">
        <SignalIcons row={row} />
      </td>

      <td className="px-4 py-2.5">
        {row.endToEndSeconds !== null ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 text-xs tabular-nums cursor-default">
                <Timer className="h-3 w-3 text-muted-foreground" />
                {formatDuration(row.endToEndSeconds)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <div className="font-medium">Tiempo total</div>
                <div className="text-muted-foreground">
                  Desde que el comercio confirmó hasta entregar al cliente
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-[10px] text-muted-foreground/60">—</span>
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

function SignalIcons({ row }: { row: OrderRow }) {
  const SLOW_ACCEPT = 10 * 60
  const LONG_E2E = 60 * 60
  const MANY_OFFERS = 3

  const signals: { icon: LucideIcon; tone: string; label: string; sub?: string }[] = []

  if (row.hasAdminChange) {
    signals.push({
      icon: ShieldCheck,
      tone: "bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200",
      label: "Cambio admin",
      sub: "Hubo intervención manual en algún estado",
    })
  }
  if (row.acceptanceSeconds !== null && row.acceptanceSeconds > SLOW_ACCEPT) {
    signals.push({
      icon: Timer,
      tone: "bg-amber-100 text-amber-700 ring-amber-200",
      label: "Aceptación lenta",
      sub: `${formatDuration(row.acceptanceSeconds)} desde la oferta`,
    })
  }
  if (row.offersWithDriverCount >= MANY_OFFERS) {
    signals.push({
      icon: Repeat,
      tone: "bg-orange-100 text-orange-700 ring-orange-200",
      label: "Muchas ofertas",
      sub: `${row.offersWithDriverCount} drivers ofertados antes de aceptar`,
    })
  }
  if (row.endToEndSeconds !== null && row.endToEndSeconds > LONG_E2E) {
    signals.push({
      icon: AlertTriangle,
      tone: "bg-rose-100 text-rose-700 ring-rose-200",
      label: "Entrega larga",
      sub: `${formatDuration(row.endToEndSeconds)} end-to-end`,
    })
  }

  if (signals.length === 0) {
    return <span className="text-[10px] text-muted-foreground/60">—</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {signals.map((s, i) => {
        const Icon = s.icon
        return (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full ring-1",
                  s.tone,
                )}
              >
                <Icon className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <div className="font-medium">{s.label}</div>
                {s.sub && <div className="text-muted-foreground">{s.sub}</div>}
              </div>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

function formatLag(ms: number | null): string {
  if (ms === null) return "sin datos"
  const s = Math.round(ms / 1000)
  if (s < 90) return `hace ${s}s`
  const m = Math.floor(s / 60)
  if (m < 90) return `hace ${m}m`
  return `hace ${Math.floor(m / 60)}h`
}

// Estado de la captura automática de pedidos (cron collect-live-orders). Tira
// alerta visual si la captura está atrasada o si hay items fallados en la cola.
function CaptureStatusBar({ capture }: { capture: CaptureStatus }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span
        className={cn(
          "inline-flex items-center gap-1.5",
          capture.isStale && "font-medium text-amber-600",
        )}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            capture.isStale ? "bg-amber-500" : "bg-emerald-500",
          )}
        />
        Captura {formatLag(capture.captureLagMs)}
        {capture.isStale && " — atrasada"}
      </span>
      <span>·</span>
      <span>{capture.inProgressCount} en curso</span>
      <span>·</span>
      <span className={cn(capture.queueFailed > 0 && "text-amber-600")}>
        Cola: {capture.queuePending.toLocaleString("es")} pendientes
        {capture.queueFailed > 0 &&
          ` · ${capture.queueFailed.toLocaleString("es")} fallados`}
      </span>
    </div>
  )
}

