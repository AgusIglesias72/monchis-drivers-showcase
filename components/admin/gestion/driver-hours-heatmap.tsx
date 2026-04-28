"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { WEEKDAY_LABELS } from "@/lib/types/driver-stats.types"

interface Props {
  heatmap: number[][] // [weekday-1][hourIdx] = sessions
  hours: number[]
}

function intensityColor(intensity: number): string {
  if (intensity <= 0) return "transparent"
  // Gradiente azul: cuanto más sesiones, más oscuro
  const i = Math.min(1, intensity)
  const lightness = 92 - i * 36 // 92% (claro) → 56% (saturado)
  return `hsl(212, 75%, ${lightness}%)`
}

export function DriverHoursHeatmap({ heatmap, hours }: Props) {
  const max = Math.max(1, ...heatmap.flat())
  const total = heatmap.flat().reduce((a, b) => a + b, 0)

  if (total === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Sin sesiones procesadas en este periodo.
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Segmentos del día</h3>
          <p className="text-xs text-muted-foreground">
            Intensidad = cantidad de sesiones que cubrieron esa franja en el periodo.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Menos</span>
          <div
            className="h-3 w-32 rounded"
            style={{
              background:
                "linear-gradient(to right, hsl(212,75%,92%), hsl(212,75%,74%), hsl(212,75%,56%))",
            }}
          />
          <span>Más</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <TooltipProvider delayDuration={150}>
          <table className="min-w-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card px-2 py-1.5 text-left font-medium text-muted-foreground">
                  Día
                </th>
                {hours.map((h) => (
                  <th
                    key={h}
                    className="bg-card px-1.5 py-1.5 text-center font-medium text-muted-foreground whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
                <th className="bg-card px-2 py-1.5 text-center font-medium text-muted-foreground">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {WEEKDAY_LABELS.map((label, wIdx) => {
                const row = heatmap[wIdx] || []
                const rowTotal = row.reduce((a, b) => a + b, 0)
                return (
                  <tr key={label}>
                    <td className="sticky left-0 z-10 bg-card px-2 py-1.5 font-medium whitespace-nowrap">
                      {label}
                    </td>
                    {hours.map((h, hIdx) => {
                      const sessions = row[hIdx] || 0
                      const bg = intensityColor(sessions / max)
                      return (
                        <td
                          key={hIdx}
                          className="border border-border/30 p-0 text-center"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="cursor-default px-1.5 py-1.5 tabular-nums"
                                style={{
                                  backgroundColor: bg,
                                  minWidth: 28,
                                  color:
                                    sessions / max > 0.55 ? "white" : undefined,
                                }}
                              >
                                {sessions > 0 ? sessions : ""}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-0.5">
                                <div className="font-medium">
                                  {label} · {h}–{h + 1} hs
                                </div>
                                <div>
                                  {sessions} sesión{sessions === 1 ? "" : "es"}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      )
                    })}
                    <td className="border-l bg-muted/30 px-2 py-1.5 text-center font-semibold tabular-nums">
                      {rowTotal}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TooltipProvider>
      </div>
    </div>
  )
}
