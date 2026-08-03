import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface EntityCardProps {
  /** Ícono o iniciales; se envuelve en un círculo brand-soft. */
  icon?: React.ReactNode
  title: React.ReactNode
  /** Badge/StatusPill al lado del título. */
  badge?: React.ReactNode
  /** Columna a la derecha (fecha, monto…), antes del chevron. */
  meta?: React.ReactNode
  /** Fila de chips debajo del título. */
  children?: React.ReactNode
  onClick?: () => void
  className?: string
}

/** Fila-tarjeta clickeable (lista → detalle). Hover con lift + sombra. */
export function EntityCard({
  icon,
  title,
  badge,
  meta,
  children,
  onClick,
  className,
}: EntityCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-[var(--radius-lg)] border border-border bg-card p-3.5 text-left shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-1)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 sm:p-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {icon != null && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft font-[family-name:var(--font-display)] text-sm font-bold text-primary">
            {icon}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold leading-tight">{title}</span>
            {badge}
          </div>
          {children && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">{children}</div>
          )}
        </div>

        {meta && <div className="flex shrink-0 flex-col items-end gap-0.5">{meta}</div>}

        <ChevronRight className="size-4 shrink-0 text-ink-subtle transition-colors group-hover:text-primary" />
      </div>
    </button>
  )
}
