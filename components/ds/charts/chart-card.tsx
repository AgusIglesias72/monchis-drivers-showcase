"use client"

import { cn } from "@/lib/utils"

export interface ChartCardProps {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  /** Contenido alineado a la derecha del header (filtros, toggles). */
  actions?: React.ReactNode
  /** Alto del área de gráfico en px (el hijo se estira a `100%`). */
  height?: number
  /** Aspect-ratio del área en vez de alto fijo (ej. "16 / 9"). Tiene prioridad. */
  aspect?: React.CSSProperties["aspectRatio"]
  className?: string
  /** El chart — normalmente un `<ResponsiveContainer>`. */
  children?: React.ReactNode
}

/**
 * Contenedor de gráfico STUDIO: mismo look que `SectionCard` (superficie
 * `bg-card`, borde, sombra soft, título en display) con un área de alto fijo
 * lista para un `ResponsiveContainer` de recharts.
 */
export function ChartCard({
  title,
  subtitle,
  actions,
  height = 260,
  aspect,
  className,
  children,
}: ChartCardProps) {
  const hasHeader = Boolean(title || subtitle || actions)
  return (
    <section
      className={cn(
        "rounded-[var(--radius-xl)] border border-border bg-card shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      {hasHeader && (
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h3 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[var(--ls-tight)] text-foreground">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      <div className="p-4">
        <div
          className="w-full"
          style={aspect ? { aspectRatio: aspect } : { height }}
        >
          {children}
        </div>
      </div>
    </section>
  )
}
