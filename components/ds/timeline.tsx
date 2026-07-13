import { cn } from "@/lib/utils"

export type TimelineTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "info"
  | "danger"

const DOT: Record<TimelineTone, string> = {
  neutral: "bg-muted-foreground",
  brand: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  danger: "bg-destructive",
}

export interface TimelineProps {
  children: React.ReactNode
  className?: string
}

/** Línea de tiempo vertical STUDIO. Contiene `TimelineItem`s. */
export function Timeline({ children, className }: TimelineProps) {
  return <ol className={cn("relative", className)}>{children}</ol>
}

export interface TimelineItemProps {
  title: React.ReactNode
  /** Marca de tiempo (mono), alineada a la derecha del título. */
  time?: React.ReactNode
  description?: React.ReactNode
  tone?: TimelineTone
  /** Último item: no dibuja la línea conectora hacia abajo. */
  last?: boolean
  className?: string
}

/** Item de la línea de tiempo: punto (tono) + conector + título/tiempo/detalle. */
export function TimelineItem({
  title,
  time,
  description,
  tone = "neutral",
  last,
  className,
}: TimelineItemProps) {
  return (
    <li className={cn("relative flex gap-3 pb-5 last:pb-0", className)}>
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "mt-1 size-2.5 shrink-0 rounded-full ring-2 ring-card",
            DOT[tone],
          )}
        />
        {!last && <span className="mt-1 w-px flex-1 bg-border" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-medium text-foreground">{title}</div>
          {time != null && (
            <div className="shrink-0 font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground">
              {time}
            </div>
          )}
        </div>
        {description != null && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {description}
          </div>
        )}
      </div>
    </li>
  )
}
