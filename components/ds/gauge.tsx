import { cn } from "@/lib/utils"

export type GaugeTone = "brand" | "success" | "warning" | "danger" | "info"

const STROKE: Record<GaugeTone, string> = {
  brand: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
}

const VALUE_TEXT: Record<GaugeTone, string> = {
  brand: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
}

export interface GaugeProps {
  /** Progreso 0-100. */
  value: number
  /** Diámetro en px. */
  size?: number
  tone?: GaugeTone
  /** Etiqueta debajo del valor central. */
  label?: React.ReactNode
  /** Segunda línea (mono) debajo del label. */
  sub?: React.ReactNode
  className?: string
}

/** Gauge radial (SVG). Track muteado, progreso por tono, valor mono al centro. */
export function Gauge({
  value,
  size = 96,
  tone = "brand",
  label,
  sub,
  className,
}: GaugeProps) {
  const pct = Math.min(100, Math.max(0, value))
  const stroke = Math.max(4, Math.round(size * 0.09))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - pct / 100)

  return (
    <div
      className={cn("inline-flex flex-col items-center gap-1", className)}
      style={{ width: size }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="text-muted"
            stroke="currentColor"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={cn(
              "transition-[stroke-dashoffset] duration-700 ease-out",
              STROKE[tone],
            )}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "font-[family-name:var(--font-display)] font-bold",
              VALUE_TEXT[tone],
            )}
            style={{ fontSize: Math.round(size * 0.24) }}
          >
            {Math.round(pct)}
          </span>
        </div>
      </div>
      {label != null && (
        <span className="text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
          {label}
        </span>
      )}
      {sub != null && (
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground">
          {sub}
        </span>
      )}
    </div>
  )
}
