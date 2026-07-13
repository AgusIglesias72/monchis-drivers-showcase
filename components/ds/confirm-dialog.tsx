"use client"

import { AlertTriangle, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ds/spinner"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export type ConfirmTone = "default" | "danger"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
  /** Ícono del badge superior. Default: AlertTriangle (danger) / ninguno (default). */
  icon?: LucideIcon
  onConfirm: () => void | Promise<void>
  /** Estado de carga controlado; bloquea los botones y muestra spinner. */
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  icon,
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const Icon = icon ?? (tone === "danger" ? AlertTriangle : null)
  const centered = tone === "danger" || !!icon

  return (
    <AlertDialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <AlertDialogContent className="sm:max-w-sm">
        {Icon && (
          <div className={cn(
            "mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-[var(--r-pill)]",
            tone === "danger" ? "bg-[color:var(--danger-soft,#fee2e2)] text-destructive" : "bg-brand-soft text-primary",
          )}>
            <Icon className="size-6" />
          </div>
        )}
        <AlertDialogHeader className={cn(centered && "items-center text-center")}>
          <AlertDialogTitle className="font-[family-name:var(--font-display)] text-base leading-tight">
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-muted-foreground">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className={cn("mt-2", centered && "sm:justify-center")}>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "destructive" : "default"}
            size="sm"
            disabled={loading}
            onClick={() => onConfirm()}
          >
            {loading && <Spinner size="sm" />}
            {loading ? "Procesando…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
