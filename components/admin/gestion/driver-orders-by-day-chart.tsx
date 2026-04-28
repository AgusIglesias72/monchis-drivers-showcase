"use client"

import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
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

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { OrdersByDayPoint } from "@/lib/types/driver-stats.types"

interface Props {
  data: OrdersByDayPoint[]
}

const COLOR_ACCEPTED = "#10b981" // emerald
const COLOR_NOT_TAKEN = "#f59e0b" // amber

function formatDayShort(d: string): string {
  try {
    return format(parseISO(d), "dd/MM", { locale: es })
  } catch {
    return d
  }
}

function formatDayLong(d: string): string {
  try {
    return format(parseISO(d), "EEEE d 'de' MMMM", { locale: es })
  } catch {
    return d
  }
}

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const accepted = payload.find((p) => p.name === "Aceptados")?.value ?? 0
  const notTaken = payload.find((p) => p.name === "No tomados")?.value ?? 0
  const total = accepted + notTaken

  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md">
      <div className="font-medium capitalize mb-1">
        {label ? formatDayLong(label) : ""}
      </div>
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: COLOR_ACCEPTED }}
            />
            Aceptados
          </span>
          <span className="tabular-nums font-medium">{accepted}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: COLOR_NOT_TAKEN }}
            />
            No tomados
          </span>
          <span className="tabular-nums font-medium">{notTaken}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t pt-0.5 mt-0.5">
          <span className="text-muted-foreground">Total</span>
          <span className="tabular-nums font-semibold">{total}</span>
        </div>
      </div>
    </div>
  )
}

export function DriverOrdersByDayChart({ data }: Props) {
  const totalAccepted = data.reduce((a, d) => a + d.accepted, 0)
  const totalNotTaken = data.reduce((a, d) => a + d.notTaken, 0)
  const total = totalAccepted + totalNotTaken

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pedidos por día</CardTitle>
        <CardDescription>
          {total > 0 ? (
            <>
              Total: <strong className="text-foreground">{total}</strong> ·{" "}
              <span className="text-emerald-700">{totalAccepted} aceptados</span> ·{" "}
              <span className="text-amber-700">{totalNotTaken} no tomados</span>
            </>
          ) : (
            "Sin pedidos en el periodo."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                tickFormatter={formatDayShort}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                iconType="square"
              />
              <Bar
                dataKey="accepted"
                stackId="a"
                name="Aceptados"
                fill={COLOR_ACCEPTED}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="notTaken"
                stackId="a"
                name="No tomados"
                fill={COLOR_NOT_TAKEN}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
