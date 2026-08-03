"use client"

import { SEQUENTIAL } from "./palette"
import { cn } from "@/lib/utils"

export interface FunnelStage {
  label: string
  value: number
}

export interface FunnelChartDSProps {
  stages: FunnelStage[]
  /**
   * Base del porcentaje.
   * - "first": % respecto de la primera etapa (retención acumulada).
   * - "previous": % respecto de la etapa anterior (conversión paso a paso).
   */
  percentOf?: "first" | "previous"
  /** Formatea el valor absoluto mostrado. */
  valueFormatter?: (value: number) => string
  className?: string
}

const pctFmt = (n: number): string =>
  `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}%`

/**
 * Embudo STUDIO. Barras horizontales con ancho proporcional al valor,
 * teñidas con la rampa mono-hue de marca (claro → oscuro) — NO arcoíris.
 * Valor absoluto y % en mono. Reemplaza al funnel multicolor anterior.
 */
export function FunnelChartDS({
  stages,
  percentOf = "first",
  valueFormatter,
  className,
}: FunnelChartDSProps) {
  const max = stages.reduce((m, s) => Math.max(m, s.value), 0)
  const first = stages[0]?.value ?? 0

  return (
    <div className={cn("flex h-full w-full flex-col justify-center gap-2", className)}>
      {stages.map((stage, i) => {
        const widthPct = max > 0 ? (stage.value / max) * 100 : 0
        const base =
          percentOf === "previous" ? (stages[i - 1]?.value ?? stage.value) : first
        const pct = base > 0 ? (stage.value / base) * 100 : 0
        // Rampa claro → oscuro a lo largo de las etapas.
        const color =
          SEQUENTIAL[Math.min(i, SEQUENTIAL.length - 1)] ?? SEQUENTIAL[0]
        const valueText = valueFormatter
          ? valueFormatter(stage.value)
          : stage.value.toLocaleString("es-PY")

        return (
          <div key={`${stage.label}-${i}`} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate text-ink-subtle">{stage.label}</span>
              <span className="shrink-0 font-[family-name:var(--font-mono)] tabular-nums text-foreground">
                {valueText}
                {i > 0 && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                    {pctFmt(pct)}
                  </span>
                )}
              </span>
            </div>
            <div className="h-5 w-full overflow-hidden rounded-[var(--radius-md)] bg-muted">
              <div
                className="h-full rounded-[var(--radius-md)] transition-[width] duration-500 ease-out"
                style={{
                  width: `${Math.max(widthPct, stage.value > 0 ? 2 : 0)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
