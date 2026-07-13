"use client"

import { useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"
import type { LiveZone } from "@/lib/types/live-panel.types"

type Highlight =
  | { kind: "request" | "driver" | "zone" | "commerce"; id: string }
  | null

interface Props {
  zones: LiveZone[]
  highlight: Highlight
  onHighlight: (h: Highlight) => void
  layout?: "grid" | "list"
}

const WARN_DOT: Record<LiveZone["warningKpi"], string> = {
  default: "bg-success",
  yellow: "bg-warning",
  red: "bg-destructive",
}

const WARN_LABEL: Record<LiveZone["warningKpi"], string> = {
  default: "OK",
  yellow: "Atención",
  red: "Crítico",
}

const STATUS_PRIORITY: Record<LiveZone["warningKpi"], number> = {
  red: 0,
  yellow: 1,
  default: 2,
}

function statusToneClass(kpi: LiveZone["warningKpi"]) {
  return kpi === "red"
    ? "text-destructive"
    : kpi === "yellow"
      ? "text-warning"
      : "text-success"
}

function barFillClass(kpi: LiveZone["warningDriversConnections"]) {
  return kpi === "red"
    ? "bg-destructive"
    : kpi === "yellow"
      ? "bg-warning"
      : "bg-success"
}

function borderToneClass(kpi: LiveZone["warningKpi"]) {
  return kpi === "red"
    ? "border-destructive"
    : kpi === "yellow"
      ? "border-warning"
      : ""
}

export function LiveZonesGrid({
  zones,
  highlight,
  onHighlight,
  layout = "grid",
}: Props) {
  const sortedZones = useMemo(() => {
    return [...zones].sort((a, b) => {
      const sa = STATUS_PRIORITY[a.warningKpi]
      const sb = STATUS_PRIORITY[b.warningKpi]
      if (sa !== sb) return sa - sb
      if (a.requestsDelayed !== b.requestsDelayed)
        return b.requestsDelayed - a.requestsDelayed
      return a.zoneName.localeCompare(b.zoneName, "es")
    })
  }, [zones])

  if (zones.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          No hay datos de zonas
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Zonas
        </h2>
        <span className="text-[10px] text-muted-foreground">
          Por criticidad
        </span>
      </div>

      <div
        className={
          layout === "list"
            ? "flex max-h-[520px] flex-col gap-1.5 overflow-y-auto pr-1"
            : "grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        }
      >
        {sortedZones.map((z) => {
          const isHighlighted =
            highlight?.kind === "zone" && highlight.id === z.zoneId
          const handleClick = () =>
            onHighlight(
              isHighlighted ? null : { kind: "zone", id: z.zoneId },
            )
          return layout === "list" ? (
            <ZoneListRow
              key={z.zoneId}
              z={z}
              isHighlighted={isHighlighted}
              onClick={handleClick}
            />
          ) : (
            <ZoneCard
              key={z.zoneId}
              z={z}
              isHighlighted={isHighlighted}
              onClick={handleClick}
            />
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// ZoneCard: layout grid (full width arriba, mucho aire)
// ============================================================================

function ZoneCard({
  z,
  isHighlighted,
  onClick,
}: {
  z: LiveZone
  isHighlighted: boolean
  onClick: () => void
}) {
  const total = z.totalDrivers || 0
  const available = z.availableDrivers || 0
  const pct = total > 0 ? Math.round((available / total) * 100) : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-lg border bg-card text-left transition hover:border-foreground/30 hover:shadow-sm ${borderToneClass(z.warningKpi)} ${
        isHighlighted
          ? "border-foreground/40 shadow-sm ring-2 ring-foreground/10"
          : ""
      }`}
    >
      {/* Barra vertical de color de zona (izquierda) + contenido apretado.
          Sacamos la barra superior horizontal y unificamos drivers + KPIs
          en una sola fila para bajar bastante la altura. */}
      <div className="flex items-stretch gap-2">
        <span
          className="w-1 shrink-0"
          style={{ backgroundColor: z.zoneColor }}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1 px-2 py-1.5">
          <div className="flex items-center justify-between gap-1.5">
            <h3 className="truncate text-[12px] font-semibold leading-tight">
              {z.zoneName}
            </h3>
            <span
              className={`inline-flex shrink-0 items-center gap-1 text-[9px] font-medium ${statusToneClass(z.warningKpi)}`}
              title={`Estado: ${WARN_LABEL[z.warningKpi]}`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${WARN_DOT[z.warningKpi]}`}
              />
              {WARN_LABEL[z.warningKpi]}
            </span>
          </div>

          <div
            className="flex items-center gap-1.5"
            title={`Drivers libres / total — ${available}/${total} (${pct}%)`}
          >
            <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${barFillClass(z.warningDriversConnections)}`}
                style={{ width: total === 0 ? "0%" : `${pct}%` }}
              />
            </div>
            <span className="shrink-0 font-mono text-[10px] font-bold leading-none tabular-nums">
              {available}/{total}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] tabular-nums">
            <CompactStat
              label="S/D"
              value={z.orderWithoutDriver}
              tone={z.orderWithoutDriver > 0 ? "warning" : "neutral"}
              title="Pedidos sin driver asignado"
            />
            <CompactStat
              label="DEM"
              value={z.requestsDelayed}
              tone={z.requestsDelayed > 0 ? "danger" : "neutral"}
              title="Pedidos demorados"
            />
            <CompactStat
              label="CRS"
              value={z.activeRequests}
              tone="neutral"
              title="Pedidos en curso (con driver)"
              className="ml-auto"
            />
          </div>
        </div>
      </div>
    </button>
  )
}

function CompactStat({
  label,
  value,
  tone,
  title,
  className,
}: {
  label: string
  value: number
  tone: "neutral" | "warning" | "danger"
  title?: string
  className?: string
}) {
  const valueClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : "text-foreground"
  return (
    <span
      className={`inline-flex items-baseline gap-1 ${className ?? ""}`}
      title={title}
    >
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={`font-bold ${valueClass}`}>{value}</span>
    </span>
  )
}

// ============================================================================
// ZoneListRow: layout list (compacto al costado del mapa, 1/4 col)
// ============================================================================

function ZoneListRow({
  z,
  isHighlighted,
  onClick,
}: {
  z: LiveZone
  isHighlighted: boolean
  onClick: () => void
}) {
  const total = z.totalDrivers || 0
  const available = z.availableDrivers || 0
  const pct = total > 0 ? Math.round((available / total) * 100) : 0

  const sdClass =
    z.orderWithoutDriver > 0
      ? "text-warning"
      : "text-muted-foreground"
  const demClass =
    z.requestsDelayed > 0 ? "text-destructive" : "text-muted-foreground"

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-2 overflow-hidden rounded-md border bg-card px-2 py-1.5 text-left transition hover:border-foreground/30 hover:shadow-sm ${borderToneClass(z.warningKpi)} ${
        isHighlighted
          ? "border-foreground/40 shadow-sm ring-2 ring-foreground/10"
          : ""
      }`}
    >
      {/* Stripe vertical de color de zona */}
      <span
        className="h-9 w-1 shrink-0 rounded-sm"
        style={{ backgroundColor: z.zoneColor }}
      />

      <div className="min-w-0 flex-1 space-y-0.5">
        {/* Línea 1: nombre + status pill */}
        <div className="flex items-center justify-between gap-1.5">
          <h3 className="truncate text-[12px] font-semibold leading-tight">
            {z.zoneName}
          </h3>
          <span
            className={`inline-flex shrink-0 items-center gap-1 text-[9px] font-medium ${statusToneClass(z.warningKpi)}`}
            title={`Estado de la zona: ${WARN_LABEL[z.warningKpi]}`}
          >
            <span
              className={`inline-block h-1 w-1 rounded-full ${WARN_DOT[z.warningKpi]}`}
            />
            {WARN_LABEL[z.warningKpi]}
          </span>
        </div>

        {/* Línea 2: barra inline + count + KPIs */}
        <div className="flex items-center gap-1.5">
          <div
            className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted"
            title={`Drivers libres vs total — ${available}/${total} (${pct}%)`}
          >
            <div
              className={`h-full ${barFillClass(z.warningDriversConnections)}`}
              style={{ width: total === 0 ? "0%" : `${pct}%` }}
            />
          </div>
          <span
            className="shrink-0 font-mono text-[10px] font-bold tabular-nums"
            title="Drivers libres / total"
          >
            {available}/{total}
          </span>
        </div>

        {/* Línea 3: KPIs inline */}
        <div className="flex items-center gap-2 text-[10px] tabular-nums">
          <span className={sdClass} title="Pedidos sin driver asignado">
            S/D <span className="font-bold">{z.orderWithoutDriver}</span>
          </span>
          <span className={demClass} title="Pedidos demorados">
            DEM <span className="font-bold">{z.requestsDelayed}</span>
          </span>
          <span
            className="ml-auto text-muted-foreground"
            title="Pedidos en curso (con driver)"
          >
            CRS{" "}
            <span className="font-bold text-foreground">
              {z.activeRequests}
            </span>
          </span>
        </div>
      </div>
    </button>
  )
}

