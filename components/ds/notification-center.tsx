"use client"

import { useState } from "react"
import { Bell, CheckCheck, X, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar } from "./avatar"

export type NotificationTone = "brand" | "success" | "warning" | "info" | "danger"

const TONE: Record<NotificationTone, string> = {
  brand: "bg-brand-100 text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  danger: "bg-danger-soft text-destructive",
}

export interface NotificationEntry {
  id: string
  icon: LucideIcon
  tone: NotificationTone
  title: string
  body?: string
  time: string
  /** Encabezado de grupo (ej: "Hoy", "Ayer"); se agrupa preservando orden. */
  group?: string
  read?: boolean
  /** Nombre de la persona asociada (muestra avatar con iniciales). */
  actorName?: string
}

export interface NotificationItemProps {
  notification: NotificationEntry
  /** Oculta el body (para el dropdown). */
  compact?: boolean
  onMarkRead?: (id: string) => void
  onDismiss?: (id: string) => void
}

/** Fila de notificación: ícono tintado, no-leída con fondo brand suave. */
export function NotificationItem({
  notification: n,
  compact = false,
  onMarkRead,
  onDismiss,
}: NotificationItemProps) {
  const Icon = n.icon
  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)]",
        !n.read && "bg-brand-50",
      )}
    >
      {!n.read && (
        <span
          aria-label="No leída"
          className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary"
        />
      )}
      <span
        className={cn(
          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-[var(--r-pill)]",
          TONE[n.tone],
        )}
        aria-hidden
      >
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug",
              n.read
                ? "font-medium text-muted-foreground"
                : "font-semibold text-foreground",
            )}
          >
            {n.title}
          </p>
          <span className="shrink-0 font-[family-name:var(--font-mono)] text-[10px] text-ink-subtle">
            {n.time}
          </span>
        </div>
        {!compact && n.body && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {n.body}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          {n.actorName && (
            <div className="flex items-center gap-1.5">
              <Avatar name={n.actorName} size="sm" className="size-5 text-[8px]" />
              <span className="text-[10px] font-semibold text-muted-foreground">
                {n.actorName}
              </span>
            </div>
          )}
          {!n.read && onMarkRead && (
            <button
              type="button"
              onClick={() => onMarkRead(n.id)}
              className="ml-auto text-[10px] font-semibold text-primary hover:underline focus-visible:outline-none"
            >
              Marcar leída
            </button>
          )}
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={() => onDismiss(n.id)}
          aria-label="Descartar"
          className="mt-0.5 hidden shrink-0 rounded-[var(--r-pill)] p-1 text-ink-subtle transition-colors hover:bg-[var(--surface-3)] hover:text-foreground group-hover:flex"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export interface NotificationBellProps {
  notifications: NotificationEntry[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  /** Link del footer (ej: "Ver centro de notificaciones"). */
  footerLabel?: string
  onFooterClick?: () => void
  className?: string
}

/** Campana con badge de no-leídas y dropdown agrupado con "marcar todas". */
export function NotificationBell({
  notifications,
  onMarkRead,
  onMarkAllRead,
  footerLabel,
  onFooterClick,
  className,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const unread = notifications.filter((n) => !n.read).length

  // Grupos en orden de aparición
  const groups: { label: string | undefined; items: NotificationEntry[] }[] = []
  for (const n of notifications) {
    const last = groups[groups.length - 1]
    if (last && last.label === n.group) last.items.push(n)
    else groups.push({ label: n.group, items: [n] })
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-label={`Notificaciones${unread > 0 ? `, ${unread} no leídas` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative grid size-10 place-items-center rounded-[var(--r-pill)] border transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20",
          open
            ? "border-brand-300 bg-brand-50 text-primary"
            : "border-border bg-card text-muted-foreground hover:border-input hover:text-foreground",
        )}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 font-[family-name:var(--font-mono)] text-[9px] font-bold text-primary-foreground"
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-[var(--r-lg)] border border-border bg-popover shadow-[var(--shadow-3)]"
            role="dialog"
            aria-label="Panel de notificaciones"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
                  Notificaciones
                </h3>
                {unread > 0 && (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {unread} nuevas
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline focus-visible:outline-none"
                >
                  <CheckCheck className="size-3.5" />
                  Marcar todas
                </button>
              )}
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <Bell className="size-6 text-ink-subtle" aria-hidden />
                  <p className="text-sm font-semibold text-foreground">Todo al día</p>
                  <p className="text-xs text-muted-foreground">
                    Cuando lleguen nuevas alertas las vas a ver acá.
                  </p>
                </div>
              )}
              {groups.map((g, gi) => (
                <div key={g.label ?? gi}>
                  {g.label && (
                    <div className="sticky top-0 z-10 border-b border-border bg-[var(--surface-2)] px-4 py-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                        {g.label}
                      </span>
                    </div>
                  )}
                  {g.items.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      compact
                      onMarkRead={onMarkRead}
                    />
                  ))}
                </div>
              ))}
            </div>
            {footerLabel && (
              <div className="border-t border-border px-4 py-2.5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    onFooterClick?.()
                  }}
                  className="text-sm font-semibold text-primary hover:underline focus-visible:outline-none"
                >
                  {footerLabel}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
