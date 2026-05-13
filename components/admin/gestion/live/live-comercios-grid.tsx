"use client"

import { useMemo, useState } from "react"
import {
  Hourglass,
  AlertTriangle,
  ArrowUpDown,
  Bike,
  ChefHat,
  Handshake,
  LayoutGrid,
  List,
  Navigation,
  Search,
  Store,
  Timer,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Card } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CopyableOrderId } from "@/components/admin/gestion/live/copyable-order-id"
import type {
  LiveCommerce,
  LiveDriver,
  LiveRequest,
} from "@/lib/types/live-panel.types"
import {
  formatDistance,
  remainingDistanceForRequest,
} from "@/lib/utils/geo"

type Highlight = { kind: "request" | "driver" | "zone" | "commerce"; id: string } | null

interface Props {
  commerces: LiveCommerce[]
  drivers: LiveDriver[]
  highlight: Highlight
  onHighlight: (h: Highlight) => void
  // Click en un pedido (fila dentro de la tarjeta) → highlight de la request.
  onRequestClick: (requestId: string) => void
}

type SortMode = "prioridad" | "demora" | "volume" | "name"
type ViewMode = "cards" | "table"

interface StateChip {
  label: string
  icon: LucideIcon
  bg: string
  text: string
}

const STATE_CHIPS: Record<string, StateChip> = {
  PENDING: {
    label: "Buscando",
    icon: Search,
    bg: "bg-slate-100",
    text: "text-slate-700",
  },
  ACCEPTED: {
    label: "Aceptado",
    icon: Handshake,
    bg: "bg-amber-100",
    text: "text-amber-800",
  },
  WAITING_ORDER: {
    label: "En comercio",
    icon: ChefHat,
    bg: "bg-sky-100",
    text: "text-sky-800",
  },
  DELIVERY: {
    label: "En camino",
    icon: Bike,
    bg: "bg-blue-100",
    text: "text-blue-800",
  },
  OUTSIDE: {
    label: "Afuera",
    icon: Navigation,
    bg: "bg-cyan-100",
    text: "text-cyan-800",
  },
}

