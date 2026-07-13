'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  avatar,
  children,
  footer,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  /** Slot a la izquierda del título (ej. Avatar). */
  avatar?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const panelRef = useRef<HTMLElement>(null)
  const titleId = useId()

  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    if (!open) return
    const prevFocused = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const raf = requestAnimationFrame(() => panelRef.current?.focus())

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCloseRef.current(); return }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (!first || !last) return
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prevFocused?.focus?.()
    }
  }, [open])

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[rgba(23,63,58,0.35)] backdrop-blur-[2px] animate-[studio-fade_.2s_ease-out]"
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'absolute bottom-0 right-0 top-0 flex w-full max-w-md flex-col overflow-y-auto rounded-l-[var(--r-xl)] bg-[var(--c-surface)] shadow-[var(--shadow-3)] animate-[studio-slide-left_.3s_cubic-bezier(.2,.9,.3,1)] outline-none',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--c-border)] p-5">
          <div className="flex min-w-0 items-center gap-3">
            {avatar}
            <div className="min-w-0">
              {title && (
                <p
                  id={titleId}
                  className="truncate font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]"
                >
                  {title}
                </p>
              )}
              {subtitle && (
                <p className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--c-ink-subtle)] transition-colors hover:bg-[var(--c-surface-2)] hover:text-[var(--c-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 p-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-[var(--c-border)] p-5">{footer}</div>
        )}
      </aside>
    </div>,
    document.body,
  )
}
