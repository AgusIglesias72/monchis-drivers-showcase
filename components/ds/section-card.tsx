import { cn } from "@/lib/utils"

export interface SectionCardHeaderProps {
  title?: React.ReactNode
  description?: React.ReactNode
  /** Contenido alineado a la derecha (botones, filtros). */
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

/** Cabecera de `SectionCard`, reutilizable para headers custom. */
export function SectionCardHeader({
  title,
  description,
  actions,
  className,
  children,
}: SectionCardHeaderProps) {
  if (children) {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
      >
        {children}
      </div>
    )
  }
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {title && (
          <h3 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[var(--ls-tight)] text-foreground">
            {title}
          </h3>
        )}
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  )
}

export interface SectionCardProps {
  title?: React.ReactNode
  description?: React.ReactNode
  /** Contenido alineado a la derecha del header. */
  actions?: React.ReactNode
  children?: React.ReactNode
  /** Quita el padding del body (para tablas u otras superficies full-bleed). */
  noPadding?: boolean
  className?: string
}

/**
 * Panel titulado STUDIO: `bg-card`, borde, sombra soft. Header con título en
 * display + acciones; body con padding (salvo `noPadding`).
 */
export function SectionCard({
  title,
  description,
  actions,
  children,
  noPadding = false,
  className,
}: SectionCardProps) {
  const hasHeader = Boolean(title || description || actions)
  return (
    <section
      className={cn(
        "rounded-[var(--radius-xl)] border border-border bg-card shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      {hasHeader && (
        <SectionCardHeader
          title={title}
          description={description}
          actions={actions}
        />
      )}
      <div className={cn(!noPadding && "p-4")}>{children}</div>
    </section>
  )
}