function elapsedMinutesSince(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return null
  return Math.floor(ms / 60000)
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "—"
  if (minutes < 1) return "<1m"
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m}m` : `${h}h`
}

function ageTone(
  minutes: number | null,
): "fresh" | "warm" | "hot" | "critical" {
  if (minutes === null) return "fresh"
  if (minutes < 3) return "fresh"
  if (minutes < 7) return "warm"
  if (minutes < 15) return "hot"
  return "critical"
}

const AGE_TONE_TEXT: Record<
  ReturnType<typeof ageTone>,
  string
> = {
  fresh: "text-muted-foreground",
  warm: "text-amber-700",
  hot: "text-orange-700",
  critical: "text-red-700 font-semibold",
}

function sortCommerces(commerces: LiveCommerce[], mode: SortMode): LiveCommerce[] {
  // "prioridad" = orden por defecto que viene del agregador (tier-based).
  if (mode === "prioridad") return commerces
  const sorted = [...commerces]
  if (mode === "demora") {
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
  drivers,
  highlight,
  onHighlight,
  onRequestClick,
}: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("prioridad")
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const driversById = useMemo(() => {
    const m = new Map<string, LiveDriver>()
    for (const d of drivers) m.set(d.driverId, d)
    return m
  }, [drivers])
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
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
              <SortButton
                active={sortMode === "prioridad"}
                onClick={() => setSortMode("prioridad")}
                tooltip="Comercios con pedidos críticos (>15min) o demorados primero; dentro de cada grupo, por cantidad de pedidos desc"
              >
                Prioridad
              </SortButton>
              <SortButton
                active={sortMode === "demora"}
                onClick={() => setSortMode("demora")}
                tooltip="Ordena por la demora máxima entre los pedidos del comercio"
              >
                Demora
              </SortButton>
              <SortButton
                active={sortMode === "volume"}
                onClick={() => setSortMode("volume")}
                tooltip="Ordena por cantidad de pedidos activos"
              >
                Volumen
              </SortButton>
              <SortButton
                active={sortMode === "name"}
                onClick={() => setSortMode("name")}
                tooltip="Orden alfabético por nombre del comercio"
              >
                A–Z
              </SortButton>
            </div>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {viewMode === "cards" ? (
          <div className="grid grid-cols-1 gap-3 p-3 xl:grid-cols-2 2xl:grid-cols-3">
            {sorted.map((c) => (
              <CommerceCard
                key={c.branchId}
                commerce={c}
                driversById={driversById}
                focused={
                  highlight?.kind === "commerce" &&
                  highlight.id === String(c.branchId)
                }
                focusedRequestId={
                  highlight?.kind === "request" ? highlight.id : null
                }
                onCardClick={() =>
                  onHighlight({ kind: "commerce", id: String(c.branchId) })
                }
                onRequestClick={onRequestClick}
              />
            ))}
          </div>
        ) : (
          <CommercesTable
            commerces={sorted}
            highlight={highlight}
            onCardClick={(branchId) =>
              onHighlight({ kind: "commerce", id: String(branchId) })
            }
          />
        )}
      </Card>
    </TooltipProvider>
  )
}

function SortButton({
  active,
  onClick,
  tooltip,
  children,
}: {
  active: boolean
  onClick: () => void
  tooltip: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
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
      </TooltipTrigger>
      <TooltipContent>
        <div className="max-w-[260px] text-xs">{tooltip}</div>
      </TooltipContent>
    </Tooltip>
  )
}

function CommerceCard({
  commerce,
  driversById,
  focused,
  focusedRequestId,
  onCardClick,
  onRequestClick,
}: {
  commerce: LiveCommerce
  driversById: Map<string, LiveDriver>
  focused: boolean
  focusedRequestId: string | null
  onCardClick: () => void
  onRequestClick: (requestId: string) => void
}) {
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
        "flex cursor-pointer flex-col gap-2.5 rounded-md border p-3 transition-all " +
        (focused
          ? "border-foreground bg-foreground/[0.03] ring-2 ring-foreground/30"
          : commerce.hasAlert
            ? "border-red-200 bg-red-50/40 hover:bg-red-50"
            : "border-border hover:bg-muted/30")
      }
    >
      {/* Header — nombre + zona + total de pedidos */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {commerce.hasAlert && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-0.5 text-xs">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-0.5 inline-flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  {commerce.zoneColor && (
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: commerce.zoneColor }}
                    />
                  )}
                  {commerce.zoneName}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">Zona del comercio</div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex cursor-help flex-col items-end gap-0.5 text-right">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                pedidos
              </span>
              <span className="text-lg font-bold leading-none tabular-nums">
                {commerce.totalActive}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              Pedidos activos del comercio (PENDING / ACCEPTED / WAITING_ORDER /
              DELIVERY / OUTSIDE)
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Lista de pedidos del comercio (los drivers se ven en cada fila) */}
      <div className="-mx-1 space-y-0.5 border-t pt-1.5">
        {commerce.requests.map((r) => {
          const driver = r.driverId ? driversById.get(r.driverId) : undefined
          return (
            <OrderRow
              key={r.requestId}
              request={r}
              driver={driver}
              isFocused={focusedRequestId === r.requestId}
              onClick={(e) => {
                e.stopPropagation()
                onRequestClick(r.requestId)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function OrderRow({
  request: r,
  driver,
  isFocused,
  onClick,
}: {
  request: LiveRequest
  driver: LiveDriver | undefined
  isFocused: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  const stateMin = elapsedMinutesSince(r.currentStateSince || r.createdAt)
  const totalMin = elapsedMinutesSince(r.confirmedAt || r.createdAt)
  const tone = ageTone(stateMin)
  const chip = r.state ? STATE_CHIPS[r.state] : null

  const remaining = remainingDistanceForRequest({
    state: r.state,
    driverPosition: driver?.position,
    origin: r.origin,
    destination: r.destination,
  })

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[11px] transition-colors " +
        (isFocused ? "bg-foreground/[0.06]" : "hover:bg-muted/60")
      }
    >
      <CopyableOrderId
        externalOrderId={r.externalOrderId}
        requestId={r.requestId}
        size="sm"
      />
      {chip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${chip.bg} ${chip.text}`}
            >
              <chip.icon className="h-2.5 w-2.5" />
              {chip.label}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">Estado actual: {chip.label}</div>
          </TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          {r.driverName ? (
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {r.driverName}
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate italic text-muted-foreground/70">
              sin driver
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            {r.driverName
              ? `Driver asignado: ${r.driverName}`
              : "Sin driver asignado todavía"}
          </div>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`shrink-0 tabular-nums ${AGE_TONE_TEXT[tone]}`}>
            <Timer className="mr-0.5 inline h-2.5 w-2.5" />
            {formatMinutes(stateMin)}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            Tiempo en el estado actual ({chip?.label ?? r.state ?? "—"})
          </div>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="shrink-0 tabular-nums text-muted-foreground/70">
            / {formatMinutes(totalMin)}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            Tiempo total desde la confirmación del pedido
          </div>
        </TooltipContent>
      </Tooltip>
      {remaining && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-muted px-1 py-0.5 tabular-nums text-foreground/75">
              <Navigation className="h-2.5 w-2.5" />
              {formatDistance(remaining.meters)}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              Distancia lineal restante{" "}
              {remaining.leg === "to-commerce"
                ? "del driver al comercio"
                : "del driver al cliente"}{" "}
              (no considera el ruteo real)
            </div>
          </TooltipContent>
        </Tooltip>
      )}
      {r.isDelayed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-destructive/10 p-1 text-destructive">
              <Hourglass className="h-3 w-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              Pedido demorado según el backend (excede el tiempo esperado para
              su estado)
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </button>
  )
}

