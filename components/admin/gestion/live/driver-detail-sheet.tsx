"use client"

import {
  Bike,
  MapPin,
  Phone,
  Search,
  ShoppingBag,
  Timer,
} from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { LiveDriver, LiveRequest } from "@/lib/types/live-panel.types"

interface Props {
  driver: LiveDriver | null
  driverRequests: LiveRequest[]
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

const STATE_BADGE: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-800",
  ACCEPTED: "bg-amber-100 text-amber-800",
  ASSIGNED: "bg-fuchsia-100 text-fuchsia-800",
  ASSIGNED_DELIVERY: "bg-fuchsia-100 text-fuchsia-800",
  ASSIGNED_PICKUP: "bg-fuchsia-100 text-fuchsia-800",
  WAITING_ORDER: "bg-sky-100 text-sky-800",
  DELIVERY: "bg-blue-100 text-blue-800",
  OUTSIDE: "bg-cyan-100 text-cyan-800",
}

const STATE_LABEL: Record<string, string> = {
  PENDING: "Buscando driver",
  ACCEPTED: "Aceptado",
  ASSIGNED: "Asignado",
  ASSIGNED_DELIVERY: "Asignado por admin",
  ASSIGNED_PICKUP: "Pickup asignado",
  WAITING_ORDER: "En el comercio",
  DELIVERY: "En camino",
  OUTSIDE: "Afuera",
}

export function DriverDetailSheet({
  driver,
  driverRequests,
  onClose,
  onRequestClick,
}: Props) {
  const isOpen = driver !== null
  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-md"
      >
        {driver ? (
          <DriverDetail
            driver={driver}
            requests={driverRequests}
            onRequestClick={onRequestClick}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function DriverDetail({
  driver,
  requests,
  onRequestClick,
}: {
  driver: LiveDriver
  requests: LiveRequest[]
  onRequestClick: (id: string) => void
}) {
  const status = driver.hasActive
    ? { label: "Ocupado", classes: "bg-blue-100 text-blue-900" }
    : driver.available
      ? { label: "Libre", classes: "bg-emerald-100 text-emerald-900" }
      : { label: "No disponible", classes: "bg-slate-100 text-slate-700" }

  return (
    <>
      <SheetHeader className="border-b bg-muted/30 px-4 py-3">
        <SheetTitle className="flex items-center gap-2 text-base">
          <Bike className="h-4 w-4" />
          {driver.fullName}
        </SheetTitle>
        <SheetDescription asChild>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`rounded px-1.5 py-0.5 font-semibold uppercase tracking-wide ${status.classes}`}
            >
              {status.label}
            </span>
            {driver.zoneName && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                {driver.zoneColor && (
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: driver.zoneColor }}
                  />
                )}
                {driver.zoneName}
              </span>
            )}
          </div>
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4 p-4 text-sm">
        {/* Datos de contacto */}
        {driver.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <a
              href={`tel:${driver.phone}`}
              className="font-mono text-foreground/85 hover:underline"
            >
              {driver.phone}
            </a>
          </div>
        )}

        {/* Pedidos activos */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pedidos activos
            </h3>
            <span className="text-xs tabular-nums text-muted-foreground">
              {requests.length}
            </span>
          </div>
          {requests.length === 0 ? (
            <div className="flex items-center gap-2 rounded-md border border-dashed py-4 text-xs text-muted-foreground justify-center">
              <Search className="h-3.5 w-3.5" />
              Sin pedidos asignados ahora mismo
            </div>
          ) : (
            <div className="space-y-1.5">
              {requests.map((r) => {
                const min = elapsedMinutesSince(
                  r.currentStateSince || r.createdAt,
                )
                const stateClass = r.state
                  ? STATE_BADGE[r.state] ?? "bg-muted text-foreground/70"
                  : "bg-muted text-foreground/70"
                const stateLbl = r.state ? STATE_LABEL[r.state] ?? r.state : "—"
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
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${stateClass}`}
                        >
                          {stateLbl}
                        </span>
                      </div>
                      {r.origin?.name && (
                        <div className="mt-1 truncate text-[11px] text-muted-foreground">
                          <ShoppingBag className="mr-1 inline h-3 w-3" />
                          {r.origin.name}
                        </div>
                      )}
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

        {/* Posición */}
        {driver.position && (
          <div className="flex items-start gap-2 rounded-md border bg-muted/20 p-2.5 text-xs">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="font-mono text-muted-foreground">
              {driver.position.lat.toFixed(5)}, {driver.position.lng.toFixed(5)}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
