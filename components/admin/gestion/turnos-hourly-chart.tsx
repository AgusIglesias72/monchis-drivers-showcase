"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { HourlyAggregate } from "@/lib/types/turnos.types"

interface Props {
  data: HourlyAggregate[]
}

export function TurnosHourlyChart({ data }: Props) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div>
        <h2 className="text-base font-semibold">Ocupación por hora</h2>
        <p className="text-xs text-muted-foreground">
          Drivers asignados vs. máximo, agregado entre todas las zonas.
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="max"
              name="Máximo"
              fill="hsl(212, 30%, 85%)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="assigned"
              name="Asignados"
              fill="hsl(140, 50%, 55%)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
