import { cn } from "@/lib/utils"

export interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  /** Contenido alineado a la derecha (botones, meta, etc.). */
  actions?: React.ReactNode
  className?: string
}

/** Encabezado de página STUDIO: título en display + bajada + acciones. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[var(--ls-tight)] sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
