import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type CalloutTone = "info" | "success" | "warning" | "danger" | "neutral"

const TONE: Record<
  CalloutTone,
  { wrap: string; icon: string; defaultIcon: LucideIcon }
> = {
  info: { wrap: "border-info/30 bg-info-soft", icon: "text-info", defaultIcon: Info },
  success: {
    wrap: "border-success/30 bg-success-soft",
    icon: "text-success",
    defaultIcon: CheckCircle2,
  },
  warning: {
    wrap: "border-warning/30 bg-warning-soft",
    icon: "text-warning",
    defaultIcon: AlertTriangle,
  },
  danger: {
    wrap: "border-destructive/30 bg-danger-soft",
    icon: "text-destructive",
    defaultIcon: XCircle,
  },
  neutral: { wrap: "border-border bg-muted/60", icon: "text-ink-subtle", defaultIcon: Info },
}

export interface CalloutProps {
  tone?: CalloutTone
  title?: React.ReactNode
  icon?: LucideIcon
  children?: React.ReactNode
  className?: string
}

/** Banner/aviso semántico (info/success/warning/danger). */
export function Callout({
  tone = "info",
  title,
  icon,
  children,
  className,
}: CalloutProps) {
  const t = TONE[tone]
  const Icon = icon ?? t.defaultIcon
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-[var(--radius-lg)] border p-3 text-sm",
        t.wrap,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", t.icon)} />
      <div className="min-w-0">
        {title && <div className={cn("font-semibold", t.icon)}>{title}</div>}
        {children && <div className="text-foreground/80">{children}</div>}
      </div>
    </div>
  )
}
