"use client"

import { useMemo, useState } from "react"
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { LineChart as LineIcon, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

interface StageRow {
  dia: string
  total?: number
  "1. Contacto Básico"?: number
  "2. Datos Personales"?: number
  "3. Trabajo y Vehículo"?: number
  "4. Documentos"?: number
  "5. Info Adicional"?: number
  "6. Pago de Equipamiento"?: number
  Completadas?: number
}

interface StagesTrendChartProps {
  evolucionPorEtapa: StageRow[]
  className?: string
}

// Series con color tailwind explícito
const DEFAULT_SERIES = [
  { key: "Iniciadas", dataKey: "total", color: "#3b82f6", label: "Iniciadas" },
  { key: "Documentos", dataKey: "4. Documentos", color: "#06b6d4", label: "Documentos" },
  { key: "Completadas", dataKey: "Completadas", color: "#10b981", label: "Completadas" },
]

const EXTRA_SERIES = [
  { key: "Contacto", dataKey: "1. Contacto Básico", color: "#6366f1", label: "Contacto" },
  { key: "DatosPers", dataKey: "2. Datos Personales", color: "#8b5cf6", label: "Datos Personales" },
  { key: "Trabajo", dataKey: "3. Trabajo y Vehículo", color: "#a855f7", label: "Trabajo y Vehículo" },
  { key: "InfoAd", dataKey: "5. Info Adicional", color: "#ec4899", label: "Info Adicional" },
  { key: "Pago", dataKey: "6. Pago de Equipamiento", color: "#f59e0b", label: "Pago Equipamiento" },
]

function StageTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-semibold text-foreground mb-1">{label}</div>
      <div className="space-y-0.5">
        {payload.map((entry: any) => (
          <div
            key={entry.dataKey}
            className="flex items-center justify-between gap-3 tabular-nums"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name || entry.dataKey}
            </span>
            <span className="font-semibold text-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StagesTrendChart({
  evolucionPorEtapa,
  className,
}: StagesTrendChartProps) {
  const [showAll, setShowAll] = useState(false)

  // El service expone solo step1..step6 + completadas. Sumamos "Iniciadas" = total.
  const data = useMemo(() => {
    return (evolucionPorEtapa || []).map((row) => ({
      ...row,
      Iniciadas: row.total ?? 0,
    }))
  }, [evolucionPorEtapa])

  const series = showAll
    ? [...DEFAULT_SERIES, ...EXTRA_SERIES]
    : DEFAULT_SERIES

  // Tick rotation si hay muchos puntos
  const needsRotation = data.length > 14
  const rangoLabel =
    data.length > 0 ? `${data[0]?.dia} → ${data[data.length - 1]?.dia}` : ""

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <LineIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Evolución por etapa
            </h3>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {rangoLabel || "Completaciones por día"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {series.map((s) => (
              <span
                key={s.key}
                className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors",
              showAll
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            <Layers className="h-3 w-3" />
            {showAll ? "Vista simple" : "Ver todas las etapas"}
          </button>
        </div>
      </div>

      <div className="px-2 pb-3 pt-1">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: needsRotation ? 18 : 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
            <XAxis
              dataKey="dia"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              angle={needsRotation ? -35 : 0}
              textAnchor={needsRotation ? "end" : "middle"}
              height={needsRotation ? 50 : 24}
              interval={data.length > 30 ? Math.floor(data.length / 12) : 0}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={36}
              allowDecimals={false}
            />
            <Tooltip
              content={<StageTooltip />}
              cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.2, strokeWidth: 1 }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.dataKey}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
