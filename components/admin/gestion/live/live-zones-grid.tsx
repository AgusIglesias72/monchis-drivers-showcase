"use client"

import { useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"
import type { LiveZone } from "@/lib/types/live-panel.types"

type Highlight = { kind: "request" | "driver" | "zone"; id: string } | null

interface Props {
  zones: LiveZone[]
  highlight: Highlight
  onHighlight: (h: Highlight) => void
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

export function LiveZonesGrid({ zones, highlight, onHighlight }: Props) {
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
          Ordenadas por criticidad
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {sortedZones.map((z) => {
          const isHighlighted =
            highlight?.kind === "zone" && highlight.id === z.zoneId
          const borderTone =
            z.warningKpi === "red"
              ? "border-red-300 dark:border-red-900"
              : z.warningKpi === "yellow"
                ? "border-amber-300 dark:border-amber-900"
                : ""
          return (
            <button
              key={z.zoneId}
              type="button"
              onClick={() =>
                onHighlight(
                  isHighlighted ? null : { kind: "zone", id: z.zoneId },
                )
              }
              className={`group relative overflow-hidden rounded-lg border bg-card text-left transition hover:border-foreground/30 hover:shadow-sm ${borderTone} ${
                isHighlighted
                  ? "border-foreground/40 shadow-sm ring-2 ring-foreground/10"
                  : ""
              }`}
            >
              <div
                className="h-1"
                style={{ backgroundColor: z.zoneColor }}
              />
              <div className="space-y-2 p-2.5">
                {/* Header: nombre + status */}
                <div className="flex items-center justify-between gap-1.5">
                  <h3 className="truncate text-[12px] font-semibold leading-tight">
                    {z.zoneName}
                  </h3>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 text-[10px] font-medium ${
                      z.warningKpi === "red"
                        ? "text-red-700 dark:text-red-400"
                        : z.warningKpi === "yellow"
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${WARN_DOT[z.warningKpi]}`}
                    />
                    {WARN_LABEL[z.warningKpi]}
                  </span>
                </div>

                {/* 4 KPIs en línea: count grande + label chico */}
                <div className="grid grid-cols-4 gap-1">
                  <Stat
                    label="DRV"
                    value={`${z.availableDrivers}/${z.totalDrivers}`}
                    tone={
                      z.warningDriversConnections === "red"
                        ? "danger"
                        : z.warningDriversConnections === "yellow"
                          ? "warning"
                          : "neutral"
                    }
                  />
                  <Stat
                    label="S/D"
                    value={String(z.orderWithoutDriver)}
                    tone={z.orderWithoutDriver > 0 ? "warning" : "neutral"}
                  />
                  <Stat
                    label="CRS"
                    value={String(z.activeRequests)}
                    tone="neutral"
                  />
                  <Stat
                    label="DEM"
                    value={String(z.requestsDelayed)}
                    tone={z.requestsDelayed > 0 ? "danger" : "neutral"}
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

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "neutral" | "warning" | "danger"
}) {
  const valueClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-amber-700 dark:text-amber-400"
        : "text-foreground"
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <span className={`text-sm font-bold leading-none tabular-nums ${valueClass}`}>
        {value}
      </span>
      <span className="mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  )
}
