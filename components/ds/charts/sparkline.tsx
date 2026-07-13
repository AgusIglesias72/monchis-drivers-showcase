"use client"

import { useId } from "react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { BRAND, NEUTRAL, SUCCESS, WARNING, DANGER } from "./palette"
import { cn } from "@/lib/utils"

export type SparklineTone = "brand" | "neutral" | "success" | "warning" | "danger"

const TONE_COLOR: Record<SparklineTone, string> = {
  brand: BRAND,
  neutral: NEUTRAL,
  success: SUCCESS,
  warning: WARNING,
  danger: DANGER,
}

export interface SparklineProps {
  /** Serie de números (orden = eje X). */
  data: number[]
  tone?: SparklineTone
  /** Ancho en px. Si se omite, ocupa el 100% del contenedor. */
  width?: number
  /** Alto en px. Default 32. */
  height?: number
  className?: string
}

/**
 * Sparkline STUDIO: mini línea inline sin ejes, trazo de marca con un
 * relleno tenue del mismo tono. Para KPIs y celdas de tabla.
 */
export function Sparkline({
  data,
  tone = "brand",
  width,
  height = 32,
  className,
}: SparklineProps) {
  const gradId = useId()
  const color = TONE_COLOR[tone]
  const chartData = data.map((value, i) => ({ i, value }))

  return (
    <div
      className={cn("inline-block align-middle", className)}
      style={{ width: width ?? "100%", height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
