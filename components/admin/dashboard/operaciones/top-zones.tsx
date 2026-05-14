"use client"

import { motion } from "motion/react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MapPin } from "lucide-react"
import type { OpsTopZone } from "@/lib/services/dashboard-ops.service"

interface TopZonesProps {
  data: OpsTopZone[]
}

export function OperacionesTopZones({ data }: TopZonesProps) {
  const max = data.reduce((m, z) => Math.max(m, z.count), 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            Top sucursales (7d)
          </CardTitle>
          <CardDescription>
            Sucursales con más pedidos en los últimos 7 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Sin datos en el rango.
            </div>
          ) : (
            <ul className="space-y-3">
              {data.map((z, i) => {
                const pct = max > 0 ? (z.count / max) * 100 : 0
                const cancelRate =
                  z.count > 0 ? (z.cancelled / z.count) * 100 : 0
                return (
                  <li key={`${z.zone}-${i}`} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className="truncate text-sm font-medium"
                        title={z.zone}
                      >
                        {z.zone}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums">
                        <span className="font-semibold">{z.count}</span>
                        <span className="text-muted-foreground">
                          {" · "}
                          {z.cancelled} canc. ({cancelRate.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.25 + i * 0.04, duration: 0.5 }}
                        className="h-full rounded-full bg-slate-500 dark:bg-slate-300"
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
