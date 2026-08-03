"use client"

import {
  AlertTriangle,
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

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type {
  LiveCommerce,
  LiveRequest,
} from "@/lib/types/live-panel.types"

interface Props {
  commerce: LiveCommerce | null
  commerceRequests: LiveRequest[]
  onClose: () => void
  onRequestClick: (id: string) => void
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
  ASSIGNED: {
    label: "Asignado",
    icon: Handshake,
    bg: "bg-fuchsia-100",
    text: "text-fuchsia-800",
  },
  ASSIGNED_DELIVERY: {
    label: "Asignado x admin",
    icon: Handshake,
    bg: "bg-fuchsia-100",
    text: "text-fuchsia-800",
  },
  ASSIGNED_PICKUP: {
    label: "Pickup asignado",
    icon: Handshake,
    bg: "bg-fuchsia-100",
    text: "text-fuchsia-800",
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

const STATE_ORDER = [
  "PENDING",
  "ACCEPTED",
  "ASSIGNED",
  "ASSIGNED_DELIVERY",
  "ASSIGNED_PICKUP",
  "WAITING_ORDER",
  "DELIVERY",
  "OUTSIDE",
]

export function CommerceDetailSheet({
  commerce,
  commerceRequests,
  onClose,
  onRequestClick,
}: Props) {
  const isOpen = commerce !== null
  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-md"
      >
        {commerce ? (
          <CommerceDetail
            commerce={commerce}
            requests={commerceRequests}
            onRequestClick={onRequestClick}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function CommerceDetail({
  commerce,
  requests,
  onRequestClick,
}: {
  commerce: LiveCommerce
  requests: LiveRequest[]
  onRequestClick: (id: string) => void
}) {
  // Las requests vienen ordenadas por demora desc desde aggregateCommerces;
  // mantenemos ese orden acá para que el primer item sea el más urgente.
  return (
    <>
      <SheetHeader className="border-b bg-muted/30 px-4 py-3">
        <SheetTitle className="flex items-start gap-2 text-base">
          <Store className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="break-words">{commerce.name}</span>
        </SheetTitle>
        <SheetDescription asChild>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              Branch #{commerce.branchId}
            </span>
            {commerce.zoneName && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                {commerce.zoneColor && (
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: commerce.zoneColor }}
                  />
                )}
                {commerce.zoneName}
              </span>
            )}
            {commerce.hasAlert && (
              <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-800">
                <AlertTriangle className="h-3 w-3" />
                Alerta
              </span>
            )}
          </div>
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4 p-4 text-sm">
        {/* KPIs resumidos */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border bg-card p-2.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Pedidos activos
            </div>
            <div className="text-lg font-bold tabular-nums leading-tight">
              {commerce.totalActive}
            </div>
          </div>
          <div className="rounded-md border bg-card p-2.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Demora máxima
            </div>
            <div className="text-lg font-bold tabular-nums leading-tight">
              {commerce.maxStateAgeSeconds !== null
                ? formatElapsed(Math.floor(commerce.maxStateAgeSeconds / 60))
                : "—"}
            </div>
          </div>
        </div>

        {/* Conteo por estado */}
        {Object.keys(commerce.countByState).length > 0 && (
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Por estado
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {STATE_ORDER.map((state) => {
                const count = commerce.countByState[state] ?? 0
                if (count === 0) return null
                const chip = STATE_CHIPS[state]
                if (!chip) return null
                const Icon = chip.icon
                return (
                  <span
                    key={state}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${chip.bg} ${chip.text}`}
                  >
                    <Icon className="h-3 w-3" />
                    {count} · {chip.label}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Drivers asignados */}
        {commerce.drivers.length > 0 && (
          <div>
            <h3 className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Users className="h-3 w-3" />
              Drivers asignados
              <span className="ml-1 tabular-nums">
                ({commerce.drivers.length})
              </span>
            </h3>
            <div className="flex flex-wrap gap-1">
              {commerce.drivers.map((d) => (
                <span
                  key={d.driverId}
                  className="rounded bg-muted px-1.5 py-0.5 text-[11px]"
                >
                  {d.driverName}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Lista de pedidos clickeables */}
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pedidos
          </h3>
          {requests.length === 0 ? (
            <div className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
              Sin pedidos activos
            </div>
          ) : (
            <div className="space-y-1.5">
              {requests.map((r) => {
                const min = elapsedMinutesSince(
                  r.currentStateSince || r.createdAt,
                )
                const chip = r.state ? STATE_CHIPS[r.state] : null
                return (
                  <button
                    key={r.requestId}
                    type="button"
                    onClick={() => onRequestClick(r.requestId)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-2 text-left transition hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-muted px-1.5 font-mono text-[11px] font-bold tabular-nums">
                          #{r.externalOrderId || r.requestId.slice(0, 6)}
                        </span>
                        {chip && (
                          <span
                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${chip.bg} ${chip.text}`}
                          >
                            <chip.icon className="h-2.5 w-2.5" />
                            {chip.label}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 truncate text-[11px] text-muted-foreground">
                        {r.driverName ? `Driver: ${r.driverName}` : "Sin driver"}
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                      <Timer className="h-3 w-3" />
                      {formatElapsed(min)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
