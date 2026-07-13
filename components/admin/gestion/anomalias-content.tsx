"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { format, subDays } from "date-fns"
import { es } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import {
  ArrowRight,
  Bike,
  CalendarDays,
  ChevronRight,
  Clock,
  Download,
  MapPin,
  Navigation,
  Package,
  Ruler,
  Store,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
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
const TYPE_DESCRIPTION: Record<
  string,
  { action: string; place: string; icon: typeof Store }
> = {
  LEFT_ORIGIN_WITHOUT_DELIVERY: {
    action: "Salió del comercio sin marcar En camino",
    place: "Comercio",
    icon: Store,
  },
  LEFT_DESTINATION_WITHOUT_FINALIZE: {
    action: "Se fue del cliente sin marcar Entregado",
    place: "Cliente",
    icon: Navigation,
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

// Tono semántico de cada estado de negocio → mismo color en toda la app.
function statusTone(status: string | null): string {
  switch (status) {
    case "FINALIZED":
      return "bg-success-soft text-success"
    case "CANCELED":
    case "CANCELLED":
    case "CANCELED_BY_CLIENT":
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

function statusLabel(status: string | null): string {
  if (!status) return "—"
  return STATUS_LABEL[status] || status
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
}: {
  children: React.ReactNode
  mono?: boolean
  icon?: typeof Clock
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]",
        mono
          ? "font-[family-name:var(--font-mono)] text-foreground"
          : "text-muted-foreground",
      )}
    >
      {Icon && <Icon className="size-3 text-ink-subtle" />}
      {children}
    </span>
  )
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

function formatEventDate(iso: string): { strong: string; weak: string } {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { strong: iso, weak: "" }
  return {
    strong: format(d, "dd MMM", { locale: es }),
    weak: format(d, "HH:mm", { locale: es }),
  }
}

function formatFullDate(iso: string): string {
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
  const [isExporting, setIsExporting] = useState(false)
  const [hideResolved, setHideResolved] = useState(false)
  const [selected, setSelected] = useState<EventRow | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasFilters = !!(filters.from || filters.to) || filters.type !== "all"

  const visibleRows = useMemo(
    () => (hideResolved ? rows.filter((r) => !markedLater(r)) : rows),
    [rows, hideResolved],
  )
  const hiddenCount = rows.length - visibleRows.length

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
      if (dateRange?.from && !dateRange?.to) {
        const urlFrom = parseYmd(filters.from)
        const urlTo = parseYmd(filters.to)
        setDateRange(urlFrom || urlTo ? { from: urlFrom, to: urlTo } : undefined)
      }
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await fetch("/api/admin/gestion/anomalias/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: filters.type === "all" ? null : filters.type,
          from: filters.from || null,
          to: filters.to || null,
        }),
      })
      if (!res.ok) throw new Error("export failed")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `anomalias_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Exportación completada")
    } catch {
      toast.error("No se pudo exportar. Intentá de nuevo.")
    } finally {
      setIsExporting(false)
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
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Encabezado */}
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[var(--ls-tight)] sm:text-3xl">
          Anomalías
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Drivers que se fueron de un lugar sin marcar el cambio de estado del
          pedido. Detección automática por posición (cron cada minuto).
        </p>
      </div>

      {/* Barra de filtros */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-card p-3 shadow-[var(--shadow-soft)] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          {/* Rango de fechas */}
          <Popover open={datePopoverOpen} onOpenChange={handleDatePopoverOpenChange}>
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
            <PopoverContent align="start" className="flex w-auto flex-col p-0 sm:flex-row">
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

          {/* Tipo — segmented control STUDIO (activo = brand, nunca negro) */}
          <RadioGroupPrimitive.Root
            value={filters.type}
            onValueChange={(v) => updateParams({ type: v === "all" ? null : v })}
            className="inline-flex items-center gap-1 rounded-full bg-muted p-1"
          >
            {TYPE_OPTIONS.map((opt) => {
              const isSelected = filters.type === opt.value
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

          {/* Toggle: ocultar resueltos */}
          <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={hideResolved} onCheckedChange={setHideResolved} />
            Ocultar resueltos
          </label>

          <div className="flex items-center gap-2 lg:ml-auto">
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
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={isExporting || total === 0}
              className="h-9 gap-2"
            >
              <Download className="size-4" />
              {isExporting ? "Exportando..." : "Exportar Excel"}
            </Button>
          </div>
        </div>
      </div>

      {/* Conteo */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          {total.toLocaleString("es-AR")} eventos
          {hasFilters && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              con los filtros activos
            </span>
          )}
          {hideResolved && hiddenCount > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              · {hiddenCount} resueltos ocultos
            </span>
          )}
        </h2>
        {isPending && (
          <span className="text-xs text-muted-foreground">Aplicando...</span>
        )}
      </div>

      {/* Lista de cards */}
      {visibleRows.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          {hasFilters || hideResolved
            ? "Sin eventos con los filtros aplicados."
            : "Todavía no hay eventos detectados. La detección corre cada minuto sobre los pedidos activos."}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {visibleRows.map((r) => (
            <EventCard key={r.id} row={r} onOpen={() => setSelected(r)} />
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
        <SheetContent
          side="right"
          className="w-full gap-0 p-0 sm:max-w-md"
        >
          {selected && <EventDetail row={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function EventCard({ row, onOpen }: { row: EventRow; onOpen: () => void }) {
  const desc = TYPE_DESCRIPTION[row.type] ?? {
    action: row.type,
    place: "—",
    icon: MapPin,
  }
  const Icon = desc.icon
  const date = formatEventDate(row.leftAt)
  const later = markedLater(row)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-[var(--radius-lg)] border border-border bg-card p-3.5 text-left shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-1)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 sm:p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary">
          <Icon className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold leading-tight">{desc.action}</span>
            {later && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                marcó después
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            estaba en {statusLabel(row.stateAtEvent)}
            {row.driverName ? ` · ${row.driverName}` : ""}
            {row.placeName ? ` · ${row.placeName}` : ""}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusPill status={row.currentStatus} />
            <Chip mono icon={Clock}>
              {formatDuration(row.dwellSeconds)}
            </Chip>
            <Chip mono icon={Ruler}>
              {formatDistance(row.distanceAtDetectionM)}
            </Chip>
            {row.externalOrderId && (
              <Chip mono icon={Package}>
                #{row.externalOrderId}
              </Chip>
            )}
            {row.zoneName && <Chip>{row.zoneName}</Chip>}
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

function DetailRow({
  label,
  children,
  mono,
}: {
  label: string
  children: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
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

function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
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

function EventDetail({ row }: { row: EventRow }) {
  const desc = TYPE_DESCRIPTION[row.type] ?? {
    action: row.type,
    place: "—",
    icon: MapPin,
  }
  const Icon = desc.icon
  const later = markedLater(row)

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <SheetTitle className="text-base leading-tight">{desc.action}</SheetTitle>
            <SheetDescription className="font-[family-name:var(--font-mono)] text-xs">
              Evento #{row.id} · detección por GPS
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          <DetailSection title="Estado">
            <DetailRow label="Al irse">
              <StatusPill status={row.stateAtEvent} />
            </DetailRow>
            <DetailRow label="Actual">
              <span className="inline-flex items-center gap-2">
                <StatusPill status={row.currentStatus} />
                {later && (
                  <span className="text-[10px] text-muted-foreground">
                    marcó después
                  </span>
                )}
              </span>
            </DetailRow>
          </DetailSection>

          <DetailSection title="Driver">
            <DetailRow label="Nombre">
              <span className="inline-flex items-center gap-1.5">
                <Bike className="size-3.5 text-ink-subtle" />
                {row.driverName || "—"}
              </span>
            </DetailRow>
            <DetailRow label="Zona">{row.zoneName || "—"}</DetailRow>
          </DetailSection>

          <DetailSection title="Pedido">
            <DetailRow label="N° pedido" mono>
              {row.externalOrderId ? `#${row.externalOrderId}` : "—"}
            </DetailRow>
            <DetailRow label="Request ID" mono>
              <span className="break-all text-xs">{row.requestId}</span>
            </DetailRow>
            <DetailRow label="Lugar">
              {row.placeName || "—"}
              <span className="ml-1 text-xs text-muted-foreground">
                ({desc.place})
              </span>
            </DetailRow>
          </DetailSection>

          <DetailSection title="Señal GPS">
            <DetailRow label="Tiempo en el lugar" mono>
              {formatDuration(row.dwellSeconds)}
            </DetailRow>
            <DetailRow label="Distancia al irse" mono>
              {formatDistance(row.distanceAtDetectionM)}
            </DetailRow>
            {row.otherPlaceDistanceM !== null &&
              row.otherPlaceDistanceM < 350 && (
                <DetailRow
                  label={
                    row.type === "LEFT_ORIGIN_WITHOUT_DELIVERY"
                      ? "Distancia al cliente"
                      : "Distancia al comercio"
                  }
                  mono
                >
                  {formatDistance(row.otherPlaceDistanceM)}
                </DetailRow>
              )}
            <DetailRow label="Se fue" mono>
              {formatFullDate(row.leftAt)}
            </DetailRow>
            <DetailRow label="Detectado" mono>
              {formatFullDate(row.detectedAt)}
            </DetailRow>
          </DetailSection>
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
