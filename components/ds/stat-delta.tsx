import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export type DeltaDir = "up" | "down" | "flat"

export interface StatDeltaProps {
  value: React.ReactNode
  dir?: DeltaDir
  /** Si subir es malo (tiempos), invertí el color. */
  invertColor?: boolean
  className?: string
}

/** Badge inline de variación vs período (flecha + valor en mono). */
export function StatDelta({
  value,
  dir = "flat",
  invertColor,
  className,
}: StatDeltaProps) {
  const good =
    dir === "flat" ? "flat" : (dir === "up") !== !!invertColor ? "good" : "bad"
  const cls =
    good === "good"
      ? "bg-success-soft text-success"
      : good === "bad"
        ? "bg-danger-soft text-destructive"
        : "bg-muted text-muted-foreground"
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] font-semibold",
        cls,
        className,
      )}
    >
      <Icon className="size-3" />
      {value}
    </span>
  )
}
