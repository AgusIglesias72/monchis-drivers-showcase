"use client"

import { Activity, AlertCircle, Percent, Users } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { KpiSummary } from "@/lib/types/turnos.types"

interface Props {
  kpis: KpiSummary
}

export function TurnosKpis({ kpis }: Props) {
  const occupancyText =
    kpis.totalMax > 0 ? `${Math.round(kpis.occupancyPct * 100)}%` : "—"

  const cards = [
    {
      title: "Drivers asignados",
      value: `${kpis.totalAssigned} / ${kpis.totalMax}`,
      description: "Total del día (todas las zonas)",
      icon: Users,
    },
    {
      title: "Ocupación promedio",
      value: occupancyText,
      description: "Asignados / máximo",
      icon: Percent,
    },
    {
      title: "Turnos activos",
      value: String(kpis.activeShifts),
      description: "Filas devueltas por la API",
      icon: Activity,
    },
    {
      title: "Zonas con baja ocupación",
      value: String(kpis.zonesWithLowOccupancy),
      description: "< 60% asignados",
      icon: AlertCircle,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
              <CardDescription className="mt-1">{c.description}</CardDescription>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
