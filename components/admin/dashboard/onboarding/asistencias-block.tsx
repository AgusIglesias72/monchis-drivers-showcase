"use client"

import { useMemo } from "react"
import {
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
  ResponsiveContainer,
  Line,
  LineChart,
  Tooltip,
} from "recharts"
import { motion } from "motion/react"
import {
  CalendarCheck,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AsistenciasBlockProps {
  asistenciasPorPeriodo: Array<{
    periodo: string
    asistieron: number
    noAsistieron: number
    programados: number
    total: number
    tasaPresentismo: number
  }>
  distribucionEstadosAsistencias: Array<{
    status: string
    label: string
    cantidad: number
    porcentaje: number
    fill: string
  }>
  asistenciasProgramadasVsRealizadas: {
    totalProgramadas: number
    asistieron: number
    noAsistieron: number
    canceladas: number
    pendientes: number
    tasaPresentismo: number
    resueltas: number
    porResolver: number
  }
  className?: string
}

function MiniLineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover px-2 py-1 text-[10px] shadow-md tabular-nums">
      <div className="font-semibold">{label}</div>
      <div className="text-muted-foreground">
        {payload[0].value}% presentismo
      </div>
    </div>
  )
}

export function AsistenciasBlock({
  asistenciasPorPeriodo,
  distribucionEstadosAsistencias,
  asistenciasProgramadasVsRealizadas,
  className,
}: AsistenciasBlockProps) {
  const a = asistenciasProgramadasVsRealizadas
  const tasa = a.tasaPresentismo || 0

  const gaugeData = [
    { name: "Presentismo", value: tasa, fill: "#10b981" },
  ]

  // Distribución estados como stacked bar horizontal (porcentaje)
  const distTotal = distribucionEstadosAsistencias.reduce(
    (acc, d) => acc + d.cantidad,
    0
  )

  // Mini trend (presentismo por periodo)
  const trendData = useMemo(
    () =>
      (asistenciasPorPeriodo || []).map((row) => ({
        periodo: row.periodo,
        tasa: row.tasaPresentismo,
      })),
    [asistenciasPorPeriodo]
  )

  const miniStats = [
    {
      label: "Asistieron",
      value: a.asistieron,
      Icon: UserCheck,
      color: "text-success",
      bg: "bg-success-soft",
    },
    {
      label: "No-shows",
      value: a.noAsistieron,
      Icon: UserX,
      color: "text-destructive",
      bg: "bg-danger-soft",
    },
    {
      label: "Pendientes",
      value: a.pendientes,
      Icon: Clock,
      color: "text-warning",
      bg: "bg-warning-soft",
    },
    {
      label: "Resueltas",
      value: a.resueltas,
      Icon: CheckCircle2,
      color: "text-info",
      bg: "bg-info-soft",
    },
  ]

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Asistencias
        </h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          · {a.totalProgramadas.toLocaleString("es-PY")} programadas
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Gauge presentismo */}
        <div className="lg:col-span-4 rounded-lg border bg-card p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Tasa de presentismo
          </div>
          <div className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="72%"
                outerRadius="100%"
                data={gaugeData}
                startAngle={90}
                endAngle={90 - (tasa / 100) * 360}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  background={{ fill: "hsl(var(--muted))" }}
                  dataKey="value"
                  cornerRadius={6}
                  fill="#10b981"
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold tabular-nums text-success leading-none">
                {tasa}%
              </span>
              <span className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                {a.asistieron}/{a.resueltas}
              </span>
            </div>
          </div>
        </div>

        {/* Stats mini-grid + estados horizontal stacked */}
        <div className="lg:col-span-5 rounded-lg border bg-card p-4 space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Distribución de estados
            </div>
            {distTotal > 0 ? (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-md border">
                  {distribucionEstadosAsistencias.map((d, i) => {
                    const pct = (d.cantidad / distTotal) * 100
                    if (pct === 0) return null
                    return (
                      <motion.div
                        key={d.status}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: i * 0.04, duration: 0.4 }}
                        style={{ backgroundColor: d.fill }}
                        title={`${d.label}: ${d.cantidad} (${d.porcentaje}%)`}
                      />
                    )
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {distribucionEstadosAsistencias.map((d) => (
                    <span
                      key={d.status}
                      className="inline-flex items-center gap-1 text-[10px] tabular-nums text-muted-foreground"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: d.fill }}
                      />
                      <span className="text-foreground font-medium">
                        {d.label}
                      </span>
                      <span>
                        {d.cantidad} ({d.porcentaje}%)
                      </span>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">Sin datos</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {miniStats.map((s) => {
              const Icon = s.Icon
              return (
                <div
                  key={s.label}
                  className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5"
                >
                  <div className={cn("rounded p-1", s.bg)}>
                    <Icon className={cn("h-3 w-3", s.color)} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
                      {s.label}
                    </div>
                    <div
                      className={cn(
                        "text-sm font-semibold tabular-nums leading-none mt-1",
                        s.color
                      )}
                    >
                      {s.value.toLocaleString("es-PY")}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Mini trend de presentismo */}
        <div className="lg:col-span-3 rounded-lg border bg-card p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Tendencia presentismo
          </div>
          <div className="text-2xl font-semibold tabular-nums text-success leading-none">
            {tasa}%
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">
            {trendData.length} períodos
          </div>
          <div className="mt-2 -mx-1">
            {trendData.length > 1 ? (
              <ResponsiveContainer width="100%" height={70}>
                <LineChart
                  data={trendData}
                  margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                >
                  <Tooltip
                    content={<MiniLineTooltip />}
                    cursor={{
                      stroke: "hsl(var(--muted-foreground))",
                      strokeOpacity: 0.2,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="tasa"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[70px] items-center justify-center text-[10px] text-muted-foreground">
                Sin tendencia
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
