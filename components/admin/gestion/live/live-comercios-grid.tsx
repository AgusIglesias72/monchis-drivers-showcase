"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowUpDown,
  Bike,
  ChefHat,
  Handshake,
  Navigation,
  Search,
  Store,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { LiveCommerce } from "@/lib/types/live-panel.types"

type Highlight = { kind: "request" | "driver" | "zone" | "commerce"; id: string } | null

interface Props {
  commerces: LiveCommerce[]
  highlight: Highlight
  onHighlight: (h: Highlight) => void
  // Click en un pedido (badge dentro de la tarjeta) → highlight de la request.
  onRequestClick: (requestId: string) => void
}

type SortMode = "alerts" | "demora" | "volume" | "name"

interface StateChip {
  key: string
  label: string
  icon: LucideIcon
  bg: string
  text: string
}

const STATE_CHIPS: Record<string, StateChip> = {
  PENDING: {
    key: "PENDING",
    label: "Buscando",
    icon: Search,
    bg: "bg-slate-100",
    text: "text-slate-700",
  },
  ACCEPTED: {
    key: "ACCEPTED",
    label: "Aceptado",
    icon: Handshake,
    bg: "bg-amber-100",
    text: "text-amber-800",
  },
  WAITING_ORDER: {
    key: "WAITING_ORDER",
    label: "En comercio",
    icon: ChefHat,
    bg: "bg-sky-100",
    text: "text-sky-800",
  },
  DELIVERY: {
    key: "DELIVERY",
    label: "En camino",
    icon: Bike,
    bg: "bg-blue-100",
    text: "text-blue-800",
  },
  OUTSIDE: {
    key: "OUTSIDE",
    label: "Llegando",
    icon: Navigation,
    bg: "bg-cyan-100",
    text: "text-cyan-800",
  },
}

// Mismo orden cronológico que usamos en el funnel y el detalle.
const STATE_ORDER = ["PENDING", "ACCEPTED", "WAITING_ORDER", "DELIVERY", "OUTSIDE"]

