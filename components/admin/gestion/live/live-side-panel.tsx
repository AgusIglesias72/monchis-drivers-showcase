"use client"

import { Fragment, useMemo, useState } from "react"
import Link from "next/link"
import {
  Bike,
  BikeIcon,
  Building2,
  ChefHat,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Handshake,
  LayoutGrid,
  List,
  MapPin,
  Navigation,
  Phone,
  Search,
  ShoppingBag,
  Timer,
  type LucideIcon,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { PedidoFilter } from "@/components/admin/gestion/live/live-filters"
import type {
  LiveDriver,
  LiveRequest,
  LiveZone,
} from "@/lib/types/live-panel.types"

type Highlight =
  | { kind: "request" | "driver" | "zone" | "commerce"; id: string }
  | null
type FilterKey = PedidoFilter

interface FilterDef {
  key: FilterKey
  label: string
  icon: LucideIcon
  bg: string
  bgActive: string
}

const FILTERS: FilterDef[] = [
  {
    key: "all",
    label: "Todos",
    icon: ShoppingBag,
    bg: "bg-muted hover:bg-muted/80",
    bgActive: "bg-foreground text-background hover:bg-foreground/90",
  },
  {
    key: "delayed",
    label: "Demorados",
    icon: Timer,
    bg: "bg-destructive/10 hover:bg-destructive/15 text-destructive",
    bgActive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
  {
    key: "PENDING",
    label: "Buscando driver",
    icon: Search,
    bg: "bg-amber-100/60 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
    bgActive: "bg-amber-500 text-white hover:bg-amber-600",
  },
  {
    key: "ACCEPTED",
    label: "Aceptado",
    icon: Handshake,
    bg: "bg-violet-100/60 hover:bg-violet-100 text-violet-800 dark:bg-violet-950/30 dark:text-violet-300",
    bgActive: "bg-violet-500 text-white hover:bg-violet-600",
  },
  {
    key: "WAITING_ORDER",
    label: "En el comercio",
    icon: ChefHat,
    bg: "bg-sky-100/60 hover:bg-sky-100 text-sky-800 dark:bg-sky-950/30 dark:text-sky-300",
    bgActive: "bg-sky-500 text-white hover:bg-sky-600",
  },
  {
    key: "DELIVERY",
    label: "En camino",
    icon: Bike,
    bg: "bg-blue-100/60 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
    bgActive: "bg-blue-600 text-white hover:bg-blue-700",
  },
  {
    key: "OUTSIDE",
    label: "Llegando",
    icon: Navigation,
    bg: "bg-cyan-100/60 hover:bg-cyan-100 text-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-300",
    bgActive: "bg-cyan-600 text-white hover:bg-cyan-700",
  },
]

interface Props {
  pending: LiveRequest[]
  delayed: LiveRequest[]
  active: LiveRequest[]
  drivers: LiveDriver[]
  zones: LiveZone[]
  highlight: Highlight
  onHighlight: (h: Highlight) => void
  filter: FilterKey
  onFilterChange: (f: FilterKey) => void
}

function elapsedMinutesSince(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return null
  return Math.floor(ms / 60000)
}

function formatElapsed(minutes: number | null): string {
  if (minutes === null) return "—"
  if (minutes < 1) return "<1m"
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function bucketTone(
  minutes: number | null,
): "fresh" | "warm" | "hot" | "critical" {
  if (minutes === null) return "fresh"
  if (minutes < 3) return "fresh"
  if (minutes < 7) return "warm"
  if (minutes < 15) return "hot"
  return "critical"
}

function formatGuaranies(raw: string | null): string {
  if (!raw) return "—"
  const n = Math.round(Number(raw))
  if (isNaN(n)) return "—"
  return n.toLocaleString("es-PY")
}

function stateLabel(state: string | null): string {
  switch (state) {
    case "PENDING":
      return "Buscando driver"
    case "ACCEPTED":
      return "Aceptado"
    case "WAITING_ORDER":
      return "En el comercio"
    case "DELIVERY":
      return "En camino"
    case "OUTSIDE":
      return "Llegando al cliente"
    case "ASSIGNED":
    case "ASSIGNED_DELIVERY":
      return "Asignado por admin"
    case "ASSIGNED_PICKUP":
      return "Pickup asignado"
    case "FINALIZED":
      return "Entregado"
    case "CANCELLED":
      return "Cancelado"
    default:
      return state || "—"
  }
}

export function LiveSidePanel({
  pending,
  delayed,
  active,
  drivers,
  zones,
  highlight,
  onHighlight,
  filter,
  onFilterChange,
}: Props) {
  return (
    <Card className="overflow-hidden">
      <Tabs defaultValue="pedidos" className="w-full">
        <div className="border-b bg-muted/30 px-3 py-1.5">
          <TabsList className="inline-flex h-8 bg-background p-0.5">
            <TabsTrigger
              value="pedidos"
              className="gap-1.5 px-3 text-[12px] data-[state=active]:shadow-sm"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Pedidos
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold tabular-nums">
                {pending.length + active.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="drivers"
              className="gap-1.5 px-3 text-[12px] data-[state=active]:shadow-sm"
            >
              <BikeIcon className="h-3.5 w-3.5" />
              Drivers
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold tabular-nums">
                {drivers.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pedidos" className="m-0">
          <PedidosTab
            pending={pending}
            delayed={delayed}
            active={active}
            highlight={highlight}
            onHighlight={onHighlight}
            filter={filter}
            onFilterChange={onFilterChange}
          />
        </TabsContent>

        <TabsContent value="drivers" className="m-0">
          <DriversTab
            drivers={drivers}
            zones={zones}
            highlight={highlight}
            onHighlight={onHighlight}
          />
        </TabsContent>
      </Tabs>
    </Card>
  )
}

// ============================================================================
// Pedidos: chips de filtro + grid de cards
// ============================================================================

type PedidosViewMode = "cards" | "table"

export function PedidosTab({
  pending,
  delayed,
  active,
  highlight,
  onHighlight,
  filter,
  onFilterChange,
}: {
  pending: LiveRequest[]
  delayed: LiveRequest[]
  active: LiveRequest[]
  highlight: Highlight
  onHighlight: (h: Highlight) => void
  filter: FilterKey
  onFilterChange: (f: FilterKey) => void
}) {
  const [viewMode, setViewMode] = useState<PedidosViewMode>("cards")

  // Dedup por requestId — la API legacy a veces devuelve el mismo pedido en
  // `pending` y en `active` (race entre polls). Preferimos la versión de
  // `active` que viene enriquecida con driver + zona desde drivers_status.
  const allRequests = useMemo(() => {
    const m = new Map<string, LiveRequest>()
    for (const r of pending) m.set(r.requestId, r)
    for (const r of active) m.set(r.requestId, r)
    return [...m.values()]
  }, [pending, active])
  const delayedSet = useMemo(
    () => new Set(delayed.map((r) => r.requestId)),
    [delayed],
  )

  const counts = useMemo(() => {
    const out: Record<FilterKey, number> = {
      all: allRequests.length,
      delayed: delayed.length,
      PENDING: 0,
      ACCEPTED: 0,
      WAITING_ORDER: 0,
      DELIVERY: 0,
      OUTSIDE: 0,
    }
    for (const r of allRequests) {
      const s = r.state as FilterKey | null
      if (s && s in out) out[s] += 1
    }
    return out
  }, [allRequests, delayed.length])

  const filtered = useMemo(() => {
    let result: LiveRequest[]
    if (filter === "all") result = allRequests
    else if (filter === "delayed") {
      result = allRequests.filter(
        (r) => r.isDelayed || delayedSet.has(r.requestId),
      )
    } else {
      result = allRequests.filter((r) => r.state === filter)
    }
    // Ordenamos por antigüedad en el estado actual (asc por timestamp =
    // los que llevan más tiempo aparecen primero, que es lo que requiere
    // atención operativa).
    return [...result].sort((a, b) => {
      const ta = a.currentStateSince
        ? new Date(a.currentStateSince).getTime()
        : Number.POSITIVE_INFINITY
      const tb = b.currentStateSince
        ? new Date(b.currentStateSince).getTime()
        : Number.POSITIVE_INFINITY
      return ta - tb
    })
  }, [allRequests, filter, delayedSet])

  return (
    <div>
      {/* Chips de filtro + toggle de vista */}
      <div className="flex flex-wrap items-start gap-3 border-b bg-muted/20 p-3">
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Filtrar:
          </span>
          {FILTERS.map((f) => {
            const isActive = filter === f.key
            const count = counts[f.key]
            const Icon = f.icon
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => onFilterChange(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  isActive ? f.bgActive : f.bg
                }`}
                title={f.label}
              >
                <Icon className="h-3 w-3" />
                <span>{f.label}</span>
                <span
                  className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                    isActive
                      ? "bg-white/25 text-current"
                      : "bg-foreground/10 text-current"
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          message={
            filter === "all"
              ? "No hay pedidos en el sistema"
              : "No hay pedidos en este estado"
          }
        />
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((r) => (
            <PedidoCard
              key={r.requestId}
              r={r}
              isDelayed={r.isDelayed || delayedSet.has(r.requestId)}
              isHighlighted={
                highlight?.kind === "request" && highlight.id === r.requestId
              }
              onClick={() =>
                onHighlight(
                  highlight?.kind === "request" &&
                    highlight.id === r.requestId
                    ? null
                    : { kind: "request", id: r.requestId },
                )
              }
            />
          ))}
        </div>
      ) : (
        <PedidosTable
          requests={filtered}
          delayedSet={delayedSet}
          highlight={highlight}
          onHighlight={onHighlight}
        />
      )}
    </div>
  )
}

function ViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: PedidosViewMode
  onChange: (m: PedidosViewMode) => void
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-md border bg-background p-0.5">
      <button
        type="button"
        onClick={() => onChange("cards")}
        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition ${
          viewMode === "cards"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Vista en cards"
      >
        <LayoutGrid className="h-3 w-3" />
        Cards
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition ${
          viewMode === "table"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Vista en tabla"
      >
        <List className="h-3 w-3" />
        Tabla
      </button>
    </div>
  )
}

function PedidoCard({
  r,
  isDelayed,
  isHighlighted,
  onClick,
}: {
  r: LiveRequest
  isDelayed: boolean
  isHighlighted: boolean
  onClick: () => void
}) {
  const stateMin = elapsedMinutesSince(r.currentStateSince || r.createdAt)
  const stateTone = bucketTone(stateMin)
  const totalMin = elapsedMinutesSince(r.confirmedAt || r.createdAt)

  const stateToneCard =
    stateTone === "critical"
      ? "border-red-300 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20"
      : stateTone === "hot"
        ? "border-orange-300 bg-orange-50/40 dark:border-orange-900 dark:bg-orange-950/20"
        : stateTone === "warm"
          ? "border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/20"
          : ""

  const stateBadgeColor: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300",
    ACCEPTED: "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-300",
    WAITING_ORDER: "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-300",
    DELIVERY: "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300",
    OUTSIDE: "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-300",
    ASSIGNED: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
    ASSIGNED_DELIVERY: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
    ASSIGNED_PICKUP: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  }
  const stateBadgeClass = r.state
    ? stateBadgeColor[r.state]
    : "bg-muted text-foreground/70"

  const stateBadgeBig =
    stateTone === "critical"
      ? "bg-red-500 text-white"
      : stateTone === "hot"
        ? "bg-orange-500 text-white"
        : stateTone === "warm"
          ? "bg-amber-500 text-white"
          : "bg-emerald-500 text-white"

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={`group cursor-pointer overflow-hidden rounded-lg border bg-card transition hover:shadow-md ${stateToneCard} ${
        isHighlighted ? "ring-2 ring-foreground/30" : ""
      } ${isDelayed ? "border-l-4 border-l-destructive" : ""}`}
    >
      {/* Header: ID + estado + acciones */}
      <div className="flex items-center justify-between gap-2 border-b bg-card/50 px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="inline-flex h-5 items-center rounded bg-muted px-1.5 font-mono text-[11px] font-bold tabular-nums">
            #{r.externalOrderId || "?"}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${stateBadgeClass}`}
          >
            {stateLabel(r.state)}
          </span>
          {isDelayed && (
            <span className="inline-flex items-center gap-0.5 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive-foreground">
              <Timer className="h-2.5 w-2.5" />
              Demorado
            </span>
          )}
        </div>
        <Link
          href={`/admin/gestion/pedidos/${r.requestId}`}
          target="_blank"
          className="text-muted-foreground opacity-60 transition hover:text-foreground group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
          title="Abrir detalle"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Body */}
      <div className="space-y-2 p-3">
        {/* Comercio */}
        <div className="flex items-start gap-1.5">
          <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
          <span className="text-[13px] font-semibold leading-tight break-words">
            {r.origin?.name || "Comercio sin nombre"}
          </span>
        </div>

        {/* Driver / Zona */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-2 text-[11px]">
          {r.driverName ? (
            <span className="inline-flex items-center gap-1">
              <BikeIcon className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium text-foreground/85">
                {r.driverName}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 italic text-muted-foreground">
              <Search className="h-3 w-3" />
              Sin driver
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            {r.zoneColor ? (
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: r.zoneColor }}
              />
            ) : (
              <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/30" />
            )}
            <span className="text-muted-foreground">
              {r.zoneName || "Sin zona"}
            </span>
          </span>
          {r.totalOrder && (
            <span className="inline-flex items-center gap-1 font-medium text-foreground/85">
              <CreditCard className="h-3 w-3 text-muted-foreground" />₲{" "}
              {formatGuaranies(r.totalOrder)}
            </span>
          )}
        </div>
      </div>

      {/* Footer: tiempos */}
      <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-3 py-2">
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold tabular-nums ${stateBadgeBig}`}
          title="Tiempo en el estado actual"
        >
          <Timer className="h-3 w-3" />
          {formatElapsed(stateMin)} en estado
        </span>
        <span
          className="text-[10px] tabular-nums text-muted-foreground"
          title="Antigüedad total desde la confirmación del pedido"
        >
          Total: {formatElapsed(totalMin)}
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// Pedidos: tabla con filas expandibles
// ============================================================================

function PedidosTable({
  requests,
  delayedSet,
  highlight,
  onHighlight,
}: {
  requests: LiveRequest[]
  delayedSet: Set<string>
  highlight: Highlight
  onHighlight: (h: Highlight) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30">
          <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="w-8 px-2 py-2"></th>
            <th className="px-2 py-2 text-left font-semibold">ID</th>
            <th className="px-2 py-2 text-left font-semibold">Estado</th>
            <th className="px-2 py-2 text-left font-semibold">En estado</th>
            <th className="px-2 py-2 text-left font-semibold">Comercio</th>
            <th className="hidden px-2 py-2 text-left font-semibold lg:table-cell">
              Driver
            </th>
            <th className="hidden px-2 py-2 text-left font-semibold xl:table-cell">
              Zona
            </th>
            <th className="hidden px-2 py-2 text-right font-semibold md:table-cell">
              Total
            </th>
            <th className="w-8 px-2 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const isExpanded = expandedId === r.requestId
            const isDelayed = r.isDelayed || delayedSet.has(r.requestId)
            const isHighlighted =
              highlight?.kind === "request" && highlight.id === r.requestId
            const stateMin = elapsedMinutesSince(
              r.currentStateSince || r.createdAt,
            )
            const totalMin = elapsedMinutesSince(r.confirmedAt || r.createdAt)
            const tone = bucketTone(stateMin)
            const stateBadgeClass = r.state
              ? STATE_BADGE_TABLE[r.state] ?? "bg-muted text-foreground/70"
              : "bg-muted text-foreground/70"
            const timeBadge = TONE_BADGE[tone]

            return (
              <Fragment key={r.requestId}>
                <tr
                  onClick={() =>
                    setExpandedId(isExpanded ? null : r.requestId)
                  }
                  className={`cursor-pointer border-b transition hover:bg-muted/30 ${
                    isExpanded ? "bg-muted/40" : ""
                  } ${isHighlighted ? "ring-1 ring-inset ring-foreground/30" : ""} ${
                    isDelayed
                      ? "border-l-2 border-l-destructive"
                      : ""
                  }`}
                >
                  <td className="px-2 py-2 align-middle">
                    <ChevronRight
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <span className="inline-flex items-center rounded bg-muted px-1.5 font-mono text-[11px] font-bold tabular-nums">
                      #{r.externalOrderId || "?"}
                    </span>
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${stateBadgeClass}`}
                      >
                        {stateLabel(r.state)}
                      </span>
                      {isDelayed && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive-foreground">
                          <Timer className="h-2.5 w-2.5" />
                          Demorado
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold tabular-nums ${timeBadge}`}
                    >
                      <Timer className="h-3 w-3" />
                      {formatElapsed(stateMin)}
                    </span>
                  </td>
                  <td className="max-w-[180px] px-2 py-2 align-middle">
                    <div className="truncate text-[12px] font-medium">
                      {r.origin?.name || "—"}
                    </div>
                  </td>
                  <td className="hidden max-w-[140px] px-2 py-2 align-middle lg:table-cell">
                    <div className="truncate text-[12px]">
                      {r.driverName ? (
                        r.driverName
                      ) : (
                        <span className="italic text-muted-foreground">
                          Sin driver
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="hidden max-w-[120px] px-2 py-2 align-middle xl:table-cell">
                    <div className="flex items-center gap-1">
                      {r.zoneColor ? (
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: r.zoneColor }}
                        />
                      ) : (
                        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-muted-foreground/30" />
                      )}
                      <span className="truncate text-[11px] text-muted-foreground">
                        {r.zoneName || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-2 py-2 text-right align-middle font-mono text-[11px] tabular-nums md:table-cell">
                    {r.totalOrder ? `₲ ${formatGuaranies(r.totalOrder)}` : "—"}
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <Link
                      href={`/admin/gestion/pedidos/${r.requestId}`}
                      target="_blank"
                      className="inline-flex text-muted-foreground hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                      title="Abrir detalle completo"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="border-b bg-muted/20">
                    <td colSpan={9} className="px-4 py-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <ExpandedField
                          icon={<Building2 className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />}
                          label="Comercio"
                        >
                          <div className="text-[12px] font-medium">
                            {r.origin?.name || "—"}
                          </div>
                          {r.origin?.address && (
                            <div className="text-[11px] text-muted-foreground">
                              {r.origin.address}
                            </div>
                          )}
                        </ExpandedField>
                        <ExpandedField
                          icon={<MapPin className="h-3 w-3 text-red-700 dark:text-red-400" />}
                          label="Destino"
                        >
                          <div className="text-[12px] font-medium">
                            {r.destination?.name || "—"}
                          </div>
                          {r.destination?.address && (
                            <div className="text-[11px] text-muted-foreground">
                              {r.destination.address}
                            </div>
                          )}
                        </ExpandedField>
                        <ExpandedField label="Tiempos">
                          <div className="text-[12px]">
                            En estado:{" "}
                            <strong className="tabular-nums">
                              {formatElapsed(stateMin)}
                            </strong>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Total: {formatElapsed(totalMin)}
                          </div>
                          {r.totalOrder && (
                            <div className="mt-1 text-[11px]">
                              <CreditCard className="mr-1 inline h-3 w-3 text-muted-foreground" />
                              ₲ {formatGuaranies(r.totalOrder)}
                            </div>
                          )}
                        </ExpandedField>
                        <ExpandedField label="Acciones">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onHighlight({
                                kind: "request",
                                id: r.requestId,
                              })
                            }}
                            className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted"
                          >
                            <Search className="h-3 w-3" />
                            Ver detalle
                          </button>
                          {r.driverPhone && (
                            <a
                              href={`https://wa.me/${r.driverPhone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 inline-flex items-center gap-1 rounded-md border bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400"
                            >
                              <Phone className="h-3 w-3" />
                              WhatsApp driver
                            </a>
                          )}
                          <Link
                            href={`/admin/gestion/pedidos/${r.requestId}`}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Detalle completo
                          </Link>
                        </ExpandedField>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ExpandedField({
  label,
  icon,
  children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      {children}
    </div>
  )
}

const STATE_BADGE_TABLE: Record<string, string> = {
  PENDING:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300",
  ACCEPTED:
    "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-300",
  WAITING_ORDER:
    "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-300",
  DELIVERY:
    "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300",
  OUTSIDE: "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-300",
  ASSIGNED:
    "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  ASSIGNED_DELIVERY:
    "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  ASSIGNED_PICKUP:
    "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
}

const TONE_BADGE: Record<
  ReturnType<typeof bucketTone>,
  string
> = {
  fresh: "bg-emerald-500 text-white",
  warm: "bg-amber-500 text-white",
  hot: "bg-orange-500 text-white",
  critical: "bg-red-500 text-white",
}

// ============================================================================
// Drivers: filtros + grid de cards
// ============================================================================

export function DriversTab({
  drivers,
  zones,
  highlight,
  onHighlight,
}: {
  drivers: LiveDriver[]
  zones: LiveZone[]
  highlight: Highlight
  onHighlight: (h: Highlight) => void
}) {
  type DriverFilter = "all" | "libres" | "ocupados" | "no_disponibles"
  const [filter, setFilter] = useState<DriverFilter>("all")

  const counts = useMemo(() => {
    const out = {
      all: drivers.length,
      libres: 0,
      ocupados: 0,
      no_disponibles: 0,
    }
    for (const d of drivers) {
      if (d.hasActive) out.ocupados += 1
      else if (d.available) out.libres += 1
      else out.no_disponibles += 1
    }
    return out
  }, [drivers])

  const filtered = useMemo(() => {
    if (filter === "all") return drivers
    if (filter === "libres") return drivers.filter((d) => !d.hasActive && d.available)
    if (filter === "ocupados") return drivers.filter((d) => d.hasActive)
    return drivers.filter((d) => !d.hasActive && !d.available)
  }, [drivers, filter])

  if (drivers.length === 0) {
    return <EmptyState message="No hay drivers conectados" />
  }

  const zoneByName = new Map(zones.map((z) => [z.zoneName, z]))
  const grouped = new Map<string, LiveDriver[]>()
  for (const d of filtered) {
    const key = d.zoneName || "Sin zona"
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(d)
  }

  const driverFilters: { key: DriverFilter; label: string; tone: string }[] = [
    { key: "all", label: "Todos", tone: "bg-muted hover:bg-muted/80" },
    {
      key: "libres",
      label: "Libres",
      tone: "bg-emerald-100/60 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
    },
    {
      key: "ocupados",
      label: "Ocupados",
      tone: "bg-blue-100/60 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
    },
    {
      key: "no_disponibles",
      label: "No disponibles",
      tone: "bg-muted/60 hover:bg-muted text-muted-foreground",
    },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/20 p-3">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Filtrar:
        </span>
        {driverFilters.map((f) => {
          const isActive = filter === f.key
          const count = counts[f.key]
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                isActive ? "bg-foreground text-background" : f.tone
              }`}
            >
              {f.label}
              <span
                className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                  isActive ? "bg-white/25" : "bg-foreground/10"
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No hay drivers con este filtro" />
      ) : (
        <div className="space-y-4 p-3">
          {[...grouped.entries()].map(([zoneName, items]) => {
            const z = zoneByName.get(zoneName)
            const busy = items.filter((d) => d.hasActive)
            const free = items.filter(
              (d) => !d.hasActive && d.available,
            )
            const off = items.filter(
              (d) => !d.hasActive && !d.available,
            )
            return (
              <div key={zoneName}>
                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {z && (
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: z.zoneColor }}
                    />
                  )}
                  <span>{zoneName}</span>
                  <div className="flex flex-wrap items-center gap-1 normal-case tracking-normal">
                    {busy.length > 0 && (
                      <span className="rounded bg-blue-100 px-1 py-px text-[9px] font-bold text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                        {busy.length} con pedido{busy.length === 1 ? "" : "s"}
                      </span>
                    )}
                    {free.length > 0 && (
                      <span className="rounded bg-emerald-100 px-1 py-px text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                        {free.length} libre{free.length === 1 ? "" : "s"}
                      </span>
                    )}
                    {off.length > 0 && (
                      <span className="rounded bg-muted px-1 py-px text-[9px] font-bold text-muted-foreground">
                        {off.length} no disp.
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {[...busy, ...free, ...off].map((d) => {
                    const isHighlighted =
                      highlight?.kind === "driver" &&
                      highlight.id === d.driverId
                    return (
                      <DriverCard
                        key={d.driverId}
                        d={d}
                        isHighlighted={isHighlighted}
                        onClick={() =>
                          onHighlight(
                            isHighlighted
                              ? null
                              : { kind: "driver", id: d.driverId },
                          )
                        }
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Driver card uniforme: mismo tamaño para todos los estados (busy/libre/off).
// Para los off se atenúa con opacity. El conteo de pedidos vigentes va como
// badge sobre el avatar; el detalle de los pedidos se ve en el popup del mapa
// al clickear el driver.
function DriverCard({
  d,
  isHighlighted,
  onClick,
}: {
  d: LiveDriver
  isHighlighted: boolean
  onClick: () => void
}) {
  const isOff = !d.hasActive && !d.available
  const bikeBgColor = isOff ? "#9ca3af" : d.zoneColor || "#9ca3af"
  const showFreeRing = !d.hasActive && d.available

  const statusLabel = d.hasActive
    ? `Con ${d.activeRequestIds.length} pedido${d.activeRequestIds.length === 1 ? "" : "s"}`
    : d.available
      ? "Libre"
      : "No disponible"
  const statusToneClass = d.hasActive
    ? "text-blue-700 dark:text-blue-400"
    : d.available
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-muted-foreground"

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      title={
        d.pendingRequestIds.length > 0
          ? `+${d.pendingRequestIds.length} oferta${d.pendingRequestIds.length === 1 ? "" : "s"} sin aceptar`
          : undefined
      }
      className={`group flex cursor-pointer items-center gap-2 rounded-lg border bg-card p-2 transition hover:shadow-sm ${
        isHighlighted ? "ring-2 ring-foreground/30" : ""
      } ${isOff ? "opacity-55 hover:opacity-90" : ""}`}
    >
      <div className="relative shrink-0">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card"
          style={{
            backgroundColor: bikeBgColor,
            boxShadow: showFreeRing
              ? "0 0 0 2px #10b981, 0 1px 3px rgba(0,0,0,.15)"
              : "0 1px 3px rgba(0,0,0,.15)",
          }}
        >
          <BikeIcon className="h-4 w-4 text-white" />
        </div>
        {d.hasActive && (
          <span className="absolute -bottom-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-card bg-blue-600 px-1 text-[9px] font-bold text-white">
            {d.activeRequestIds.length}
          </span>
        )}
        {d.pendingRequestIds.length > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-card bg-amber-500 px-0.5 text-[8px] font-bold text-white">
            {d.pendingRequestIds.length}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold leading-tight">
          {d.fullName}
        </div>
        <div
          className={`flex flex-wrap items-center gap-x-1 gap-y-0 text-[10px] leading-tight ${statusToneClass}`}
        >
          <span>{statusLabel}</span>
          {d.zoneName && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <span>·</span>
              {d.zoneColor && (
                <span
                  className="inline-block h-1 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: d.zoneColor }}
                />
              )}
              <span className="truncate">{d.zoneName}</span>
            </span>
          )}
        </div>
      </div>

      {d.phone && (
        <a
          href={`https://wa.me/${d.phone.replace(/\D/g, "")}`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-muted-foreground opacity-50 transition hover:text-foreground group-hover:opacity-100"
          title="WhatsApp"
        >
          <Phone className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}
