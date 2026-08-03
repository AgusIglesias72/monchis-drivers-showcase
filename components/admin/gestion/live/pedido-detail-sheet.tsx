"use client"

import Link from "next/link"
import {
  Bike,
  Building2,
  CreditCard,
  ExternalLink,
  MapPin,
  Phone,
  Search,
  Timer,
} from "lucide-react"

import { PedidoSheetMap } from "@/components/admin/gestion/live/pedido-sheet-map"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type {
  LiveDriver,
  LiveRequest,
} from "@/lib/types/live-panel.types"

interface Props {
  pedido: LiveRequest | null
  driver: LiveDriver | null
  delayedSet: Set<string>
  onClose: () => void
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
      return "Afuera"
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

function paymentLabel(p: string | null): string {
  if (!p) return "—"
  switch (p) {
    case "BANCARD":
      return "Bancard"
    case "CASH":
      return "Efectivo"
    case "QR":
      return "QR"
    default:
      return p
  }
}

const STATE_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300",
  ACCEPTED: "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-300",
  WAITING_ORDER: "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-300",
  DELIVERY: "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300",
  OUTSIDE: "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-300",
  ASSIGNED: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  ASSIGNED_DELIVERY: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  ASSIGNED_PICKUP: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
}

const TONE_BIG: Record<
  ReturnType<typeof bucketTone>,
  string
> = {
  fresh: "bg-emerald-500 text-white",
  warm: "bg-amber-500 text-white",
  hot: "bg-orange-500 text-white",
  critical: "bg-red-500 text-white",
}

export function PedidoDetailSheet({
  pedido,
  driver,
  delayedSet,
  onClose,
}: Props) {
  const isOpen = pedido !== null
  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-xl"
      >
        {pedido ? (
          <PedidoDetail
            pedido={pedido}
            driver={driver}
            isDelayed={pedido.isDelayed || delayedSet.has(pedido.requestId)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function PedidoDetail({
  pedido: r,
  driver,
  isDelayed,
}: {
  pedido: LiveRequest
  driver: LiveDriver | null
  isDelayed: boolean
}) {
  const stateMin = elapsedMinutesSince(r.currentStateSince || r.createdAt)
  const totalMin = elapsedMinutesSince(r.confirmedAt || r.createdAt)
  const tone = bucketTone(stateMin)

  const stateBadge = r.state ? STATE_BADGE[r.state] : "bg-muted"

  return (
    <>
      <SheetHeader className="space-y-2 border-b bg-muted/20 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 items-center rounded bg-muted px-2 font-mono text-xs font-bold tabular-nums">
            #{r.externalOrderId || "?"}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${stateBadge}`}
          >
            {stateLabel(r.state)}
          </span>
          {isDelayed && (
            <span className="inline-flex items-center gap-1 rounded bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              <Timer className="h-2.5 w-2.5" />
              Demorado
            </span>
          )}
        </div>
        <SheetTitle className="text-lg leading-tight">
          {r.origin?.name || "Pedido sin comercio"}
        </SheetTitle>
        <SheetDescription className="text-xs">
          ID interno{" "}
          <span className="font-mono text-foreground/70">{r.requestId}</span>
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4 px-5 py-4">
        {/* Tiempos prominentes */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`rounded-lg p-3 ${TONE_BIG[tone]} flex flex-col`}
          >
            <span className="text-[10px] uppercase tracking-wide opacity-90">
              Tiempo en estado
            </span>
            <span className="mt-1 text-2xl font-bold leading-none tabular-nums">
              {formatElapsed(stateMin)}
            </span>
            <span className="mt-1 text-[10px] opacity-90">
              en {stateLabel(r.state).toLowerCase()}
            </span>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Antigüedad total
            </span>
            <span className="mt-1 block text-2xl font-bold leading-none tabular-nums">
              {formatElapsed(totalMin)}
            </span>
            <span className="mt-1 block text-[10px] text-muted-foreground">
              desde la confirmación
            </span>
          </div>
        </div>

        {/* Mapa: vista simple del tramo actual del driver */}
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tramo actual
          </h3>
          <PedidoSheetMap
            state={r.state}
            driverPosition={driver?.position ?? null}
            driverName={driver?.fullName ?? r.driverName ?? null}
            origin={r.origin}
            destination={r.destination}
          />
        </div>

        {/* Driver */}
        <Section title="Driver">
          {r.driverName ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  {r.driverName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() || "")
                    .join("") || "?"}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {r.driverName}
                  </div>
                  {r.zoneName && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {r.zoneColor && (
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: r.zoneColor }}
                        />
                      )}
                      {r.zoneName}
                    </div>
                  )}
                </div>
              </div>
              {r.driverPhone && (
                <a
                  href={`https://wa.me/${r.driverPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400"
                >
                  <Phone className="h-3 w-3" />
                  WhatsApp
                </a>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed bg-amber-50/40 p-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
              <Search className="h-4 w-4" />
              Sin driver asignado
            </div>
          )}
        </Section>

        {/* Comercio (origen) */}
        <Section
          title="Comercio"
          icon={<Building2 className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />}
        >
          <div className="space-y-1 rounded-lg border bg-card p-3 text-sm">
            <div className="font-semibold">{r.origin?.name || "—"}</div>
            {r.origin?.address && (
              <div className="text-xs text-muted-foreground">
                {r.origin.address}
              </div>
            )}
            {r.branchId && (
              <div className="text-[11px] font-mono text-muted-foreground">
                Branch ID: {r.branchId}
              </div>
            )}
          </div>
        </Section>

        {/* Cliente (destino) */}
        <Section
          title="Cliente"
          icon={<MapPin className="h-3 w-3 text-red-700 dark:text-red-400" />}
        >
          <div className="space-y-1 rounded-lg border bg-card p-3 text-sm">
            <div className="font-semibold">{r.destination?.name || "—"}</div>
            {r.destination?.address && (
              <div className="text-xs text-muted-foreground">
                {r.destination.address}
              </div>
            )}
          </div>
        </Section>

        {/* Pago */}
        {(r.totalOrder || r.paymentType) && (
          <Section title="Pago">
            <div className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{paymentLabel(r.paymentType)}</span>
              </div>
              <span className="font-mono text-base font-bold tabular-nums">
                ₲ {formatGuaranies(r.totalOrder)}
              </span>
            </div>
          </Section>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 border-t bg-card px-5 py-3">
        <Link
          href={`/admin/gestion/pedidos/${r.requestId}`}
          target="_blank"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir detalle completo
        </Link>
      </div>
    </>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}
