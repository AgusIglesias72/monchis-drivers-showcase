"use client"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type ModalSize = "md" | "lg"

const SIZE: Record<ModalSize, string> = {
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
}

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  size?: ModalSize
}

/** Modal genérico (contenido libre) con look STUDIO. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  size = "md",
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "rounded-[var(--r-xl)] border-border bg-card shadow-[var(--shadow-3)]",
          SIZE[size],
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] text-base leading-tight">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="min-w-0">{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
