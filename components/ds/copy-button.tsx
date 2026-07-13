"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface CopyButtonProps {
  /** Texto que se copia al portapapeles. */
  value: string
  size?: "sm" | "default"
  /** Etiqueta opcional junto al icono (si se omite, es solo icono). */
  label?: React.ReactNode
  className?: string
}

/**
 * Botón para copiar `value` al portapapeles. Muestra un check ~1.5s tras copiar.
 * Icon-button ghost por defecto; con `label` muestra texto al lado.
 */
export function CopyButton({
  value,
  size = "default",
  label,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Silencioso: el portapapeles puede fallar sin permisos.
    }
  }

  const Icon = copied ? Check : Copy

  if (label) {
    return (
      <Button
        type="button"
        variant="ghost"
        size={size === "sm" ? "sm" : "default"}
        onClick={handleCopy}
        aria-label="Copiar"
        className={className}
      >
        <Icon className={cn(copied && "text-success")} />
        {label}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size === "sm" ? "icon-sm" : "icon"}
      onClick={handleCopy}
      aria-label="Copiar"
      className={className}
    >
      <Icon className={cn(copied && "text-success")} />
    </Button>
  )
}
