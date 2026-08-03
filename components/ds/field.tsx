import { cn } from "@/lib/utils"

export interface FieldProps {
  /** Etiqueta STUDIO (uppercase, tracking label). */
  label?: React.ReactNode
  /** Texto de ayuda muteado debajo del control. Se oculta si hay `error`. */
  hint?: React.ReactNode
  /** Mensaje de error (rojo). Tiene prioridad sobre `hint`. */
  error?: React.ReactNode
  /** Marca el campo como requerido (asterisco rojo en la etiqueta). */
  required?: boolean
  /** `htmlFor` de la etiqueta, apuntando al control. */
  htmlFor?: string
  children: React.ReactNode
  className?: string
}

/**
 * Wrapper de campo de formulario STUDIO: etiqueta arriba, control (children),
 * y hint (muteado) o error (destructive) debajo.
 */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground"
        >
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export interface FieldRowProps {
  children: React.ReactNode
  className?: string
}

/** Layout horizontal para agrupar varios `Field` en una fila. */
export function FieldRow({ children, className }: FieldRowProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start", className)}>
      {children}
    </div>
  )
}