function formatAge(seconds: number | null): string {
  if (seconds === null) return "—"
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`
}

function ageTone(
  seconds: number | null,
): "fresh" | "warm" | "hot" | "critical" {
  if (seconds === null) return "fresh"
  const m = seconds / 60
  if (m < 3) return "fresh"
  if (m < 7) return "warm"
  if (m < 15) return "hot"
  return "critical"
}

const AGE_TONE_CLASS: Record<
  ReturnType<typeof ageTone>,
  string
> = {
  fresh: "text-muted-foreground",
  warm: "text-amber-700",
  hot: "text-orange-700",
  critical: "text-red-700 font-semibold",
}

function sortCommerces(commerces: LiveCommerce[], mode: SortMode): LiveCommerce[] {
  const sorted = [...commerces]
  if (mode === "alerts") {
    sorted.sort((a, b) => {
      if (a.hasAlert !== b.hasAlert) return a.hasAlert ? -1 : 1
      return (b.maxStateAgeSeconds ?? -1) - (a.maxStateAgeSeconds ?? -1)
    })
  } else if (mode === "demora") {
    sorted.sort(
      (a, b) => (b.maxStateAgeSeconds ?? -1) - (a.maxStateAgeSeconds ?? -1),
    )
  } else if (mode === "volume") {
    sorted.sort((a, b) => b.totalActive - a.totalActive)
  } else if (mode === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name, "es"))
  }
  return sorted
}

export function LiveComerciosGrid({
  commerces,
  highlight,
  onHighlight,
  onRequestClick,
}: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("alerts")
  const sorted = useMemo(() => sortCommerces(commerces, sortMode), [
    commerces,
    sortMode,
  ])

  if (commerces.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
        <Store className="h-10 w-10 text-muted-foreground/40" />
        <div className="text-sm font-medium">No hay comercios activos</div>
        <div className="text-xs text-muted-foreground">
          Cuando haya pedidos en curso aparecerán acá agrupados por comercio.
        </div>
      </Card>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Store className="h-4 w-4" />
            Comercios activos
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
              {commerces.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            <SortButton
              active={sortMode === "alerts"}
              onClick={() => setSortMode("alerts")}
            >
              Alertas
            </SortButton>
            <SortButton
              active={sortMode === "demora"}
              onClick={() => setSortMode("demora")}
            >
              Demora
            </SortButton>
            <SortButton
              active={sortMode === "volume"}
              onClick={() => setSortMode("volume")}
            >
              Volumen
            </SortButton>
            <SortButton
              active={sortMode === "name"}
              onClick={() => setSortMode("name")}
            >
              A–Z
            </SortButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((c) => (
            <CommerceCard
              key={c.branchId}
              commerce={c}
              focused={
                highlight?.kind === "commerce" &&
                highlight.id === String(c.branchId)
              }
              onCardClick={() =>
                onHighlight({ kind: "commerce", id: String(c.branchId) })
              }
              onRequestClick={onRequestClick}
            />
          ))}
        </div>
      </Card>
    </TooltipProvider>
  )
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-md px-2 py-0.5 text-[11px] transition-colors " +
        (active
          ? "bg-foreground text-background"
          : "hover:bg-muted text-muted-foreground")
      }
    >
      {children}
    </button>
  )
}

function CommerceCard({
  commerce,
  focused,
  onCardClick,
  onRequestClick,
}: {
  commerce: LiveCommerce
  focused: boolean
  onCardClick: () => void
  onRequestClick: (requestId: string) => void
}) {
  const tone = ageTone(commerce.maxStateAgeSeconds)
  return (
    <div
      onClick={onCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onCardClick()
        }
      }}
      className={
        "flex flex-col gap-2 rounded-md border p-2.5 transition-all cursor-pointer " +
        (focused
          ? "border-foreground bg-foreground/[0.03] ring-2 ring-foreground/30"
          : commerce.hasAlert
            ? "border-red-200 bg-red-50/40 hover:bg-red-50"
            : "border-border hover:bg-muted/30")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {commerce.hasAlert && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs space-y-0.5">
                    {commerce.pendingNoDriverCount > 0 && (
                      <div>
                        {commerce.pendingNoDriverCount} pedido(s) buscando
                        driver
                      </div>
                    )}
                    {commerce.delayedCount > 0 && (
                      <div>{commerce.delayedCount} pedido(s) demorado(s)</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
            <span className="truncate text-sm font-semibold">
              {commerce.name}
            </span>
          </div>
          {commerce.zoneName && (
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {commerce.zoneName}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            pedidos
          </span>
          <span className="text-base font-bold leading-none tabular-nums">
            {commerce.totalActive}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {STATE_ORDER.map((state) => {
          const count = commerce.countByState[state] ?? 0
          if (count === 0) return null
          const chip = STATE_CHIPS[state]
          if (!chip) return null
          const Icon = chip.icon
          return (
            <Tooltip key={state}>
              <TooltipTrigger asChild>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${chip.bg} ${chip.text}`}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {count}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  {count} en <span className="font-medium">{chip.label}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-2 border-t pt-1.5">
        <div
          className={`inline-flex items-center gap-1 text-[11px] tabular-nums ${AGE_TONE_CLASS[tone]}`}
        >
          <Timer className="h-3 w-3" />
          {formatAge(commerce.maxStateAgeSeconds)}
          <span className="text-muted-foreground/70">máx</span>
        </div>
        {commerce.drivers.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex max-w-[60%] items-center gap-1 truncate text-[11px] text-muted-foreground">
                <Users className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {commerce.drivers
                    .slice(0, 2)
                    .map((d) => d.driverName.split(" ")[0])
                    .join(", ")}
                  {commerce.drivers.length > 2
                    ? ` +${commerce.drivers.length - 2}`
                    : ""}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-0.5">
                <div className="font-medium">Drivers asignados</div>
                {commerce.drivers.map((d) => (
                  <div key={d.driverId}>{d.driverName}</div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-[11px] text-muted-foreground/70">
            sin driver asignado
          </span>
        )}
      </div>

      {/* Al clickear la card se abre el CommerceDetailSheet con la lista
          completa de pedidos + KPIs. */}
    </div>
  )
}
