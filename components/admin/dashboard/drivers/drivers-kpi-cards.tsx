"use client"

import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import {
  Users,
  UserPlus,
  TrendingUp,
  FileClock,
  CheckCircle2,
  Gift,
} from "lucide-react"
import type { DriversKpis, BonusSummary } from "@/lib/services/dashboard-drivers.service"

const formatInt = (n: number) =>
  new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(n)

const formatGs = (n: number) =>
  new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(n) + " Gs"

const cards = (kpis: DriversKpis, bonus: BonusSummary) => [
  {
    label: "Drivers activos",
    value: formatInt(kpis.totalActive),
    icon: Users,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    sub: `${formatInt(kpis.newLast30Days)} nuevos en 30 días`,
  },
  {
    label: "Nuevos 7 días",
    value: formatInt(kpis.newLast7Days),
    icon: UserPlus,
    accent: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    sub: "Postulaciones recientes",
  },
  {
    label: "Nuevos 30 días",
    value: formatInt(kpis.newLast30Days),
    icon: TrendingUp,
    accent: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    sub: "Tendencia mensual",
  },
  {
    label: "Docs pendientes",
    value: formatInt(kpis.docsPending),
    icon: FileClock,
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    sub: `${formatInt(kpis.docsRejected)} rechazados`,
  },
  {
    label: "Tasa aprobación",
    value: `${kpis.approvalRate}%`,
    icon: CheckCircle2,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    sub: `${kpis.avgDocsPerDriver} docs / driver`,
  },
  {
    label: "Bonos pagados",
    value: formatGs(bonus.totalPaid),
    icon: Gift,
    accent: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    sub: `${formatInt(bonus.totalAssigned)} asignaciones · 30 días`,
  },
]

export function DriversKpiCards({
  kpis,
  bonus,
}: {
  kpis: DriversKpis
  bonus: BonusSummary
}) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards(kpis, bonus).map((c, i) => {
        const Icon = c.icon
        return (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          >
            <Card className="h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground truncate">
                      {c.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight">
                      {c.value}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground truncate">
                      {c.sub}
                    </p>
                  </div>
                  <div className={`shrink-0 rounded-lg p-2 ${c.bg}`}>
                    <Icon className={`h-4 w-4 ${c.accent}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
