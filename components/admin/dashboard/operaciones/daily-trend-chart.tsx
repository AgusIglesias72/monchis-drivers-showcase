"use client"

import { motion } from "framer-motion"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts"
import type { OpsDailyTrend } from "@/lib/services/dashboard-ops.service"

interface DailyTrendChartProps {
  data: OpsDailyTrend[]
}

function shortDate(ymd: string): string {
  // "2026-05-12" → "12/05"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) return ymd
  return `${m[3]}/${m[2]}`
}

interface TooltipPayload {
  dataKey: string
  value: number | null
  payload: { date: string; total: number; cancelled: number; avgE2EMinutes: number | null }
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayload[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0].payload
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{data.date}</div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Pedidos</span>
        <span className="tabular-nums font-medium">{data.total}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Cancelados</span>
        <span className="tabular-nums font-medium text-rose-500">
          {data.cancelled}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Tiempo E2E</span>
        <span className="tabular-nums font-medium text-amber-600">
          {data.avgE2EMinutes !== null ? `${data.avgE2EMinutes} min` : "—"}
        </span>
      </div>
    </div>
  )
}

export function OperacionesDailyTrendChart({ data }: DailyTrendChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: shortDate(d.date),
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Tendencia diaria
              </CardTitle>
              <CardDescription>
                Últimos 30 días — total de pedidos y tiempo de entrega promedio
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: "Pedidos",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "currentColor", opacity: 0.6 },
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: "min",
                  angle: -90,
                  position: "insideRight",
                  style: { fontSize: 11, fill: "currentColor", opacity: 0.6 },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                iconType="circle"
                iconSize={8}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="total"
                name="Pedidos"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cancelled"
                name="Cancelados"
                stroke="#f43f5e"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgE2EMinutes"
                name="Tiempo E2E (min)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  )
}
