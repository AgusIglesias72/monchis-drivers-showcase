"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Handshake,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type {
  OrderSignalAlert,
  OrderSignalType,
} from "@/lib/services/dashboard-alerts.service"
import { cn } from "@/lib/utils"

import { SeverityBadge } from "./severity-badge"

const SIGNAL_LABELS: Record<OrderSignalType, string> = {
  admin_change: "Cambio del admin",
  slow_acceptance: "Aceptación lenta",
  many_offers: "Muchas ofertas",
  long_e2e: "Duración alta",
}

const SIGNAL_ICONS: Record<OrderSignalType, LucideIcon> = {
  admin_change: ShieldCheck,
  slow_acceptance: Clock,
  many_offers: Handshake,
  long_e2e: Timer,
}

const FILTER_TABS: { key: OrderSignalType | "all"; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "slow_acceptance", label: "Aceptación lenta" },
  { key: "many_offers", label: "Muchas ofertas" },
  { key: "long_e2e", label: "Duración alta" },
  { key: "admin_change", label: "Cambio admin" },
]

export function SignalList({ alerts }: { alerts: OrderSignalAlert[] }) {
  const [active, setActive] = useState<OrderSignalType | "all">("all")

  const filtered = useMemo(() => {
    if (active === "all") return alerts
    return alerts.filter((a) => a.signal === active)
  }, [alerts, active])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Pedidos con señales
        </CardTitle>
        <CardDescription>
          Anomalías detectadas en pedidos de los últimos 7 días
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => {
            const isActive = tab.key === active
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-colors",
                  isActive
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y rounded-md border">
            {filtered.map((alert) => {
              const Icon = SIGNAL_ICONS[alert.signal]
              return (
                <li
                  key={`${alert.signal}-${alert.requestId}`}
                  className="flex items-start gap-3 p-3 hover:bg-muted/40 transition-colors"
                >
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={alert.severity} />
                      <span className="text-sm font-medium">
                        {SIGNAL_LABELS[alert.signal]}
                      </span>
                      {alert.zone && (
                        <span className="text-xs text-muted-foreground">
                          · {alert.zone}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alert.detail}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(
                        new Date(alert.detectedAt),
                        "d MMM HH:mm",
                        { locale: es },
                      )}
                      <span className="mx-1.5">·</span>
                      <span className="font-mono">
                        {alert.requestId.slice(-8)}
                      </span>
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                  >
                    <Link href={`/admin/gestion/pedidos/${alert.requestId}`}>
                      Ver detalle
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/60 p-8 text-center">
      <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600 dark:text-emerald-400" />
      <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
        Sin señales en este rango
      </p>
      <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
        Todos los pedidos lucen normales en los últimos 7 días
      </p>
    </div>
  )
}