// ============================================================================
// Toggle Cards / Tabla — replica del que usa el panel de Pedidos.
// ============================================================================

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode
  onChange: (v: ViewMode) => void
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-md border bg-background p-0.5">
      <button
        type="button"
        onClick={() => onChange("cards")}
        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition ${
          value === "cards"
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
          value === "table"
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

// ============================================================================
// Tabla — densa, una fila por comercio. Click → abre drawer del comercio.
// ============================================================================

function CommercesTable({
  commerces,
  highlight,
  onCardClick,
}: {
  commerces: LiveCommerce[]
  highlight: Highlight
  onCardClick: (branchId: number) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-semibold">Comercio</th>
            <th className="px-2 py-2 text-right font-semibold">Pedidos</th>
            <th className="px-2 py-2 font-semibold">Distribución</th>
            <th className="px-2 py-2 text-right font-semibold">Demora máx</th>
            <th className="px-2 py-2 text-center font-semibold">Drivers</th>
          </tr>
        </thead>
        <tbody>
          {commerces.map((c) => {
            const focused =
              highlight?.kind === "commerce" &&
              highlight.id === String(c.branchId)
            const tone = ageTone(
              c.maxStateAgeSeconds !== null
                ? Math.floor(c.maxStateAgeSeconds / 60)
                : null,
            )
            return (
              <tr
                key={c.branchId}
                onClick={() => onCardClick(c.branchId)}
                className={`cursor-pointer border-b transition-colors ${
                  focused
                    ? "bg-foreground/[0.05]"
                    : c.hasAlert
                      ? "bg-red-50/40 hover:bg-red-50"
                      : "hover:bg-muted/40"
                }`}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {c.hasAlert && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-0.5 text-xs">
                            {c.pendingNoDriverCount > 0 && (
                              <div>
                                {c.pendingNoDriverCount} pedido(s) buscando
                                driver
                              </div>
                            )}
                            {c.delayedCount > 0 && (
                              <div>
                                {c.delayedCount} pedido(s) demorado(s)
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{c.name}</div>
                      {c.zoneName && (
                        <div className="inline-flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                          {c.zoneColor && (
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: c.zoneColor }}
                            />
                          )}
                          {c.zoneName}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2 text-right font-bold tabular-nums">
                  {c.totalActive}
                </td>
                <td className="px-2 py-2">
                  <div className="flex flex-wrap gap-0.5">
                    {STATE_ORDER.map((state) => {
                      const count = c.countByState[state] ?? 0
                      if (count === 0) return null
                      const chip = STATE_CHIPS[state]
                      if (!chip) return null
                      const Icon = chip.icon
                      return (
                        <Tooltip key={state}>
                          <TooltipTrigger asChild>
                            <span
                              className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums ${chip.bg} ${chip.text}`}
                            >
                              <Icon className="h-2.5 w-2.5" />
                              {count}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              {count} en {chip.label}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </td>
                <td
                  className={`px-2 py-2 text-right tabular-nums ${AGE_TONE_TEXT[tone]}`}
                >
                  {c.maxStateAgeSeconds !== null
                    ? formatMinutes(Math.floor(c.maxStateAgeSeconds / 60))
                    : "—"}
                </td>
                <td className="px-2 py-2 text-center text-muted-foreground">
                  {c.drivers.length}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Mismo orden cronológico que usamos en la card.
const STATE_ORDER = ["PENDING", "ACCEPTED", "WAITING_ORDER", "DELIVERY", "OUTSIDE"]

// CopyableOrderId fue extraído a su propio archivo (re-uso entre grid de
// comercios + cards de pedido del side panel). Ver copyable-order-id.tsx.
