"use client"

import { useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
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

const STATE_COLOR: Record<string, string> = {
  PENDING: "bg-amber-500",
  ACCEPTED: "bg-violet-500",
  WAITING_ORDER: "bg-sky-500",
  DELIVERY: "bg-blue-600",
  OUTSIDE: "bg-cyan-600",
}

interface StageDef {
  key: string
  short: string
  icon: LucideIcon
  color: string
}

const STAGES: StageDef[] = [
  { key: "PENDING", short: "Buscando", icon: Search, color: "text-amber-700 dark:text-amber-400" },
  { key: "ACCEPTED", short: "Aceptado", icon: Handshake, color: "text-violet-700 dark:text-violet-400" },
  { key: "WAITING_ORDER", short: "Comercio", icon: ChefHat, color: "text-sky-700 dark:text-sky-400" },
  { key: "DELIVERY", short: "Camino", icon: Bike, color: "text-blue-700 dark:text-blue-400" },
  { key: "OUTSIDE", short: "Llegando", icon: Navigation, color: "text-cyan-700 dark:text-cyan-400" },
]

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

type SortKey = "status" | "name" | "drivers" | "sin_driver" | "en_curso" | "demorados"
type SortDir = "asc" | "desc"

const STATUS_PRIORITY: Record<LiveZone["warningKpi"], number> = {
  red: 0,
  yellow: 1,
  default: 2,
}

interface ZoneRow {
  zone: LiveZone
  byState: Record<string, LiveRequest[]>
  totalActive: number
  criticalCount: number
}

export function LiveZonesGrid({ zones, active, highlight, onHighlight }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("demorados")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const rows = useMemo<ZoneRow[]>(() => {
    const activeByZone = new Map<string, LiveRequest[]>()
    for (const r of active) {
      if (!r.zoneId) continue
      if (!activeByZone.has(r.zoneId)) activeByZone.set(r.zoneId, [])
      activeByZone.get(r.zoneId)!.push(r)
    }
    return zones.map((z) => {
      const zoneActive = activeByZone.get(z.zoneId) || []
      const byState: Record<string, LiveRequest[]> = {}
      for (const r of zoneActive) {
        const k = r.state || ""
        if (!byState[k]) byState[k] = []
        byState[k].push(r)
      }
      const buckets = bucketize(zoneActive)
      return {
        zone: z,
        byState,
        totalActive: zoneActive.length,
        criticalCount: buckets.critical,
      }
    })
  }, [zones, active])

  const sortedRows = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const dirMul = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "status":
          return (
            (STATUS_PRIORITY[a.zone.warningKpi] - STATUS_PRIORITY[b.zone.warningKpi]) *
            dirMul
          )
        case "name":
          return a.zone.zoneName.localeCompare(b.zone.zoneName, "es") * dirMul
        case "drivers":
          return (a.zone.availableDrivers - b.zone.availableDrivers) * dirMul
        case "sin_driver":
          return (a.zone.orderWithoutDriver - b.zone.orderWithoutDriver) * dirMul
        case "en_curso":
          return (a.zone.activeRequests - b.zone.activeRequests) * dirMul
        case "demorados":
          return (a.zone.requestsDelayed - b.zone.requestsDelayed) * dirMul
      }
    })
    return copy
  }, [rows, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      // Default direction según si es texto o número.
      setSortDir(key === "name" || key === "status" ? "asc" : "desc")
    }
  }

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
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold">Zonas operativas</h2>
          <p className="text-[11px] text-muted-foreground">
            Click para resaltar en el mapa · Click en columna para ordenar
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="hidden lg:inline">Distribución por estado:</span>
          {STAGES.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1">
              <span
                className={`inline-block h-2 w-2 rounded-sm ${
                  STATE_COLOR[s.key] || "bg-muted"
                }`}
              />
              <span className="hidden sm:inline">{s.short}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
              <Th
                onClick={() => toggleSort("status")}
                active={sortKey === "status"}
                dir={sortDir}
                className="w-[42%] sm:w-[28%]"
              >
                Zona
              </Th>
              <Th
                onClick={() => toggleSort("drivers")}
                active={sortKey === "drivers"}
                dir={sortDir}
                align="center"
                className="hidden sm:table-cell"
              >
                Drivers
              </Th>
              <Th
                onClick={() => toggleSort("sin_driver")}
                active={sortKey === "sin_driver"}
                dir={sortDir}
                align="center"
              >
                Sin driver
              </Th>
              <Th
                onClick={() => toggleSort("en_curso")}
                active={sortKey === "en_curso"}
                dir={sortDir}
                align="center"
              >
                En curso
              </Th>
              <Th
                onClick={() => toggleSort("demorados")}
                active={sortKey === "demorados"}
                dir={sortDir}
                align="center"
              >
                Demorados
              </Th>
              <th className="px-3 py-2 text-left font-medium hidden md:table-cell">
                Distribución
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(({ zone: z, byState, totalActive, criticalCount }) => {
              const isHighlighted =
                highlight?.kind === "zone" && highlight.id === z.zoneId
              return (
                <tr
                  key={z.zoneId}
                  onClick={() =>
                    onHighlight(
                      isHighlighted ? null : { kind: "zone", id: z.zoneId },
                    )
                  }
                  className={`cursor-pointer border-b transition hover:bg-muted/40 ${
                    isHighlighted ? "bg-muted/60" : ""
                  }`}
                >
                  {/* Zona */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-1 shrink-0 rounded-sm"
                        style={{ backgroundColor: z.zoneColor }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[13px] font-semibold leading-tight">
                          <span className="truncate">{z.zoneName}</span>
                          <span
                            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${WARN_DOT[z.warningKpi]}`}
                            title={WARN_LABEL[z.warningKpi]}
                          />
                        </div>
                        <div className="text-[10px] tabular-nums text-muted-foreground">
                          KPI {z.kpi.toFixed(1)} · {WARN_LABEL[z.warningKpi]}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Drivers */}
                  <td className="hidden px-3 py-2 text-center sm:table-cell">
                    <span
                      className={`font-mono tabular-nums ${
                        z.warningDriversConnections === "red"
                          ? "text-destructive font-semibold"
                          : z.warningDriversConnections === "yellow"
                            ? "text-amber-700 dark:text-amber-400 font-semibold"
                            : "text-foreground"
                      }`}
                    >
                      {z.availableDrivers}/{z.totalDrivers}
                    </span>
                  </td>

                  {/* Sin driver */}
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-xs font-semibold tabular-nums ${
                        z.orderWithoutDriver > 0
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300"
                          : "text-muted-foreground/60"
                      }`}
                    >
                      {z.orderWithoutDriver}
                    </span>
                  </td>

                  {/* En curso */}
                  <td className="px-3 py-2 text-center">
                    <span className="font-mono text-xs font-semibold tabular-nums">
                      {z.activeRequests}
                    </span>
                  </td>

                  {/* Demorados */}
                  <td className="px-3 py-2 text-center">
                    {z.requestsDelayed > 0 ? (
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-destructive/15 px-1.5 text-xs font-bold tabular-nums text-destructive">
                        {z.requestsDelayed}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">—</span>
                    )}
                  </td>

                  {/* Distribución */}
                  <td className="hidden px-3 py-2 md:table-cell">
                    <StateDistribution
                      byState={byState}
                      total={totalActive}
                      criticalCount={criticalCount}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Th({
  children,
  onClick,
  active,
  dir,
  align,
  className,
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  dir: SortDir
  align?: "left" | "center"
  className?: string
}) {
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th
      onClick={onClick}
      className={`cursor-pointer select-none px-3 py-2 font-medium hover:text-foreground ${
        align === "center" ? "text-center" : "text-left"
      } ${active ? "text-foreground" : ""} ${className ?? ""}`}
    >
      <span
        className={`inline-flex items-center gap-1 ${align === "center" ? "justify-center" : ""}`}
      >
        {children}
        <Icon
          className={`h-2.5 w-2.5 transition ${
            active ? "opacity-100" : "opacity-30"
          }`}
        />
      </span>
    </th>
  )
}

function StateDistribution({
  byState,
  total,
  criticalCount,
}: {
  byState: Record<string, LiveRequest[]>
  total: number
  criticalCount: number
}) {
  if (total === 0) {
    return (
      <span className="text-[11px] text-muted-foreground/60">
        Sin pedidos en curso
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Barra apilada */}
      <div className="flex h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-muted/40">
        {STAGES.map((s) => {
          const count = byState[s.key]?.length || 0
          if (count === 0) return null
          const pct = (count / total) * 100
          return (
            <div
              key={s.key}
              className={STATE_COLOR[s.key]}
              style={{ width: `${pct}%` }}
              title={`${s.short}: ${count}`}
            />
          )
        })}
      </div>

      {/* Counts inline */}
      <div className="flex items-center gap-1.5 text-[11px] tabular-nums">
        {STAGES.map((s) => {
          const count = byState[s.key]?.length || 0
          if (count === 0) return null
          return (
            <span
              key={s.key}
              className={`font-semibold ${s.color}`}
              title={s.short}
            >
              {count}
            </span>
          )
        })}
      </div>

      {criticalCount > 0 && (
        <span className="ml-2 inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
          ⚠ {criticalCount}
        </span>
      )}
    </div>
  )
}
