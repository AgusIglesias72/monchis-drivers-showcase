import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type PageStateTone = "brand" | "warm" | "info" | "danger" | "neutral"

const TONE: Record<PageStateTone, string> = {
  brand: "bg-brand-soft text-primary",
  warm: "bg-accent-warm-soft text-accent-warm-600",
  info: "bg-info-soft text-info",
  danger: "bg-danger-soft text-destructive",
  neutral: "bg-[var(--surface-2)] text-muted-foreground",
}

export interface PageStateProps {
  icon: LucideIcon
  tone?: PageStateTone
  /** Línea mono chiquita arriba del título (ej: "Error 404"). */
  eyebrow?: React.ReactNode
  /** Alternativa al eyebrow: un badge/StatusPill. */
  badge?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  /** Botones de acción (Volver, Reintentar, etc.). */
  actions?: React.ReactNode
  className?: string
}

/**
 * Estado de página completo (404, error de servidor, sin resultados,
 * bienvenida): ilustración de ícono tintado + título display + acciones.
 */
export function PageState({
  icon: Icon,
  tone = "brand",
  eyebrow,
  badge,
  title,
  description,
  actions,
  className,
}: PageStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-8 py-10 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "grid h-20 w-20 place-items-center rounded-[var(--r-xl)]",
          TONE[tone],
        )}
      >
        <Icon className="size-9" strokeWidth={1.5} />
      </div>
      <div className="space-y-2">
        {eyebrow && (
          <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        {badge && <div className="flex justify-center">{badge}</div>}
        <h3 className="font-[family-name:var(--font-display)] text-xl font-bold leading-tight text-foreground">
          {title}
        </h3>
        {description && (
          <p className="mx-auto max-w-[320px] text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {actions}
        </div>
      )}
    </div>
  )
}
