"use client"

import { motion } from "framer-motion"
import { TrendingDown, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AbandonosRankedProps {
  abandonoPorStep: Array<{ label: string; abandonos: number }>
  className?: string
}

export function AbandonosRanked({
  abandonoPorStep,
  className,
}: AbandonosRankedProps) {
  // Top 5 por abandonos descendente
  const top = [...abandonoPorStep]
    .sort((a, b) => b.abandonos - a.abandonos)
    .slice(0, 5)

  const totalAbandonos = top.reduce((acc, x) => acc + x.abandonos, 0)
  const max = Math.max(...top.map((t) => t.abandonos), 1)

  return (
    <div className={cn("rounded-lg border bg-card flex flex-col", className)}>
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Abandonos por paso
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Puntos críticos del formulario
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold tabular-nums text-rose-600 dark:text-rose-400 leading-none">
            {totalAbandonos.toLocaleString("es-PY")}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            Total top 5
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pb-4">
        {top.length === 0 ? (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 opacity-40 mb-2" />
            <p className="text-xs">Sin abandonos registrados</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {top.map((row, i) => {
              const width = (row.abandonos / max) * 100
              const isWorst = i === 0
              return (
                <motion.li
                  key={row.label}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className={cn(
                    "flex items-center gap-2 rounded-md p-2",
                    isWorst &&
                      "bg-rose-500/8 ring-1 ring-rose-500/20"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold tabular-nums",
                      isWorst
                        ? "bg-rose-500 text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-medium truncate">
                        {row.label}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums shrink-0",
                          isWorst
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-foreground"
                        )}
                      >
                        {row.abandonos}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{
                          delay: i * 0.04 + 0.1,
                          duration: 0.45,
                          ease: "easeOut",
                        }}
                        className={cn(
                          "h-full rounded-full",
                          isWorst
                            ? "bg-rose-500"
                            : "bg-rose-400/60"
                        )}
                      />
                    </div>
                  </div>
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
