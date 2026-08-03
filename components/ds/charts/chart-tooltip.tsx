"use client"

import type { TooltipContentProps } from "recharts"
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent"
import { cn } from "@/lib/utils"

export interface ChartTooltipProps
  extends Partial<TooltipContentProps<ValueType, NameType>> {
  className?: string
  /** Formatea el valor mostrado por serie. */
  valueFormatter?: (value: ValueType, name: NameType) => React.ReactNode
  /** Oculta el título (label del eje X). */
  hideLabel?: boolean
}

/**
 * Contenido de tooltip STUDIO para recharts. Superficie `bg-card`, borde
 * hairline, sombra-2, valores en mono y un punto de color por serie.
 *
 * Uso: `<Tooltip content={<ChartTooltip />} />`.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  className,
  valueFormatter,
  hideLabel = false,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div
      className={cn(
        "min-w-32 rounded-[var(--radius-md)] border border-border bg-card p-2.5 shadow-[var(--shadow-2)]",
        className,
      )}
    >
      {!hideLabel && label != null && label !== "" && (
        <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
          {label}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry, i) => {
          const color =
            (entry.color as string | undefined) ??
            (entry.payload as { fill?: string } | undefined)?.fill ??
            "currentColor"
          const value = entry.value as ValueType
          const name = entry.name as NameType
          return (
            <div
              key={`${String(name)}-${i}`}
              className="flex items-center justify-between gap-4 text-xs"
            >
              <span className="flex items-center gap-1.5 text-ink-subtle">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {name}
              </span>
              <span className="font-[family-name:var(--font-mono)] font-medium text-foreground tabular-nums">
                {valueFormatter
                  ? valueFormatter(value, name)
                  : (value as React.ReactNode)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
