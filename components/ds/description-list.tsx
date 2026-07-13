import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DescriptionListProps {
  /** Layout de dos columnas responsive (una en móvil, dos en sm+). */
  columns?: 1 | 2
  children: React.ReactNode
  className?: string
}

/**
 * Lista de definiciones STUDIO: filas label → value. Versión standalone de los
 * campos del drawer. Con `columns={2}` se acomoda en grilla de dos columnas.
 */
export function DescriptionList({
  columns = 1,
  children,
  className,
}: DescriptionListProps) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-3",
        columns === 2 ? "sm:grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {children}
    </dl>
  )
}

export interface DescriptionItemProps {
  label: React.ReactNode
  /** Muestra el valor en tipografía mono (para métricas, IDs, tiempos). */
  mono?: boolean
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}

/** Fila label → value dentro de `DescriptionList`. */
export function DescriptionItem({
  label,
  mono,
  icon: Icon,
  children,
  className,
}: DescriptionItemProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <dt className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
        {Icon && <Icon className="size-3" />}
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm text-foreground",
          mono && "font-[family-name:var(--font-mono)]",
        )}
      >
        {children}
      </dd>
    </div>
  )
}
