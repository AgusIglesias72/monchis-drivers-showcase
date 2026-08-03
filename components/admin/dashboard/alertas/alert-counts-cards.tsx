import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  FileClock,
  UserX,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { AlertsCounts } from "@/lib/services/dashboard-alerts.service"
import { cn } from "@/lib/utils"

type CardSpec = {
  title: string
  value: number
  description: string
  icon: typeof Bell
  iconClassName: string
  containerClassName?: string
}

export function AlertCountsCards({ counts }: { counts: AlertsCounts }) {
  const cards: CardSpec[] = [
    {
      title: "Señales activas",
      value: counts.orderSignals.total,
      description: "Pedidos con anomalías (últimos 7 días)",
      icon: Bell,
      iconClassName: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "No-shows 7 días",
      value: counts.noShowsLast7Days,
      description: "Postulantes que no se presentaron",
      icon: UserX,
      iconClassName: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Docs trabados",
      value: counts.stuckDocs,
      description: "Pendientes hace más de 7 días",
      icon: FileClock,
      iconClassName: "text-orange-600 dark:text-orange-400",
    },
    {
      title: "Críticas",
      value: counts.totalCritical,
      description: "Casos con severidad crítica",
      icon: counts.totalCritical > 0 ? AlertOctagon : AlertTriangle,
      iconClassName:
        counts.totalCritical > 0
          ? "text-red-600 dark:text-red-400"
          : "text-muted-foreground",
      containerClassName:
        counts.totalCritical > 0
          ? "border-red-200 dark:border-red-900/60"
          : undefined,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className={cn(card.containerClassName)}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>
                <p className="text-3xl font-semibold mt-1 tabular-nums">
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </div>
              <card.icon className={cn("h-5 w-5 shrink-0", card.iconClassName)} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
