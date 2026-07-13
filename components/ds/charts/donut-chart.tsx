"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { ChartTooltip } from "./chart-tooltip"
import { CATEGORICAL, SEQUENTIAL } from "./palette"
import { cn } from "@/lib/utils"

export interface DonutDatum {
  name: string
  value: number
}

export interface DonutChartDSProps {
  data: DonutDatum[]
  /** Etiqueta chica al centro (ej. "Total"). */
  centerLabel?: React.ReactNode
  /** Número grande al centro (mono/display). */
  centerValue?: React.ReactNode
  /**
   * Paleta de rebanadas.
   * - "categorical": marca → cálidos (categorías distintas).
   * - "sequential": rampa mono-hue de marca (magnitud / partes de un todo).
   */
  palette?: "categorical" | "sequential"
  /** Colores explícitos por rebanada (tiene prioridad sobre `palette`). */
  colors?: string[]
  /** Grosor del anillo 0–1 (fracción del radio). Default 0.62. */
  innerRatio?: number
  className?: string
}

/**
 * Donut STUDIO. Rebanadas con paleta de marca (categórica o rampa
 * secuencial — nunca arcoíris frío) y texto central en display + mono.
 */
export function DonutChartDS({
  data,
  centerLabel,
  centerValue,
  palette = "categorical",
  colors,
  innerRatio = 0.62,
  className,
}: DonutChartDSProps) {
  const ramp = colors ?? (palette === "sequential" ? SEQUENTIAL : CATEGORICAL)
  const hasCenter = centerLabel != null || centerValue != null

  return (
    <div className={cn("relative h-full w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<ChartTooltip hideLabel />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={`${Math.round(innerRatio * 100)}%`}
            outerRadius="90%"
            paddingAngle={1.5}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={ramp[i % ramp.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {hasCenter && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerValue != null && (
            <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
              {centerValue}
            </span>
          )}
          {centerLabel != null && (
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[var(--ls-label)] text-muted-foreground">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
