"use client"

import { motion } from "motion/react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  TrendingUp,
  TrendingDown,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarRange,
} from "lucide-react"
import type { OpsKpis } from "@/lib/services/dashboard-ops.service"

interface KpiCardsProps {
  kpis: OpsKpis
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-PY")
}

function formatMinutes(m: number | null): string {
  if (m === null) return "—"
  if (m < 60) return `${m.toFixed(1)} min`
  const h = Math.floor(m / 60)
  const rest = Math.round(m - h * 60)
  return `${h}h ${rest}m`
}

function pctDelta(today: number, yesterday: number): {
  text: string
  positive: boolean
  neutral: boolean
} {
  if (yesterday === 0) {
    return { text: today > 0 ? "+∞" : "—", positive: today > 0, neutral: today === 0 }
  }
  const delta = ((today - yesterday) / yesterday) * 100
  const sign = delta >= 0 ? "+" : ""
  return {
    text: `${sign}${delta.toFixed(1)}%`,
    positive: delta >= 0,
    neutral: Math.abs(delta) < 0.5,
  }
}

export function OperacionesKpiCards({ kpis }: KpiCardsProps) {
  const delta = pctDelta(kpis.totalToday, kpis.totalYesterday)

  const cards = [
    {
      title: "Pedidos hoy",
      value: formatNumber(kpis.totalToday),
      description: (
        <span className="inline-flex items-center gap-1">
          {delta.neutral ? null : delta.positive ? (
            <TrendingUp className="h-3 w-3 text-emerald-600" />
          ) : (
            <TrendingDown className="h-3 w-3 text-rose-500" />
          )}
          <span
            className={
              delta.neutral
                ? "text-muted-foreground"
                : delta.positive
                  ? "text-emerald-600"
                  : "text-rose-500"
            }
          >
            {delta.text}
          </span>
          <span className="text-muted-foreground">vs ayer ({formatNumber(kpis.totalYesterday)})</span>
        </span>
      ),
      Icon: Package,
      accent: "text-slate-700 dark:text-slate-200",
    },
    {
      title: "Finalizados hoy",
      value: formatNumber(kpis.finalizedToday),
      description: (
        <span className="text-muted-foreground">
          {kpis.totalToday > 0
            ? `${((kpis.finalizedToday / kpis.totalToday) * 100).toFixed(1)}% del total`
            : "Sin pedidos aún"}
        </span>
      ),
      Icon: CheckCircle2,
      accent: "text-emerald-600",
    },
    {
      title: "Cancelados hoy",
      value: formatNumber(kpis.cancelledToday),
      description: (
        <span className="text-muted-foreground">
          {kpis.cancellationRate.toFixed(1)}% tasa cancelación
        </span>
      ),
      Icon: XCircle,
      accent: "text-rose-500",
    },
    {
      title: "Tiempo entrega (7d)",
      value: formatMinutes(kpis.avgE2EMinutes),
      description: (
        <span className="text-muted-foreground">
          Promedio end-to-end finalizados
        </span>
      ),
      Icon: Clock,
      accent: "text-amber-600",
    },
    {
      title: "Esta semana",
      value: formatNumber(kpis.totalThisWeek),
      description: (
        <span className="text-muted-foreground">
          Últimos 7 días
        </span>
      ),
      Icon: CalendarRange,
      accent: "text-slate-700 dark:text-slate-200",
    },
    {
      title: "Este mes (30d)",
      value: formatNumber(kpis.totalThisMonth),
      description: (
        <span className="text-muted-foreground">
          Aceptación prom.: {formatMinutes(kpis.avgMatchingMinutes)}
        </span>
      ),
      Icon: CalendarRange,
      accent: "text-slate-700 dark:text-slate-200",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((c, i) => (
        <motion.div
          key={c.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardDescription className="text-xs uppercase tracking-wide">
                  {c.title}
                </CardDescription>
                <c.Icon className={`h-4 w-4 ${c.accent}`} aria-hidden />
              </div>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {c.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs">{c.description}</div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
