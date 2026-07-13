"use client"

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChartTooltip } from "./chart-tooltip"
import { COMPARISON, seriesColor } from "./palette"
import type { ChartSeries } from "./bar-chart"

const GRID_STROKE = "var(--border)"
const AXIS_TICK = {
  fontSize: 11,
  fill: "var(--muted-foreground)",
  fontFamily: "var(--font-mono)",
} as const

export interface LineChartDSProps<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  data: T[]
  xKey: string
  series: ChartSeries[]
  /** Serie de comparación (W-N / período previo): línea NEUTRAL punteada. */
  comparison?: { key: string; label?: string }
  /** Muestra puntos en los vértices. Default off. */
  dots?: boolean
  /** Muestra la leyenda. */
  legend?: boolean
  /** Interpolación de la línea. Default "monotone". */
  curve?: "monotone" | "linear" | "natural"
  className?: string
}

/**
 * Gráfico de líneas STUDIO. Líneas suaves de marca, puntos apagados por
 * defecto y una serie de comparación NEUTRAL punteada para W-N.
 */
export function LineChartDS<
  T extends Record<string, unknown> = Record<string, unknown>,
>({
  data,
  xKey,
  series,
  comparison,
  dots = false,
  legend = false,
  curve = "monotone",
  className,
}: LineChartDSProps<T>) {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID_STROKE} strokeOpacity={0.7} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={40}
        />
        <Tooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.25 }}
          content={<ChartTooltip />}
        />
        {legend && (
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="line" iconSize={12} />
        )}
        {comparison && (
          <Line
            type={curve}
            dataKey={comparison.key}
            name={comparison.label ?? "Comparación"}
            stroke={COMPARISON}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
        )}
        {series.map((s, i) => {
          const color = s.color ?? seriesColor(i)
          return (
            <Line
              key={s.key}
              type={curve}
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={color}
              strokeWidth={2}
              dot={dots ? { r: 3, strokeWidth: 0, fill: color } : false}
              activeDot={{ r: 5 }}
            />
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}
