"use client"

import { AlertTriangle, BikeIcon, Clock, ShoppingBag, Timer } from "lucide-react"

import type { LiveSummary } from "@/lib/types/live-panel.types"

interface Props {
  summary: LiveSummary
}

export function LiveKpis({ summary }: Props) {
  const items = [
    {
      label: "Drivers conectados",
      value: summary.driversTotal,
      sub: `${summary.driversAvailable} libres · ${summary.driversBusy} ocupados`,
      icon: BikeIcon,
      tone: "neutral" as const,
    },
    {
      label: "Pedidos en curso",
      value: summary.activeCount,
      sub: "Con driver asignado",
      icon: ShoppingBag,
      tone: "neutral" as const,
    },
    {
      label: "Sin driver",
      value: summary.pendingCount,
      sub: "Esperando aceptación",
      icon: Clock,
      tone: summary.pendingCount > 0 ? "warning" : ("neutral" as const),
    },
    {
      label: "Demorados",
      value: summary.delayedCount,
      sub: "Tiempos altos",
      icon: Timer,
      tone: summary.delayedCount > 0 ? "danger" : ("neutral" as const),
    },
    {
      label: "Zonas en alerta",
      value: summary.zonesAlertCount,
      sub: "KPI fuera de rango",
      icon: AlertTriangle,
      tone: summary.zonesAlertCount > 0 ? "warning" : ("neutral" as const),
    },
  ] as const

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon
        const toneClass =
          item.tone === "danger"
            ? "border-destructive/40 bg-destructive/5"
            : item.tone === "warning"
              ? "border-warning/40 bg-warning/5"
              : "bg-card"
        const valueClass =
          item.tone === "danger"
            ? "text-destructive"
            : item.tone === "warning"
              ? "text-warning"
              : ""
        const iconBg =
          item.tone === "danger"
            ? "bg-destructive/10 text-destructive"
            : item.tone === "warning"
              ? "bg-warning/10 text-warning"
              : "bg-muted text-muted-foreground"
        return (
          <div
            key={item.label}
            className={`flex items-center gap-3 rounded-xl border p-3 ${toneClass}`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={`text-2xl font-bold leading-none tabular-nums ${valueClass}`}
              >
                {item.value}
              </div>
              <div className="mt-1 truncate text-[13px] font-medium leading-tight">
                {item.label}
              </div>
              <div className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
                {item.sub}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
