"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { buildHeatmap } from "@/lib/services/turnos-aggregate"
import type {
  CellMetric,
  FlattenedShift,
  Metric,
} from "@/lib/types/turnos.types"

interface Props {
  shifts: FlattenedShift[]
  hours: readonly number[]
  metric: Metric
  onCellClick?: (zone: string, hour: number) => void
}

function cellBackground(metric: Metric, cell: CellMetric | null): string {
  if (!cell) return "transparent"

  if (metric === "occupancy") {
    // gradiente rojo (0%) → ámbar (50%) → verde (100%)
    const i = Math.max(0, Math.min(1, cell.intensity))
    const hue = i * 130 // 0 = red, 130 = green
    const lightness = 88 - i * 18 // más oscuro a más ocupación
    return `hsl(${hue}, 70%, ${lightness}%)`
  }

  if (metric === "active-shifts") {
    const i = Math.max(0, Math.min(1, cell.intensity))
    const lightness = 92 - i * 28
    return `hsl(212, 70%, ${lightness}%)`
  }

  // drivers / person-hours: color por tipo de pago
  const mixed = cell.hasGuaranteed && cell.hasPerOrder
  const guaranteed = cell.hasGuaranteed && !cell.hasPerOrder
  const perOrder = cell.hasPerOrder && !cell.hasGuaranteed

  if (mixed) return cell.full ? "hsl(45, 85%, 65%)" : "hsl(45, 90%, 80%)"
  if (guaranteed) return cell.full ? "hsl(140, 50%, 55%)" : "hsl(140, 55%, 80%)"
  if (perOrder) return cell.full ? "hsl(28, 85%, 60%)" : "hsl(28, 90%, 80%)"
  return "transparent"
}

function cellTooltip(cell: CellMetric): string {
  const parts: string[] = []
  if (cell.hasGuaranteed) parts.push("Garantizado")
  if (cell.hasPerOrder) parts.push("Por pedido")
  const tipo = parts.length === 2 ? "Mixto" : parts[0] || "—"
  return `${tipo} · ${cell.shiftCount} turno${cell.shiftCount > 1 ? "s" : ""}${
    cell.full ? " · Lleno" : ""
  }`
}

function MetricLegend({ metric }: { metric: Metric }) {
  if (metric === "occupancy") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Baja</span>
        <div
          className="h-3 w-32 rounded"
          style={{
            background:
              "linear-gradient(to right, hsl(0,70%,88%), hsl(65,70%,79%), hsl(130,70%,70%))",
          }}
        />
        <span>Alta</span>
      </div>
    )
  }
  if (metric === "active-shifts") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>1 turno</span>
        <div
          className="h-3 w-32 rounded"
          style={{
            background:
              "linear-gradient(to right, hsl(212,70%,92%), hsl(212,70%,64%))",
          }}
        />
        <span>4+ turnos</span>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <LegendChip color="hsl(140, 55%, 80%)" label="Garantizado" />
      <LegendChip color="hsl(28, 90%, 80%)" label="Por pedido" />
      <LegendChip color="hsl(45, 90%, 80%)" label="Mixto" />
      <span className="text-muted-foreground/70">
        Tono más oscuro = lleno (drivers ≥ máx)
      </span>
    </div>
  )
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-3 rounded"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}

export function TurnosHeatmap({ shifts, hours, metric, onCellClick }: Props) {
  const slots = hours.slice(0, -1)
  const rows = buildHeatmap(shifts, hours, metric)

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Distribución por zona y hora</h2>
        <MetricLegend metric={metric} />
      </div>

      <div className="overflow-x-auto">
        <TooltipProvider delayDuration={150}>
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b bg-card px-3 py-2 text-left font-medium text-muted-foreground">
                  Zona
                </th>
                {slots.map((h) => (
                  <th
                    key={h}
                    className="border-b bg-card px-2 py-2 text-center text-xs font-medium text-muted-foreground whitespace-nowrap"
                  >
                    {h}–{h + 1}
                  </th>
                ))}
                <th className="border-b bg-card px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                  Total día
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.zone}>
                  <td className="sticky left-0 z-10 border-b bg-card px-3 py-2 font-medium whitespace-nowrap">
                    {row.zone}
                  </td>
                  {row.cells.map((cell, idx) => {
                    const bg = cellBackground(metric, cell)
                    if (!cell) {
                      return (
                        <td
                          key={idx}
                          className="border-b border-l border-l-border/30 px-2 py-2 text-center text-xs text-muted-foreground/40"
                        >
                          —
                        </td>
                      )
                    }
                    const hourLabel = slots[idx]
                    const clickable = !!onCellClick
                    return (
                      <td
                        key={idx}
                        className="border-b border-l border-l-border/30 p-0 text-center"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={
                                clickable
                                  ? () => onCellClick(row.zone, hourLabel)
                                  : undefined
                              }
                              disabled={!clickable}
                              className={
                                "w-full px-2 py-2 text-xs font-medium tabular-nums outline-none transition-[transform,box-shadow] " +
                                (clickable
                                  ? "cursor-pointer hover:ring-2 hover:ring-foreground/40 focus-visible:ring-2 focus-visible:ring-foreground"
                                  : "cursor-default")
                              }
                              style={{ backgroundColor: bg }}
                            >
                              {cell.display}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-0.5">
                              <div className="font-medium">
                                {row.zone} · {hourLabel}–{hourLabel + 1} hs
                              </div>
                              <div>{cell.display}</div>
                              <div className="text-xs text-muted-foreground">
                                {cellTooltip(cell)}
                              </div>
                              {clickable && (
                                <div className="text-[10px] text-muted-foreground/70 pt-0.5">
                                  Click para ver turnos
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    )
                  })}
                  <td className="border-b border-l bg-muted/30 px-3 py-2 text-center text-xs font-semibold tabular-nums">
                    {row.total.display}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TooltipProvider>
      </div>
    </div>
  )
}
