import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type ChipTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "info"
  | "danger"

const TONE: Record<ChipTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-brand-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  danger: "bg-danger-soft text-destructive",
}

export interface ChipProps extends React.ComponentProps<"span"> {
  /** Muestra el contenido en tipografía mono (para métricas, IDs, tiempos). */
  mono?: boolean
  icon?: LucideIcon
  tone?: ChipTone
}

/** Píldora chica para métricas / etiquetas. Mono para números, IDs y tiempos. */
export function Chip({
  children,
  mono,
  icon: Icon,
  tone = "neutral",
  className,
  ...props
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
        TONE[tone],
        mono && "font-[family-name:var(--font-mono)]",
        mono && tone === "neutral" && "text-foreground",
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="size-3 opacity-70" />}
      {children}
    </span>
  )
}
