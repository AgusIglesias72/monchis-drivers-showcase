"use client"

import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface DetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  icon?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** StatusPill u otro badge alineado a la derecha del header. */
  badge?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}

/** Drawer lateral de detalle (patrón lista → detalle). */
export function DetailDrawer({
  open,
  onOpenChange,
  icon,
  title,
  subtitle,
  badge,
  footer,
  children,
}: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border">
            <div className="flex items-center gap-3">
              {icon != null && (
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft font-[family-name:var(--font-display)] text-base font-bold text-primary">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <SheetTitle className="text-base leading-tight">{title}</SheetTitle>
                {subtitle && (
                  <SheetDescription className="font-[family-name:var(--font-mono)] text-xs">
                    {subtitle}
                  </SheetDescription>
                )}
              </div>
              {badge && <div className="ml-auto">{badge}</div>}
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-5 p-4">{children}</div>
          </ScrollArea>

          {footer && (
            <SheetFooter className="border-t border-border">{footer}</SheetFooter>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Grupo de filas etiqueta/valor dentro del drawer. */
export function DrawerSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[var(--ls-label)] text-ink-subtle">
        {title}
      </h3>
      <div className="divide-y divide-border rounded-[var(--radius-md)] border border-border bg-surface-3/40 px-3">
        {children}
      </div>
    </div>
  )
}

export function DrawerField({
  label,
  icon,
  mono,
  children,
}: {
  label: string
  icon?: React.ReactNode
  mono?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        {icon && <span className="text-ink-subtle">{icon}</span>}
        {label}
      </span>
      <span
        className={cn(
          "truncate text-right text-sm",
          mono && "font-[family-name:var(--font-mono)]",
        )}
      >
        {children}
      </span>
    </div>
  )
}

/** Celda de métrica (grilla) para el detalle. */
export function DrawerStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: string
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-card p-2.5">
      <div className="text-[10px] uppercase tracking-[var(--ls-label)] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "truncate font-[family-name:var(--font-mono)] text-base font-semibold",
          tone,
        )}
      >
        {value}
      </div>
      {sub && (
        <div className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground">
          {sub}
        </div>
      )}
    </div>
  )
}
