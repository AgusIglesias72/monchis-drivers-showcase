"use client"

import { useMemo } from "react"
import {
  Bike,
  ChefHat,
  Handshake,
  Navigation,
  Search,
  type LucideIcon,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { bucketize } from "@/components/admin/gestion/live/live-funnel"
import type { LiveRequest, LiveZone } from "@/lib/types/live-panel.types"

type Highlight = { kind: "request" | "driver" | "zone"; id: string } | null

interface Props {
  zones: LiveZone[]
  active: LiveRequest[]
  highlight: Highlight
  onHighlight: (h: Highlight) => void
}

interface StagePill {
  key: string
  short: string
  icon: LucideIcon
  bg: string
  text: string
}

const STAGES: StagePill[] = [
  {
    key: "PENDING",
    short: "Buscando",
    icon: Search,
    bg: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
  },
  {
    key: "ACCEPTED",
    short: "Aceptado",
    icon: Handshake,
    bg: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-400",
  },
  {
    key: "WAITING_ORDER",
    short: "Comercio",
    icon: ChefHat,
    bg: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-400",
  },
  {
    key: "DELIVERY",
    short: "Camino",
    icon: Bike,
    bg: "bg-blue-600",
    text: "text-blue-700 dark:text-blue-400",
  },
  {
    key: "OUTSIDE",
    short: "Llegando",
    icon: Navigation,
    bg: "bg-cyan-600",
    text: "text-cyan-700 dark:text-cyan-400",
  },
]

const WARN_PILL: Record<LiveZone["warningKpi"], string> = {
  default:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  yellow:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  red: "bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-300",
}

const WARN_DOT: Record<LiveZone["warningKpi"], string> = {
  default: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
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

export function LiveZonesGrid({ zones, active, highlight, onHighlight }: Props) {
  // Pedidos por zona indexados.
  const activeByZone = useMemo(() => {
    const out = new Map<string, LiveRequest[]>()
    for (const r of active) {
      if (!r.zoneId) continue
      if (!out.has(r.zoneId)) out.set(r.zoneId, [])
      out.get(r.zoneId)!.push(r)
    }
    return out
  }, [active])

  // Orden: zonas críticas primero, después por demorados, después alfabético.
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
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Zonas operativas</h2>
        <span className="text-xs text-muted-foreground">
          Ordenadas por criticidad · Click para resaltar en el mapa
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {sortedZones.map((z) => {
          const isHighlighted =
            highlight?.kind === "zone" && highlight.id === z.zoneId
          const zoneActive = activeByZone.get(z.zoneId) || []
          const byStage = new Map<string, LiveRequest[]>()
          for (const r of zoneActive) {
            const k = r.state || ""
            if (!byStage.has(k)) byStage.set(k, [])
            byStage.get(k)!.push(r)
          }
          const buckets = bucketize(zoneActive)
          const critical = buckets.critical
          return (
            <button
              key={z.zoneId}
              type="button"
              onClick={() =>
                onHighlight(
                  isHighlighted ? null : { kind: "zone", id: z.zoneId },
                )
              }
              className={`group relative overflow-hidden rounded-lg border bg-card text-left transition hover:border-foreground/30 hover:shadow-sm ${
                isHighlighted
                  ? "border-foreground/40 shadow-sm ring-2 ring-foreground/10"
                  : ""
              } ${
                z.warningKpi === "red"
                  ? "border-red-300 dark:border-red-900"
                  : z.warningKpi === "yellow"
                    ? "border-amber-300 dark:border-amber-900"
                    : ""
              }`}
            >
              {/* Color stripe + header */}
              <div
                className="h-1"
                style={{ backgroundColor: z.zoneColor }}
              />
              <div className="space-y-2.5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-[13px] font-semibold leading-tight">
                      {z.zoneName}
                    </h3>
                    <p className="text-[10px] tabular-nums text-muted-foreground">
                      KPI {z.kpi.toFixed(1)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${WARN_PILL[z.warningKpi]}`}
                  >
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${WARN_DOT[z.warningKpi]}`}
                    />
                    {WARN_LABEL[z.warningKpi]}
                  </span>
                </div>

                {/* 4 KPIs en grid 2x2 — drivers + sin driver + en curso + demorados.
                    Demorados es la única que tiene énfasis cuando > 0. */}
                <div className="grid grid-cols-2 gap-1.5">
                  <KpiTile
                    label="Drivers"
                    value={`${z.availableDrivers}/${z.totalDrivers}`}
                    tone={
                      z.warningDriversConnections === "red"
                        ? "danger"
                        : z.warningDriversConnections === "yellow"
                          ? "warning"
                          : "neutral"
                    }
                  />
                  <KpiTile
                    label="Sin driver"
                    value={String(z.orderWithoutDriver)}
                    tone={z.orderWithoutDriver > 0 ? "warning" : "neutral"}
                  />
                  <KpiTile
                    label="En curso"
                    value={String(z.activeRequests)}
                    tone="neutral"
                  />
                  <KpiTile
                    label="Demorados"
                    value={String(z.requestsDelayed)}
                    tone={z.requestsDelayed > 0 ? "danger" : "neutral"}
                    emphasis={z.requestsDelayed > 0}
                  />
                </div>

                {/* Mini-embudo: 5 segmentos por estado, cada uno con count */}
                <div className="space-y-1.5">
                  <StateStrip byStage={byStage} />
                  <StateLegend
                    byStage={byStage}
                    totalActive={zoneActive.length}
                    critical={critical}
                  />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function KpiTile({
  label,
  value,
  tone,
  emphasis,
}: {
  label: string
  value: string
  tone: "neutral" | "warning" | "danger"
  emphasis?: boolean
}) {
  const valueClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-amber-700 dark:text-amber-400"
        : ""
  const bgClass = emphasis
    ? tone === "danger"
      ? "bg-destructive/10"
      : tone === "warning"
        ? "bg-amber-100/40 dark:bg-amber-950/30"
        : "bg-muted/40"
    : "bg-muted/40"
  return (
    <div className={`rounded px-2 py-1.5 ${bgClass}`}>
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`text-base font-bold leading-none tabular-nums ${valueClass}`}
      >
        {value}
      </div>
    </div>
  )
}

function StateStrip({
  byStage,
}: {
  byStage: Map<string, LiveRequest[]>
}) {
  return (
    <div className="grid grid-cols-5 gap-0.5">
      {STAGES.map((s) => {
        const count = byStage.get(s.key)?.length || 0
        return (
          <div
            key={s.key}
            className={`flex h-7 flex-col items-center justify-center rounded ${
              count === 0 ? "bg-muted/30" : s.bg
            }`}
            title={`${s.short}: ${count}`}
          >
            <span
              className={`text-xs font-bold tabular-nums leading-none ${
                count === 0 ? "text-muted-foreground/50" : "text-white"
              }`}
            >
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function StateLegend({
  byStage,
  totalActive,
  critical,
}: {
  byStage: Map<string, LiveRequest[]>
  totalActive: number
  critical: number
}) {
  if (totalActive === 0) {
    return (
      <p className="text-center text-[10px] italic text-muted-foreground/60">
        Sin pedidos en curso
      </p>
    )
  }
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-muted-foreground">
        {totalActive} en curso ·{" "}
        {STAGES.map((s, i) => {
          const c = byStage.get(s.key)?.length || 0
          if (c === 0) return null
          return (
            <span key={s.key}>
              <span className={s.text}>{s.short.toLowerCase()}</span> {c}
              {i < STAGES.length - 1 ? " " : ""}
            </span>
          )
        }).filter(Boolean)}
      </span>
      {critical > 0 && (
        <span className="font-bold text-destructive">⚠ {critical} +15min</span>
      )}
    </div>
  )
}
