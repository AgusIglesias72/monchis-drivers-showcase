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
  ChevronRight,
  Clock,
  Handshake,
  Hash,
  Package,
  Repeat,
  Search,
  ShieldCheck,
  Store,
  Timer,
  Upload,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react"

import { PedidoSearchForm } from "@/components/admin/gestion/pedido-search-form"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
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

const SORT_OPTIONS: { value: "confirmedAt" | "refreshedAt"; label: string }[] = [
  { value: "confirmedAt", label: "Fecha" },
  { value: "refreshedAt", label: "Actualizado" },
]

interface StatusGlyph {
  icon: LucideIcon
  label: string
}

const STATUS_MAP: Record<string, StatusGlyph> = {
  FINALIZED: { icon: CheckCircle2, label: "Entregado" },
  CANCELLED: { icon: XCircle, label: "Cancelado" },
  DELIVERY: { icon: Bike, label: "En camino" },
  OUTSIDE: { icon: Bike, label: "Afuera" },
  WAITING_ORDER: { icon: ChefHat, label: "En el comercio" },
  ACCEPTED: { icon: Handshake, label: "Aceptado" },
  PENDING: { icon: Search, label: "Buscando driver" },
}

function statusGlyph(status: string | null): StatusGlyph {
  if (!status) return { icon: Clock, label: "Desconocido" }
  return STATUS_MAP[status] || { icon: Clock, label: status }
}

function statusLabel(status: string | null): string {
  if (!status) return "—"
  return STATUS_MAP[status]?.label || status
}

// Tono semántico de cada estado de negocio → mismo color en toda la app.
function statusTone(status: string | null): string {
  switch (status) {
    case "FINALIZED":
      return "bg-success-soft text-success"
    case "CANCELLED":
      return "bg-danger-soft text-destructive"
    case "DELIVERY":
    case "ACCEPTED":
      return "bg-info-soft text-info"
    case "OUTSIDE":
    case "WAITING_ORDER":
    case "PENDING":
      return "bg-warning-soft text-warning"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function StatusPill({ status }: { status: string | null }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        statusTone(status),
      )}
    >
      {statusLabel(status)}
    </span>
  )
}

// Chip neutro para métricas (mono) o etiquetas.
function Chip({
  children,
  mono,
  icon: Icon,
  tone,
}: {
  children: React.ReactNode
  mono?: boolean
  icon?: typeof Clock
  tone?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
        tone ??
          (mono
            ? "bg-muted font-[family-name:var(--font-mono)] text-foreground"
            : "bg-muted text-muted-foreground"),
      )}
    >
      {Icon && <Icon className="size-3 text-ink-subtle" />}
      {children}
    </span>
  )
}

const SLOW_ACCEPT = 10 * 60
const LONG_E2E = 60 * 60
const MANY_OFFERS = 3

interface Signal {
  icon: LucideIcon
  tone: string
  label: string
  sub: string
}

