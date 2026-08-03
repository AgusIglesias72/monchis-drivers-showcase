"use client"

import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface PostulacionesTrendProps {
  visitasPorSemana: Array<{
    semana: string
    visitas: number
    completados?: number
  }>
  currentGroupBy?: "day" | "week" | "month"
  className?: string
}

function CompactTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-semibold text-foreground mb-0.5">{label}</div>
      <div className="space-y-0.5">
        {payload.map((entry: any) => (
          <div
            key={entry.dataKey}
            className="flex items-center justify-between gap-3 tabular-nums"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PostulacionesTrend({
  visitasPorSemana,
  currentGroupBy = "week",
  className,
}: PostulacionesTrendProps) {
  const data = useMemo(
    () =>
      (visitasPorSemana || []).map((item) => ({
        periodo: item.semana,
        iniciadas: item.visitas,
        completadas: item.completados || 0,
      })),
    [visitasPorSemana]
  )

  const totalIniciadas = data.reduce((acc, x) => acc + x.iniciadas, 0)
  const totalCompletadas = data.reduce((acc, x) => acc + x.completadas, 0)
  const tasa =
    totalIniciadas > 0
      ? ((totalCompletadas / totalIniciadas) * 100).toFixed(1)
      : "0.0"

  const periodoLabel =
    currentGroupBy === "day"
      ? "día"
      : currentGroupBy === "month"
        ? "mes"
        : "semana"

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Postulaciones por {periodoLabel}
            </h3>
            <div className="flex items-center gap-2 ml-1">
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Iniciadas
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Completadas
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 tabular-nums">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Iniciadas
            </div>
            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {totalIniciadas.toLocaleString("es-PY")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Completadas
            </div>
            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {totalCompletadas.toLocaleString("es-PY")}
            </div>
          </div>
          <div className="text-right border-l pl-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Tasa
            </div>
            <div className="text-sm font-semibold">{tasa}%</div>
          </div>
        </div>
      </div>

      <div className="px-2 pb-3 pt-1">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={data}
            margin={{ top: 6, right: 12, left: -10, bottom: 4 }}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
            <XAxis
              dataKey="periodo"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={32}
              allowDecimals={false}
            />
            <Tooltip
              content={<CompactTooltip />}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
            />
            <Bar
              dataKey="iniciadas"
              name="Iniciadas"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="completadas"
              name="Completadas"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
