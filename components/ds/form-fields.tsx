"use client"

import { useId } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Field } from "./field"
import { cn } from "@/lib/utils"

export interface CheckboxFieldProps
  extends Omit<React.ComponentProps<typeof Checkbox>, "id"> {
  label: React.ReactNode
  /** Texto de ayuda muteado debajo de la etiqueta. */
  description?: React.ReactNode
  id?: string
  className?: string
}

/** Checkbox STUDIO con etiqueta y descripción alineadas a la derecha del control. */
export function CheckboxField({
  label,
  description,
  id,
  className,
  ...props
}: CheckboxFieldProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <Checkbox id={controlId} className="mt-0.5" {...props} />
      <div className="flex flex-col gap-0.5">
        <label
          htmlFor={controlId}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

export interface SwitchFieldProps
  extends Omit<React.ComponentProps<typeof Switch>, "id"> {
  label: React.ReactNode
  /** Texto de ayuda muteado debajo de la etiqueta. */
  description?: React.ReactNode
  id?: string
  className?: string
}

/** Switch STUDIO horizontal: etiqueta + descripción a la izquierda, control a la derecha. */
export function SwitchField({
  label,
  description,
  id,
  className,
  ...props
}: SwitchFieldProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex flex-col gap-0.5">
        <label
          htmlFor={controlId}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch id={controlId} {...props} />
    </div>
  )
}

export interface TextareaFieldProps
  extends Omit<React.ComponentProps<typeof Textarea>, "id"> {
  label?: React.ReactNode
  /** Texto de ayuda muteado debajo del control. Se oculta si hay `error`. */
  hint?: React.ReactNode
  /** Mensaje de error (rojo). Tiene prioridad sobre `hint`. */
  error?: React.ReactNode
  required?: boolean
  id?: string
  /** Clase del wrapper `Field`. */
  className?: string
}

/** Textarea STUDIO envuelto en `Field` con etiqueta, hint y error. */
export function TextareaField({
  label,
  hint,
  error,
  required,
  id,
  className,
  ...props
}: TextareaFieldProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={controlId}
      className={className}
    >
      <Textarea id={controlId} aria-invalid={error ? true : undefined} {...props} />
    </Field>
  )
}