// Señales de calidad del pedido con tono semántico (neutral = informativo,
// warning = demora, danger = problema). Sin colores decorativos.
function getSignals(row: OrderRow): Signal[] {
  const signals: Signal[] = []
  if (row.hasAdminChange) {
    signals.push({
      icon: ShieldCheck,
      tone: "bg-muted text-muted-foreground",
      label: "Cambio admin",
      sub: "Hubo intervención manual en algún estado",
    })
  }
  if (row.acceptanceSeconds !== null && row.acceptanceSeconds > SLOW_ACCEPT) {
    signals.push({
      icon: Timer,
      tone: "bg-warning-soft text-warning",
      label: "Aceptación lenta",
      sub: `${formatDuration(row.acceptanceSeconds)} desde la oferta`,
    })
  }
  if (row.offersWithDriverCount >= MANY_OFFERS) {
    signals.push({
      icon: Repeat,
      tone: "bg-warning-soft text-warning",
      label: "Muchas ofertas",
      sub: `${row.offersWithDriverCount} drivers ofertados antes de aceptar`,
    })
  }
  if (row.endToEndSeconds !== null && row.endToEndSeconds > LONG_E2E) {
    signals.push({
      icon: AlertTriangle,
      tone: "bg-danger-soft text-destructive",
      label: "Entrega larga",
      sub: `${formatDuration(row.endToEndSeconds)} end-to-end`,
    })
  }
  return signals
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

// Fecha completa para un instante del pedido (wall-clock PY, ver formatOrderDate).
function formatFullOrderDate(iso: string | null): string {
  if (!iso) return "—"
  const d = parseOrderInstant(iso)
  if (!d) return iso
  return format(d, "dd MMM yyyy, HH:mm", { locale: es })
}

// Fecha completa para timestamps reales del cache (refreshedAt), sin plantado.
function formatFullRealDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return format(d, "dd MMM yyyy, HH:mm", { locale: es })
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
  const [selected, setSelected] = useState<OrderRow | null>(null)

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
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[var(--ls-tight)] sm:text-3xl">
            Pedidos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Tabla completa de pedidos cacheados desde la API de Monchis. Click
            en uno para ver el detalle.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/admin/gestion/pedidos/import">
            <Upload className="size-4" />
            Importar en bloque
          </Link>
        </Button>
      </div>

      <CaptureStatusBar capture={capture} />

      {/* Búsqueda directa por request_id (atajo a detalle) */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
          Ir directo a un pedido
        </div>
        <PedidoSearchForm />
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          ID interno (24 hex) — abre la página del pedido. Para buscar en la
          lista, usá el filtro debajo.
        </p>
      </div>

      {/* Filtros */}
      <div className="space-y-4 rounded-[var(--radius-xl)] border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center"
        >
          {/* Search: full width on mobile, grow on desktop */}
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
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
                <X className="size-3.5" />
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
                  "h-9 min-w-[200px] justify-start gap-2 font-normal",
                  !dateRange?.from && !dateRange?.to && "text-muted-foreground",
                )}
              >
                <CalendarDays className="size-4 shrink-0" />
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
                    <X className="size-3.5" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="flex w-auto flex-col p-0 sm:flex-row"
            >
              <div className="flex min-w-[140px] flex-row flex-wrap gap-1 border-b p-2 sm:flex-col sm:border-b-0 sm:border-r">
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
                    className="h-8 justify-start text-xs sm:w-full"
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

          {/* Estado — segmented control STUDIO (activo = brand, nunca negro) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
              Estado
            </span>
            <RadioGroupPrimitive.Root
              value={filters.status}
              onValueChange={(v) =>
                updateParams({ status: v === "all" ? null : v })
              }
              className="inline-flex items-center gap-1 rounded-full bg-muted p-1"
            >
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = filters.status === opt.value
                return (
                  <RadioGroupPrimitive.Item
                    key={opt.value}
                    value={opt.value}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                      isSelected
                        ? "bg-card text-primary shadow-[var(--shadow-soft)]"
                        : "text-muted-foreground hover:text-foreground",
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
            <span className="text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
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

        {/* Orden — pills STUDIO con dirección */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
            Ordenar
          </span>
          <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-muted p-1">
            {SORT_OPTIONS.map((opt) => {
              const isSelected = filters.sortBy === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSort(opt.value)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                    isSelected
                      ? "bg-card text-primary shadow-[var(--shadow-soft)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                  {isSelected &&
                    (filters.sortOrder === "asc" ? (
                      <ArrowUp className="size-3" />
                    ) : (
                      <ArrowDown className="size-3" />
                    ))}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Conteo */}
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

      {/* Lista de cards */}
      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          {hasFilters
            ? "Sin resultados con los filtros aplicados."
            : "Todavía no hay pedidos cacheados. Importá un CSV o buscá por ID."}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {rows.map((r) => (
            <OrderCard key={r.requestId} row={r} onOpen={() => setSelected(r)} />
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground shadow-[var(--shadow-soft)]">
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

      {/* Drawer de detalle */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          {selected && <OrderDetail row={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function OrderCard({ row, onOpen }: { row: OrderRow; onOpen: () => void }) {
  const glyph = statusGlyph(row.status)
  const StatusIcon = glyph.icon
  const date = formatOrderDate(row.confirmedAt)
  const signals = getSignals(row)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-[var(--radius-lg)] border border-border bg-card p-3.5 text-left shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-1)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 sm:p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary">
          <StatusIcon className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-[family-name:var(--font-mono)] font-semibold leading-tight">
              {row.externalOrderId ? `#${row.externalOrderId}` : "—"}
            </span>
            <StatusPill status={row.status} />
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {row.branchName || "—"}
            {row.driverName ? ` · ${row.driverName}` : ""}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {row.endToEndSeconds !== null && (
              <Chip mono icon={Timer}>
                {formatDuration(row.endToEndSeconds)}
              </Chip>
            )}
            {row.acceptanceSeconds !== null && (
              <Chip mono icon={Clock}>
                {formatDuration(row.acceptanceSeconds)}
              </Chip>
            )}
            {row.offersWithDriverCount > 0 && (
              <Chip mono icon={Repeat}>
                {row.offersWithDriverCount} of.
              </Chip>
            )}
            {signals.map((s) => (
              <Chip key={s.label} icon={s.icon} tone={s.tone}>
                {s.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="font-[family-name:var(--font-mono)] text-xs font-medium">
            {date.strong}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground">
            {date.weak}
          </span>
          <ChevronRight className="mt-1 size-4 text-ink-subtle transition-colors group-hover:text-primary" />
        </div>
      </div>
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--ls-label)] text-ink-subtle">
        {title}
      </h3>
      <div className="divide-y divide-border rounded-[var(--radius-md)] border border-border bg-surface-3/40 px-3">
        {children}
      </div>
    </div>
  )
}

function Field({
  icon,
  label,
  children,
  mono,
}: {
  icon?: React.ReactNode
  label: string
  children: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        {icon && <span className="text-ink-subtle">{icon}</span>}
        {label}
      </span>
      <span
        className={cn(
          "text-right text-sm",
          mono && "font-[family-name:var(--font-mono)]",
        )}
      >
        {children}
      </span>
    </div>
  )
}

function OrderDetail({ row }: { row: OrderRow }) {
  const glyph = statusGlyph(row.status)
  const StatusIcon = glyph.icon
  const signals = getSignals(row)

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary">
            <StatusIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <SheetTitle className="font-[family-name:var(--font-mono)] text-base leading-tight">
              {row.externalOrderId ? `#${row.externalOrderId}` : "Pedido"}
            </SheetTitle>
            <SheetDescription className="font-[family-name:var(--font-mono)] text-xs">
              …{row.requestId.slice(-8)}
            </SheetDescription>
          </div>
          <div className="ml-auto">
            <StatusPill status={row.status} />
          </div>
        </div>
      </SheetHeader>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          <Section title="Pedido">
            <Field icon={<Hash className="size-3.5" />} label="N° pedido" mono>
              {row.externalOrderId ? `#${row.externalOrderId}` : "—"}
            </Field>
            <Field icon={<Package className="size-3.5" />} label="Request ID" mono>
              <span className="break-all text-xs">{row.requestId}</span>
            </Field>
            <Field icon={<Store className="size-3.5" />} label="Comercio">
              {row.branchName || "—"}
            </Field>
            <Field icon={<Bike className="size-3.5" />} label="Driver">
              {row.driverName || "—"}
            </Field>
          </Section>

          <Section title="Tiempos">
            <Field icon={<CalendarDays className="size-3.5" />} label="Confirmado" mono>
              {formatFullOrderDate(row.confirmedAt)}
            </Field>
            <Field icon={<CheckCircle2 className="size-3.5" />} label="Finalizado" mono>
              {formatFullOrderDate(row.finalizedAt)}
            </Field>
            <Field icon={<Clock className="size-3.5" />} label="Aceptación" mono>
              {formatDuration(row.acceptanceSeconds)}
            </Field>
            <Field icon={<Timer className="size-3.5" />} label="End-to-end" mono>
              {formatDuration(row.endToEndSeconds)}
            </Field>
            <Field icon={<Repeat className="size-3.5" />} label="Ofertas" mono>
              {row.offersWithDriverCount}
            </Field>
            <Field icon={<Clock className="size-3.5" />} label="Refrescado" mono>
              {formatFullRealDate(row.refreshedAt)}
            </Field>
          </Section>

          <Section title="Señales">
            {signals.length === 0 ? (
              <div className="py-2 text-xs text-muted-foreground">
                Sin señales — pedido sin anomalías detectadas.
              </div>
            ) : (
              signals.map((s) => {
                const Icon = s.icon
                return (
                  <div
                    key={s.label}
                    className="flex items-start gap-2.5 py-2"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full",
                        s.tone,
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-tight">
                        {s.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.sub}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </Section>
        </div>
      </ScrollArea>

      <SheetFooter className="border-t border-border">
        <Button asChild className="w-full">
          <Link href={`/admin/gestion/pedidos/${row.requestId}`}>
            Ver pedido completo
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </SheetFooter>
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
  const alert = capture.isStale || capture.queueFailed > 0
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-[var(--radius-lg)] border px-4 py-2.5 text-xs shadow-[var(--shadow-soft)]",
        alert
          ? "border-warning/40 bg-warning-soft text-warning"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-medium">
        <span
          className={cn(
            "size-2 rounded-full",
            capture.isStale ? "bg-warning" : "bg-success",
          )}
        />
        Captura{" "}
        <span className="font-[family-name:var(--font-mono)]">
          {formatLag(capture.captureLagMs)}
        </span>
        {capture.isStale && " — atrasada"}
      </span>
      <span className="text-ink-subtle">·</span>
      <span className="font-[family-name:var(--font-mono)]">
        {capture.inProgressCount} en curso
      </span>
      <span className="text-ink-subtle">·</span>
      <span className="font-[family-name:var(--font-mono)]">
        Cola: {capture.queuePending.toLocaleString("es")} pendientes
        {capture.queueFailed > 0 &&
          ` · ${capture.queueFailed.toLocaleString("es")} fallados`}
      </span>
    </div>
  )
}
