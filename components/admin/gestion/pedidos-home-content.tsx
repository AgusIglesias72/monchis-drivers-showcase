"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { format, formatDistanceToNow, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bike,
  CheckCircle2,
  ChefHat,
  Clock,
  Filter,
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
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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

interface Props {
  rows: OrderRow[]
  total: number
  page: number
  pageSize: number
  filters: FilterState
  queuePending: number
  queueDone: number
  queueTotal: number
  globalStats: {
    total: number
    finalized: number
    cancelled: number
    withAdminChange: number
  }
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
  OUTSIDE: { icon: Bike, hex: "#0891b2", label: "Llegando al cliente" },
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
  const d = parseOrderInstant(iso)
  if (!d) return { strong: iso, weak: "" }
  return {
    strong: format(d, "dd MMM", { locale: es }),
    weak: format(d, "HH:mm", { locale: es }),
  }
}

export function PedidosHomeContent({
  rows,
  total,
  page,
  pageSize,
  filters,
  queuePending,
  queueDone,
  queueTotal,
  globalStats,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(filters.q)
  const [fromInput, setFromInput] = useState(filters.from)
  const [toInput, setToInput] = useState(filters.to)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const queuePct =
    queueTotal > 0
      ? Math.round(((queueTotal - queuePending) / queueTotal) * 100)
      : 0
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
      from: fromInput || null,
      to: toInput || null,
    })
  }

  const handleClearAll = () => {
    setSearchInput("")
    setFromInput("")
    setToInput("")
    startTransition(() => {
      router.push(`/admin/gestion/pedidos`)
    })
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

        {queuePending > 0 && (
          <Link
            href="/admin/gestion/pedidos/import"
            className="block rounded-lg border border-blue-200 bg-blue-50/60 p-3 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center justify-between gap-3 text-sm">
              <div>
                <div className="font-medium text-blue-900">
                  Cola de importación: {queuePending.toLocaleString("es-AR")} pendientes
                </div>
                <div className="text-xs text-blue-700/80">
                  {queueDone.toLocaleString("es-AR")} ya procesados ({queuePct}%)
                </div>
              </div>
              <div className="h-2 w-32 rounded-full bg-blue-200 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${queuePct}%` }}
                />
              </div>
            </div>
          </Link>
        )}

        {/* KPIs globales */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiPill label="Total cacheados" value={globalStats.total} />
          <KpiPill
            label="Entregados"
            value={globalStats.finalized}
            variant="emerald"
          />
          <KpiPill
            label="Cancelados"
            value={globalStats.cancelled}
            variant="rose"
          />
          <KpiPill
            label="Con cambio admin"
            value={globalStats.withAdminChange}
            variant="fuchsia"
          />
        </div>

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
          <CardContent className="p-4 space-y-3">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1 block">
                    Buscar
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="request_id, external_order_id, driver, comercio"
                      className="pl-8"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => setSearchInput("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1 block">
                    Desde
                  </label>
                  <Input
                    type="date"
                    value={fromInput}
                    onChange={(e) => setFromInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1 block">
                    Hasta
                  </label>
                  <Input
                    type="date"
                    value={toInput}
                    onChange={(e) => setToInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground block">
                    Estado
                  </label>
                  <RadioGroupPrimitive.Root
                    value={filters.status}
                    onValueChange={(v) => updateParams({ status: v === "all" ? null : v })}
                    className="flex flex-wrap gap-1.5"
                  >
                    {STATUS_OPTIONS.map((opt) => {
                      const isSelected = filters.status === opt.value
                      return (
                        <RadioGroupPrimitive.Item
                          key={opt.value}
                          value={opt.value}
                          className={cn(
                            "rounded-md border px-3 py-1.5 text-xs transition-colors outline-none",
                            "hover:bg-accent hover:text-accent-foreground",
                            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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

                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground block">
                    Señal
                  </label>
                  <Select
                    value={filters.signal}
                    onValueChange={(v) => updateParams({ signal: v === "all" ? null : v })}
                  >
                    <SelectTrigger className="h-8 w-[220px]">
                      <SelectValue />
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

                <Button type="submit" disabled={isPending}>
                  Aplicar
                </Button>
                {hasFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClearAll}
                    disabled={isPending}
                    className="gap-1"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Limpiar todo
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
                        <SortHeader
                          label="Consultado"
                          sortKey="refreshedAt"
                          activeSortBy={filters.sortBy}
                          activeSortOrder={filters.sortOrder}
                          onSort={handleSort}
                        />
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
        <div className="font-medium">
          {row.externalOrderId ? `#${row.externalOrderId}` : "—"}
        </div>
        <div className="text-[10px] text-muted-foreground font-mono">
          {row.requestId.slice(0, 8)}…
        </div>
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

      <td className="px-4 py-2.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(parseISO(row.refreshedAt), {
            addSuffix: true,
            locale: es,
          })}
        </span>
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

function KpiPill({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant?: "emerald" | "rose" | "fuchsia"
}) {
  const colors =
    variant === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : variant === "rose"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : variant === "fuchsia"
          ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900"
          : "border-border bg-card"
  return (
    <div className={`rounded-lg border p-3 ${colors}`}>
      <div className="text-[10px] uppercase tracking-wide font-medium opacity-70">
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums mt-0.5">
        {value.toLocaleString("es-AR")}
      </div>
    </div>
  )
}
