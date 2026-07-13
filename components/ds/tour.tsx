"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface TourStep {
  /** id del `data-tour` del elemento a resaltar. Ausente → paso centrado (intro). */
  target?: string
  title: string
  body: string
}

const PAD = 8
const TIP_W = 340
const TIP_H = 190
const GAP = 14

type Box = { top: number; left: number; width: number; height: number }

/**
 * Product tour con spotlight: oscurece la pantalla alrededor del elemento
 * `data-tour="<id>"` con un box-shadow gigante, globo paso a paso con
 * navegación por teclado (←/→/Esc) y recálculo en resize/scroll.
 */
export function Tour({
  steps,
  open,
  onClose,
}: {
  steps: TourStep[]
  open: boolean
  onClose: () => void
}) {
  const [i, setI] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const [mounted, setMounted] = useState(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (open) setI(0)
  }, [open])

  const step = open ? steps[i] : undefined

  const measure = useCallback(() => {
    if (!step) return
    if (!step.target) {
      setBox(null)
      return
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    if (!el) {
      setBox(null)
      return
    }
    const r = el.getBoundingClientRect()
    setBox({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [step])

  useLayoutEffect(() => {
    if (!open || !step) return
    if (step.target) {
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      el?.scrollIntoView({ block: "center", behavior: "smooth" })
    }
    measure()
    const t = setTimeout(measure, 320)
    const onMove = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(measure)
    }
    window.addEventListener("resize", onMove)
    window.addEventListener("scroll", onMove, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener("resize", onMove)
      window.removeEventListener("scroll", onMove, true)
    }
  }, [open, i, step, measure])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, steps.length - 1))
      else if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose, steps.length])

  if (!mounted || !open || !step) return null

  const last = i === steps.length - 1
  const first = i === 0

  const vw = window.innerWidth
  const vh = window.innerHeight
  let tipTop: number
  let tipLeft: number
  if (box) {
    const below = box.top + box.height + GAP + TIP_H < vh
    tipTop = below ? box.top + box.height + GAP : Math.max(GAP, box.top - TIP_H - GAP)
    tipLeft = Math.min(
      Math.max(GAP, box.left + box.width / 2 - TIP_W / 2),
      vw - TIP_W - GAP,
    )
  } else {
    tipTop = vh / 2 - TIP_H / 2
    tipLeft = vw / 2 - TIP_W / 2
  }

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Tutorial">
      {box ? (
        <div
          className="pointer-events-none fixed rounded-[var(--r-lg)] ring-2 ring-primary transition-all duration-200"
          style={{
            top: box.top - PAD,
            left: box.left - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(23, 43, 40, 0.72)",
          }}
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-[rgba(23,43,40,0.72)]" />
      )}

      <div
        className="fixed animate-[studio-pop_.18s_ease-out] rounded-[var(--r-lg)] border border-border bg-card p-5 shadow-[var(--shadow-2)]"
        style={{ top: tipTop, left: tipLeft, width: TIP_W }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar tutorial"
          className="absolute right-3 top-3 grid size-7 place-items-center rounded-[var(--r-pill)] text-ink-subtle transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
          Paso {i + 1} de {steps.length}
        </p>
        <h3 className="mt-1 pr-6 font-[family-name:var(--font-display)] text-base font-bold text-foreground">
          {step.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-muted-foreground underline hover:text-primary"
          >
            Saltar
          </button>
          <div className="flex items-center gap-2">
            {!first && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setI((n) => Math.max(n - 1, 0))}
              >
                <ChevronLeft className="size-4" aria-hidden />
                Atrás
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => (last ? onClose() : setI((n) => Math.min(n + 1, steps.length - 1)))}
            >
              {last ? "Listo" : "Siguiente"}
              {!last && <ChevronRight className="size-4" aria-hidden />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
