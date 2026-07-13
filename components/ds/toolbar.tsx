import { cn } from "@/lib/utils"

export interface ToolbarProps {
  /** Contenido alineado a la izquierda (título, filtros). */
  left?: React.ReactNode
  /** Contenido alineado a la derecha (acciones, botones). */
  right?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

/**
 * Barra de acciones horizontal STUDIO: slot izquierdo + slot derecho, se
 * acomoda en múltiples líneas en pantallas chicas.
 */
export function Toolbar({ left, right, children, className }: ToolbarProps) {
  if (children) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
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
        "flex flex-wrap items-center justify-between gap-2",
        className,
      )}
    >
      {left && (
        <div className="flex flex-wrap items-center gap-2">{left}</div>
      )}
      {right && (
        <div className="flex flex-wrap items-center gap-2">{right}</div>
      )}
    </div>
  )
}

export interface ToolbarGroupProps {
  children: React.ReactNode
  className?: string
}

/** Agrupa controles contiguos dentro de una `Toolbar`. */
export function ToolbarGroup({ children, className }: ToolbarGroupProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>{children}</div>
  )
}

export interface ToolbarSeparatorProps {
  className?: string
}

/** Separador vertical entre grupos de una `Toolbar`. */
export function ToolbarSeparator({ className }: ToolbarSeparatorProps) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      className={cn("h-5 w-px shrink-0 bg-border", className)}
    />
  )
}
