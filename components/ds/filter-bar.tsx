import { cn } from "@/lib/utils"

export interface FilterBarProps {
  children: React.ReactNode
  className?: string
  /** Layout interno por defecto (flex wrap). Poné false para controlarlo vos. */
  row?: boolean
}

/** Contenedor de barra de filtros STUDIO (card cálida + sombra suave). */
export function FilterBar({ children, className, row = true }: FilterBarProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-border bg-card p-3 shadow-[var(--shadow-soft)] sm:p-4",
        className,
      )}
    >
      {row ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  )
}

/** Etiqueta corta para agrupar un control dentro de la FilterBar. */
export function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
      {children}
    </span>
  )
}
