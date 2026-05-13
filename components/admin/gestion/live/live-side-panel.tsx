"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Bike,
  BikeIcon,
  Building2,
  ChefHat,
  CreditCard,
  ExternalLink,
  Handshake,
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

type Highlight = { kind: "request" | "driver" | "zone"; id: string } | null
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
        <div className="border-b bg-muted/30 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <TabsList className="grid h-10 w-full max-w-md grid-cols-2 bg-background p-1">
              <TabsTrigger
                value="pedidos"
                className="gap-2 text-sm data-[state=active]:shadow-sm"
              >
                <ShoppingBag className="h-4 w-4" />
                Pedidos
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-bold tabular-nums">
                  {pending.length + active.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="drivers"
                className="gap-2 text-sm data-[state=active]:shadow-sm"
              >
                <BikeIcon className="h-4 w-4" />
                Drivers
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-bold tabular-nums">
                  {drivers.length}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>
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

function PedidosTab({
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
  const allRequests = useMemo(() => [...pending, ...active], [pending, active])
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
      {/* Chips de filtro */}
      <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/20 p-3">
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

      {filtered.length === 0 ? (
        <EmptyState
          message={
            filter === "all"
              ? "No hay pedidos en el sistema"
              : "No hay pedidos en este estado"
          }
        />
      ) : (
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
      )}
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

        {/* Destino */}
        {(r.destination?.name || r.destination?.address) && (
          <div className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-700 dark:text-red-400" />
            <span className="text-xs leading-tight text-muted-foreground break-words">
              {r.destination?.name && (
                <span className="text-foreground/80">{r.destination.name}</span>
              )}
              {r.destination?.address && (
                <span className="ml-1">— {r.destination.address}</span>
              )}
            </span>
          </div>
        )}

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
// Drivers: filtros + grid de cards
// ============================================================================

function DriversTab({
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
            return (
              <div key={zoneName}>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {z && (
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: z.zoneColor }}
                    />
                  )}
                  <span>{zoneName}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {items.map((d) => {
                    const isHighlighted =
                      highlight?.kind === "driver" && highlight.id === d.driverId
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

function DriverCard({
  d,
  isHighlighted,
  onClick,
}: {
  d: LiveDriver
  isHighlighted: boolean
  onClick: () => void
}) {
  const initials = d.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "?"

  const statusBg = d.hasActive
    ? "bg-blue-500"
    : d.available
      ? "bg-emerald-500"
      : "bg-muted-foreground"
  const statusLabel = d.hasActive
    ? `${d.activeRequestIds.length} pedido${d.activeRequestIds.length === 1 ? "" : "s"}`
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
      className={`group cursor-pointer overflow-hidden rounded-lg border bg-card p-3 transition hover:shadow-md ${
        isHighlighted ? "ring-2 ring-foreground/30" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div className="relative">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
              d.hasActive
                ? "bg-blue-500"
                : d.available
                  ? "bg-emerald-500"
                  : "bg-muted-foreground"
            }`}
          >
            {initials}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 inline-block h-3 w-3 rounded-full border-2 border-card ${statusBg}`}
          />
        </div>
        {/* Datos */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-tight">
            {d.fullName}
          </div>
          <div className={`text-[11px] ${statusToneClass}`}>{statusLabel}</div>
          {d.pendingRequestIds.length > 0 && (
            <div className="text-[10px] text-amber-700 dark:text-amber-400">
              +{d.pendingRequestIds.length} oferta
              {d.pendingRequestIds.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
        {/* Phone */}
        {d.phone && (
          <a
            href={`https://wa.me/${d.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground opacity-60 transition hover:text-foreground group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
            title="WhatsApp"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
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
