import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export type TagTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "info"
  | "danger"

const TONE: Record<TagTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-brand-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  danger: "bg-danger-soft text-destructive",
}

export interface TagProps {
  label: React.ReactNode
  tone?: TagTone
  /** Si se define, muestra un botón "×" para removerlo. */
  onRemove?: () => void
  className?: string
}

/**
 * Etiqueta removible STUDIO: representa valores ingresados por el usuario.
 * A diferencia de `Chip`, puede eliminarse con el botón "×".
 */
export function Tag({ label, tone = "neutral", onRemove, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
        TONE[tone],
        className,
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar"
          className="-mr-0.5 inline-flex size-3.5 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  )
}

export interface TagListProps {
  children: React.ReactNode
  className?: string
}

/** Contenedor que envuelve varios `Tag` en múltiples líneas. */
export function TagList({ children, className }: TagListProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {children}
    </div>
  )
}
