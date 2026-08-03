import { cn } from "@/lib/utils"

export type ProgressTone = "brand" | "success" | "warning" | "danger" | "info"

const FILL: Record<ProgressTone, string> = {
  brand: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
}

const VALUE_TEXT: Record<ProgressTone, string> = {
  brand: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
}

export interface ProgressBarProps {
  /** Progreso 0-100. */
  value: number
  tone?: ProgressTone
  label?: React.ReactNode
  /** Muestra el porcentaje (mono) alineado a la derecha del label. */
  showValue?: boolean
  className?: string
}

/** Barra de progreso lineal STUDIO. Track `bg-muted`, relleno por tono. */
export function ProgressBar({
  value,
  tone = "brand",
  label,
  showValue,
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className={cn("w-full", className)}>
      {(label != null || showValue) && (
        <div className="mb-1 flex items-center justify-between gap-2">
          {label != null && (
            <span className="text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
              {label}
            </span>
          )}
          {showValue && (
            <span
              className={cn(
                "font-[family-name:var(--font-mono)] text-[11px] font-semibold",
                VALUE_TEXT[tone],
              )}
            >
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            FILL[tone],
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
