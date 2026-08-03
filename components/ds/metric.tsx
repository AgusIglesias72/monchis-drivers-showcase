import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MetricProps {
  label: React.ReactNode
  value: React.ReactNode
  /** Texto del delta, ej. "+12%" o "-3,4pp". */
  delta?: React.ReactNode
  /** Dirección visual del delta. */
  deltaDir?: "up" | "down" | "flat"
  /** Si subir es malo (ej. tiempos), invertí el color con esto. */
  invertDeltaColor?: boolean
  sub?: React.ReactNode
  className?: string
}

/** Métrica grande (mono) con delta vs período anterior. */
export function Metric({
  label,
  value,
  delta,
  deltaDir = "flat",
  invertDeltaColor,
  sub,
  className,
}: MetricProps) {
  const good =
    deltaDir === "flat"
      ? "neutral"
      : (deltaDir === "up") !== !!invertDeltaColor
        ? "good"
        : "bad"
  const deltaCls =
    good === "good"
      ? "text-success"
      : good === "bad"
        ? "text-destructive"
        : "text-muted-foreground"
  const DeltaIcon =
    deltaDir === "up" ? ArrowUpRight : deltaDir === "down" ? ArrowDownRight : Minus

  return (
    <div className={cn("space-y-0.5", className)}>
      <div className="text-[10px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-[family-name:var(--font-display)] text-2xl font-bold">
          {value}
        </span>
        {delta != null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-[family-name:var(--font-mono)] text-xs font-semibold",
              deltaCls,
            )}
          >
            <DeltaIcon className="size-3" />
            {delta}
          </span>
        )}
      </div>
      {sub && (
        <div className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground">
          {sub}
        </div>
      )}
    </div>
  )
}
