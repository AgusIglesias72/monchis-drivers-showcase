"use client"

import { motion } from "framer-motion"
import {
  Users,
  CheckCircle2,
  Clock,
  CalendarCheck,
  UserX,
  FileWarning,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface KpiStripProps {
  postulacionesStats: {
    totalPostulaciones: number
    completadas: number
    enProgreso?: number
  }
  onboardingStats: {
    inProgressDrivers: number
    completedThisMonth: number
    noShows?: number
  }
  mainStats: {
    manualReviewDocs: number
    rejectedDocs: number
    pendingDocs: number
  }
  asistenciasProgramadasVsRealizadas: {
    asistieron: number
    noAsistieron: number
    totalProgramadas: number
    tasaPresentismo: number
  }
}

interface KpiItem {
  label: string
  value: string | number
  hint?: string
  Icon: LucideIcon
  accent: string
  iconBg: string
  alert?: boolean
}

const formatNumber = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString("es-PY") : "0"

export function KpiStrip({
  postulacionesStats,
  onboardingStats,
  mainStats,
  asistenciasProgramadasVsRealizadas,
}: KpiStripProps) {
  const total = postulacionesStats.totalPostulaciones || 0
  const completadas = postulacionesStats.completadas || 0
  const tasaCompletadas =
    total > 0 ? ((completadas / total) * 100).toFixed(1) : "0.0"

  const items: KpiItem[] = [
    {
      label: "Postulaciones",
      value: formatNumber(total),
      hint: "en el rango",
      Icon: Users,
      accent: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-500/10",
    },
    {
      label: "Completadas",
      value: formatNumber(completadas),
      hint: `${tasaCompletadas}% conversion`,
      Icon: CheckCircle2,
      accent: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10",
    },
    {
      label: "En curso",
      value: formatNumber(onboardingStats.inProgressDrivers || 0),
      hint: "agendados",
      Icon: Clock,
      accent: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-500/10",
    },
    {
      label: "Asistencias",
      value: formatNumber(asistenciasProgramadasVsRealizadas.asistieron || 0),
      hint: `${asistenciasProgramadasVsRealizadas.tasaPresentismo || 0}% presentismo`,
      Icon: CalendarCheck,
      accent: "text-cyan-600 dark:text-cyan-400",
      iconBg: "bg-cyan-500/10",
    },
    {
      label: "No-shows",
      value: formatNumber(asistenciasProgramadasVsRealizadas.noAsistieron || 0),
      hint: "del período",
      Icon: UserX,
      accent: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-500/10",
    },
    {
      label: "Docs pendientes",
      value: formatNumber(mainStats.pendingDocs || 0),
      hint: mainStats.pendingDocs > 0 ? "requiere acción" : "al día",
      Icon: FileWarning,
      accent:
        mainStats.pendingDocs > 0
          ? "text-amber-600 dark:text-amber-400"
          : "text-muted-foreground",
      iconBg:
        mainStats.pendingDocs > 0
          ? "bg-amber-500/10"
          : "bg-muted",
      alert: mainStats.pendingDocs > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item, i) => {
        const Icon = item.Icon
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            className={cn(
              "relative rounded-lg border bg-card p-3 transition-colors",
              item.alert && "ring-1 ring-amber-500/30 border-amber-500/40"
            )}
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
                {item.label}
              </span>
              <div className={cn("rounded-md p-1", item.iconBg)}>
                <Icon className={cn("h-3 w-3", item.accent)} aria-hidden />
              </div>
            </div>
            <div
              className={cn(
                "mt-2 text-2xl font-semibold tabular-nums leading-none",
                item.accent
              )}
            >
              {item.value}
            </div>
            {item.hint && (
              <div className="mt-1.5 text-[10px] text-muted-foreground tabular-nums">
                {item.hint}
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
