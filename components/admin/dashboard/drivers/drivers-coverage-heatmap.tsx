"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { MapPin } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { CoverageZoneHour } from "@/lib/services/dashboard-drivers.service"

// Color escala verde → amarillo → naranja → rojo según occupancy.
// 0%: gris claro (sin demanda asignada). 1..50%: verde claro. 50..80%: amarillo.
// 80..100%: naranja. 100%+: rojo intenso (sobre-saturación).
function occupancyColor(occupancy: number, max: number): string {
  if (max === 0) return "rgb(241, 245, 249)" // slate-100 — sin oferta en ese slot
  const pct = Math.min(occupancy, 1.2)
  if (pct < 0.2) return "rgb(220, 252, 231)" // emerald-100
  if (pct < 0.4) return "rgb(187, 247, 208)" // emerald-200
  if (pct < 0.6) return "rgb(254, 240, 138)" // yellow-200
  if (pct < 0.8) return "rgb(253, 224, 71)" // yellow-300
  if (pct < 1.0) return "rgb(253, 186, 116)" // orange-300
  return "rgb(248, 113, 113)" // red-400
}

function textColor(occupancy: number, max: number): string {
  if (max === 0) return "text-slate-400"
  return occupancy >= 0.6 ? "text-slate-900" : "text-slate-700"
}

export function DriversCoverageHeatmap({
  data,
}: {
  data: CoverageZoneHour[]
}) {
  const { zones, hours, grid } = useMemo(() => {
    const zoneSet = new Set<string>()
    const hourSet = new Set<number>()
    const grid = new Map<string, CoverageZoneHour>()
    for (const cell of data) {
      zoneSet.add(cell.zone)
      hourSet.add(cell.hour)
      grid.set(`${cell.zone}|${cell.hour}`, cell)
    }
    return {
      zones: Array.from(zoneSet).sort((a, b) => a.localeCompare(b, "es")),
      hours: Array.from(hourSet).sort((a, b) => a - b),
      grid,
    }
  }, [data])

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            Cobertura zona × hora
          </CardTitle>
          <CardDescription>
            Sin datos de turnos disponibles. Revisá la conexión con
            api.monchis-drivers.com.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            Cobertura zona × hora
          </CardTitle>
          <CardDescription>
            Drivers asignados vs máximo por zona y hora. Verde: baja ocupación.
            Rojo: saturado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider delayDuration={100}>
            <div className="overflow-x-auto">
              <div
                className="grid gap-px text-xs"
                style={{
                  gridTemplateColumns: `minmax(140px, 1fr) repeat(${hours.length}, minmax(36px, 1fr))`,
                }}
              >
                {/* Header */}
                <div className="sticky left-0 z-10 bg-background px-2 py-1.5 font-medium text-muted-foreground">
                  Zona
                </div>
                {hours.map((h) => (
                  <div
                    key={`h-${h}`}
                    className="px-1 py-1.5 text-center font-medium text-muted-foreground"
                  >
                    {h}h
                  </div>
                ))}

                {/* Rows */}
                {zones.map((zone) => (
                  <Row
                    key={zone}
                    zone={zone}
                    hours={hours}
                    grid={grid}
                  />
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span>Ocupación:</span>
              <LegendChip color="rgb(241, 245, 249)" label="Sin turno" />
              <LegendChip color="rgb(220, 252, 231)" label="0-20%" />
              <LegendChip color="rgb(254, 240, 138)" label="40-60%" />
              <LegendChip color="rgb(253, 224, 71)" label="60-80%" />
              <LegendChip color="rgb(253, 186, 116)" label="80-100%" />
              <LegendChip color="rgb(248, 113, 113)" label="100%+" />
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function Row({
  zone,
  hours,
  grid,
}: {
  zone: string
  hours: number[]
  grid: Map<string, CoverageZoneHour>
}) {
  return (
    <>
      <div className="sticky left-0 z-10 truncate bg-background px-2 py-1.5 font-medium">
        {zone}
      </div>
      {hours.map((h) => {
        const cell = grid.get(`${zone}|${h}`)
        const assigned = cell?.assigned ?? 0
        const max = cell?.max ?? 0
        const occ = cell?.occupancy ?? 0
        const bg = occupancyColor(occ, max)
        return (
          <Tooltip key={`${zone}-${h}`}>
            <TooltipTrigger asChild>
              <div
                className={`flex h-9 cursor-default items-center justify-center rounded-sm font-medium ${textColor(occ, max)}`}
                style={{ backgroundColor: bg }}
                aria-label={`${zone} · ${h}h · ${assigned}/${max}`}
              >
                {max > 0 ? `${assigned}/${max}` : "—"}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-0.5">
                <div className="font-semibold">{zone}</div>
                <div>
                  {h}:00 — {h + 1}:00
                </div>
                <div>
                  Asignados: <strong>{assigned}</strong> / {max}
                </div>
                <div>
                  Ocupación:{" "}
                  <strong>
                    {max > 0 ? `${Math.round(occ * 100)}%` : "—"}
                  </strong>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </>
  )
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-3 w-3 rounded-sm border border-slate-200"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}
