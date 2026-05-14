"use client"

import { motion } from "motion/react"
import { Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface DemografiaHorizontalProps {
  edadesPorRango: Array<{
    rango: string
    cantidad: number
    porcentaje: number
    fill: string
  }>
  className?: string
}

export function DemografiaHorizontal({
  edadesPorRango,
  className,
}: DemografiaHorizontalProps) {
  const total = edadesPorRango.reduce((acc, r) => acc + r.cantidad, 0)
  const hasData = total > 0

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Distribución por edades
          </h3>
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {total.toLocaleString("es-PY")} postulantes
        </span>
      </div>

      {hasData ? (
        <>
          {/* Stacked horizontal bar */}
          <div className="flex h-10 w-full overflow-hidden rounded-md border">
            {edadesPorRango.map((rango, i) => {
              if (rango.porcentaje === 0) return null
              return (
                <motion.div
                  key={rango.rango}
                  initial={{ width: 0 }}
                  animate={{ width: `${rango.porcentaje}%` }}
                  transition={{ delay: i * 0.05, duration: 0.5, ease: "easeOut" }}
                  className="flex items-center justify-center text-[10px] font-semibold text-white tabular-nums relative group"
                  style={{ backgroundColor: rango.fill }}
                  title={`${rango.rango}: ${rango.cantidad} (${rango.porcentaje.toFixed(1)}%)`}
                >
                  {rango.porcentaje >= 6 ? `${rango.porcentaje.toFixed(0)}%` : null}
                </motion.div>
              )
            })}
          </div>

          {/* Leyenda inline con count + % */}
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-5">
            {edadesPorRango.map((rango) => (
              <div
                key={rango.rango}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: rango.fill }}
                  />
                  <span className="text-xs font-medium truncate">
                    {rango.rango} años
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                  {rango.cantidad}{" "}
                  <span className="text-muted-foreground/60">
                    ({rango.porcentaje.toFixed(1)}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex h-12 items-center justify-center text-xs text-muted-foreground">
          Sin datos demográficos en el rango
        </div>
      )}
    </div>
  )
}
