"use client"

import { motion } from "motion/react"
import { TrendingDown, ArrowDown, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface FunnelVerticalProps {
  funnelData: Array<{ step: string; count: number }>
  postulacionesStats: {
    totalPostulaciones: number
    completadas: number
  }
  onboardingStats: {
    inProgressDrivers: number
    completedThisMonth: number
  }
  className?: string
}

// Cada fila del funnel: color tailwind explícito (gradiente azul → cian → verde)
const STEPS_META: Array<{
  label: string
  barBg: string
  barBorder: string
  labelColor: string
}> = [
  { label: "Iniciado", barBg: "bg-blue-500/20", barBorder: "border-blue-500/40", labelColor: "text-blue-700 dark:text-blue-300" },
  { label: "Contacto", barBg: "bg-blue-500/25", barBorder: "border-blue-500/50", labelColor: "text-blue-700 dark:text-blue-300" },
  { label: "Datos Personales", barBg: "bg-sky-500/25", barBorder: "border-sky-500/50", labelColor: "text-sky-700 dark:text-sky-300" },
  { label: "Trabajo y Vehículo", barBg: "bg-cyan-500/25", barBorder: "border-cyan-500/50", labelColor: "text-cyan-700 dark:text-cyan-300" },
  { label: "Documentos", barBg: "bg-cyan-500/30", barBorder: "border-cyan-500/60", labelColor: "text-cyan-700 dark:text-cyan-300" },
  { label: "Info Adicional", barBg: "bg-teal-500/25", barBorder: "border-teal-500/50", labelColor: "text-teal-700 dark:text-teal-300" },
  { label: "Pago Equipamiento", barBg: "bg-teal-500/30", barBorder: "border-teal-500/60", labelColor: "text-teal-700 dark:text-teal-300" },
  { label: "Completado", barBg: "bg-emerald-500/30", barBorder: "border-emerald-500/60", labelColor: "text-emerald-700 dark:text-emerald-300" },
  { label: "Agendado", barBg: "bg-emerald-500/35", barBorder: "border-emerald-500/70", labelColor: "text-emerald-700 dark:text-emerald-300" },
  { label: "Asistido", barBg: "bg-green-500/40", barBorder: "border-green-500/70", labelColor: "text-green-700 dark:text-green-300" },
]

export function FunnelVertical({
  funnelData,
  postulacionesStats,
  onboardingStats,
  className,
}: FunnelVerticalProps) {
  const totalIniciadas = postulacionesStats.totalPostulaciones

  const rows = [
    { ...STEPS_META[0], value: totalIniciadas },
    { ...STEPS_META[1], value: funnelData[0]?.count || 0 },
    { ...STEPS_META[2], value: funnelData[1]?.count || 0 },
    { ...STEPS_META[3], value: funnelData[2]?.count || 0 },
    { ...STEPS_META[4], value: funnelData[3]?.count || 0 },
    { ...STEPS_META[5], value: funnelData[4]?.count || 0 },
    { ...STEPS_META[6], value: funnelData[5]?.count || 0 },
    { ...STEPS_META[7], value: postulacionesStats.completadas },
    { ...STEPS_META[8], value: onboardingStats.inProgressDrivers },
    { ...STEPS_META[9], value: onboardingStats.completedThisMonth },
  ]

  const max = Math.max(...rows.map((r) => r.value), 1)
  const tasaConversionTotal =
    totalIniciadas > 0
      ? ((onboardingStats.completedThisMonth / totalIniciadas) * 100).toFixed(1)
      : "0.0"

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-info" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Funnel de conversión
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            De postulación a asistencia confirmada
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold tabular-nums text-info leading-none">
            {tasaConversionTotal}%
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            Conversión total
          </div>
        </div>
      </div>

      <div className="space-y-1.5 px-4 pb-4">
        {rows.map((row, i) => {
          const width = (row.value / max) * 100
          const prev = i > 0 ? rows[i - 1].value : null
          const deltaPrev =
            prev && prev > 0 ? ((row.value / prev) * 100).toFixed(0) : null
          const deltaTotal =
            totalIniciadas > 0
              ? ((row.value / totalIniciadas) * 100).toFixed(0)
              : "0"
          const dropped = prev !== null && prev > row.value

          return (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
              className="grid grid-cols-[110px_1fr_92px] items-center gap-2 text-xs"
            >
              <div className="truncate text-right text-muted-foreground font-medium">
                {row.label}
              </div>

              <div className="relative h-7">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ delay: i * 0.03 + 0.1, duration: 0.5, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-r-md border-l-2 flex items-center justify-end pr-2",
                    row.barBg,
                    row.barBorder
                  )}
                >
                  <span
                    className={cn(
                      "font-semibold tabular-nums text-[11px]",
                      row.labelColor
                    )}
                  >
                    {row.value.toLocaleString("es-PY")}
                  </span>
                </motion.div>
              </div>

              <div className="flex items-center justify-end gap-1 tabular-nums">
                {deltaPrev !== null ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-[10px] font-medium",
                      dropped
                        ? "text-destructive"
                        : "text-success"
                    )}
                  >
                    {dropped ? (
                      <TrendingDown className="h-2.5 w-2.5" />
                    ) : (
                      <ArrowDown className="h-2.5 w-2.5 rotate-180" />
                    )}
                    {deltaPrev}%
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
                <span className="text-[9px] text-muted-foreground/70 w-9 text-right">
                  ({deltaTotal}%)
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
