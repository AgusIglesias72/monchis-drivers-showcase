"use client"

import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts"
import { FileCheck, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface DocsStatusCompactProps {
  mainStats: {
    manualReviewDocs: number
    rejectedDocs: number
    pendingDocs: number
  }
  className?: string
}

export function DocsStatusCompact({
  mainStats,
  className,
}: DocsStatusCompactProps) {
  const data = [
    {
      name: "Aprobados",
      value: mainStats.manualReviewDocs > 0 ? mainStats.manualReviewDocs : 0,
      fill: "#10b981",
      dot: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    {
      name: "Rechazados",
      value: mainStats.rejectedDocs,
      fill: "#f43f5e",
      dot: "bg-rose-500",
      text: "text-rose-600 dark:text-rose-400",
    },
    {
      name: "Pendientes",
      value: mainStats.pendingDocs,
      fill: "#f59e0b",
      dot: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
    },
  ]

  const total = data.reduce((sum, item) => sum + item.value, 0)
  const chartData = total === 0 ? [{ name: "Sin datos", value: 1, fill: "hsl(var(--muted))" }] : data

  return (
    <div className={cn("rounded-lg border bg-card flex flex-col", className)}>
      <div className="flex items-center gap-2 p-4 pb-2">
        <FileCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Estado de documentos
        </h3>
      </div>

      {mainStats.pendingDocs > 0 && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-md border-l-2 border-amber-500 bg-amber-500/8 px-2.5 py-1.5">
          <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 tabular-nums">
            {mainStats.pendingDocs} pendiente
            {mainStats.pendingDocs !== 1 ? "s" : ""} sin revisar
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 px-4 pb-4 flex-1">
        <div className="relative shrink-0">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={68}
                paddingAngle={total > 0 ? 2 : 0}
                dataKey="value"
                stroke="none"
                isAnimationActive={false}
              >
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums leading-none">
              {total}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">
              Total
            </span>
          </div>
        </div>

        <ul className="flex-1 space-y-1.5 min-w-0">
          {data.map((item) => {
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0"
            return (
              <li
                key={item.name}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={cn("h-2 w-2 rounded-full shrink-0", item.dot)}
                  />
                  <span className="text-xs font-medium truncate">
                    {item.name}
                  </span>
                </span>
                <span className="flex items-baseline gap-1.5 tabular-nums shrink-0">
                  <span
                    className={cn("text-sm font-semibold", item.text)}
                  >
                    {item.value}
                  </span>
                  <span className="text-[10px] text-muted-foreground w-10 text-right">
                    {pct}%
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
