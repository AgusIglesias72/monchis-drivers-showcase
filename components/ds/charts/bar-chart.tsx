"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChartTooltip } from "./chart-tooltip"
import { seriesColor } from "./palette"

const GRID_STROKE = "var(--border)"
const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)" } as const
const AXIS_TICK_FONT = { fontFamily: "var(--font-mono)" } as const

export interface ChartSeries {
  /** Clave del dato en cada fila de `data`. */
  key: string
  /** Etiqueta legible (leyenda / tooltip). Default: `key`. */
  label?: string
  /** Color HEX. Default: color de marca por índice. */
  color?: string
}

export interface BarChartDSProps<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  data: T[]
  /** Clave del eje de categorías. */
  xKey: string
  series: ChartSeries[]
  /** Apila las series. */
  stacked?: boolean
  /** Barras horizontales (categorías en Y). */
  horizontal?: boolean
  /** Muestra la leyenda. */
  legend?: boolean
  /** Radio de las esquinas de la barra. Default 6. */
  radius?: number
  className?: string
}

/**
 * Gráfico de barras STUDIO. Grid sutil, ticks mono, barras redondeadas y
 * paleta de marca por defecto (rojo → cálidos, sin arcoíris frío).
 */
export function BarChartDS<
  T extends Record<string, unknown> = Record<string, unknown>,
>({
  data,
  xKey,
  series,
  stacked = false,
  horizontal = false,
  legend = false,
  radius = 6,
  className,
}: BarChartDSProps<T>) {
  const stackId = stacked ? "stack" : undefined

  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        barCategoryGap={horizontal ? "20%" : "25%"}
      >
        <CartesianGrid
          stroke={GRID_STROKE}
          strokeOpacity={0.7}
          vertical={horizontal}
          horizontal={!horizontal}
        />
        {horizontal ? (
          <>
            <XAxis
              type="number"
              tick={{ ...AXIS_TICK, ...AXIS_TICK_FONT }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey={xKey}
              tick={{ ...AXIS_TICK, ...AXIS_TICK_FONT }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xKey}
              tick={{ ...AXIS_TICK, ...AXIS_TICK_FONT }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ ...AXIS_TICK, ...AXIS_TICK_FONT }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={40}
            />
          </>
        )}
        <Tooltip
          cursor={{ fill: "var(--muted-foreground)", fillOpacity: 0.08 }}
          content={<ChartTooltip />}
        />
        {legend && (
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconType="circle"
            iconSize={8}
          />
        )}
        {series.map((s, i) => {
          const isLast = i === series.length - 1
          // En stacked sólo la última serie redondea la punta externa.
          const barRadius: [number, number, number, number] = horizontal
            ? [0, radius, radius, 0]
            : [radius, radius, 0, 0]
          const flat: [number, number, number, number] = [0, 0, 0, 0]
          return (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label ?? s.key}
              fill={s.color ?? seriesColor(i)}
              stackId={stackId}
              radius={stacked && !isLast ? flat : barRadius}
              maxBarSize={horizontal ? 28 : 48}
            />
          )
        })}
      </BarChart>
    </ResponsiveContainer>
  )
}
