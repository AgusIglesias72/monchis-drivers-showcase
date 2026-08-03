"use client"

import { useId } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChartTooltip } from "./chart-tooltip"
import { BRAND, COMPARISON, seriesColor } from "./palette"
import type { ChartSeries } from "./bar-chart"

const GRID_STROKE = "var(--border)"
const AXIS_TICK = {
  fontSize: 11,
  fill: "var(--muted-foreground)",
  fontFamily: "var(--font-mono)",
} as const

export interface AreaChartDSProps<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  data: T[]
  xKey: string
  series: ChartSeries[]
  /** Serie de comparación (W-N): línea NEUTRAL punteada, sin relleno. */
  comparison?: { key: string; label?: string }
  /** Apila las áreas. */
  stacked?: boolean
  /** Muestra la leyenda. */
  legend?: boolean
  curve?: "monotone" | "linear" | "natural"
  className?: string
}

/**
 * Gráfico de área STUDIO. Relleno degradado de marca suave
 * (BRAND @ 0.25 → 0) y trazo de marca. Sin arcoíris frío.
 */
export function AreaChartDS<
  T extends Record<string, unknown> = Record<string, unknown>,
>({
  data,
  xKey,
  series,
  comparison,
  stacked = false,
  legend = false,
  curve = "monotone",
  className,
}: AreaChartDSProps<T>) {
  const gradId = useId()
  const stackId = stacked ? "stack" : undefined

  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s, i) => {
            const color = s.color ?? (i === 0 ? BRAND : seriesColor(i))
            return (
              <linearGradient
                key={s.key}
                id={`${gradId}-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            )
          })}
        </defs>
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
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
        )}
        {comparison && (
          <Area
            type={curve}
            dataKey={comparison.key}
            name={comparison.label ?? "Comparación"}
            stroke={COMPARISON}
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="none"
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
        )}
        {series.map((s, i) => {
          const color = s.color ?? (i === 0 ? BRAND : seriesColor(i))
          return (
            <Area
              key={s.key}
              type={curve}
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradId}-${i})`}
              stackId={stackId}
              dot={false}
              activeDot={{ r: 5 }}
            />
          )
        })}
      </AreaChart>
    </ResponsiveContainer>
  )
}
