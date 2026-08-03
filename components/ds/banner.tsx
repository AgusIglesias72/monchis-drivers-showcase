"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export type BannerTone = "brand" | "info" | "success" | "warning" | "danger"

const TONE: Record<BannerTone, string> = {
  brand: "bg-brand-soft text-primary",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-destructive",
}

export interface BannerProps {
  tone?: BannerTone
  title?: React.ReactNode
  children?: React.ReactNode
  action?: React.ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

/** Barra de anuncio full-width (distinta del Callout: dismissible + acción). */
export function Banner({
  tone = "brand",
  title,
  children,
  action,
  dismissible,
  onDismiss,
  className,
}: BannerProps) {
  const [hidden, setHidden] = useState(false)
  if (hidden) return null
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-2.5 text-sm",
        TONE[tone],
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {title && <span className="font-semibold">{title} </span>}
        <span className="text-foreground/80">{children}</span>
      </div>
      {action}
      {dismissible && (
        <button
          type="button"
          onClick={() => {
            setHidden(true)
            onDismiss?.()
          }}
          className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
