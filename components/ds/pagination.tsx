"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Páginas visibles a cada lado de la actual. */
  siblingCount?: number
  className?: string
  "aria-label"?: string
}

const ELLIPSIS = "ellipsis" as const

/** Construye la lista de páginas visibles con elipsis para los huecos. */
function buildRange(
  page: number,
  totalPages: number,
  siblingCount: number,
): (number | typeof ELLIPSIS)[] {
  // 1 (first) + 1 (last) + current + 2*siblings + 2 ellipsis
  const totalSlots = siblingCount * 2 + 5
  if (totalPages <= totalSlots) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const left = Math.max(page - siblingCount, 1)
  const right = Math.min(page + siblingCount, totalPages)
  const showLeftEllipsis = left > 2
  const showRightEllipsis = right < totalPages - 1

  const range: (number | typeof ELLIPSIS)[] = [1]
  if (showLeftEllipsis) range.push(ELLIPSIS)
  for (let i = left; i <= right; i++) {
    if (i !== 1 && i !== totalPages) range.push(i)
  }
  if (showRightEllipsis) range.push(ELLIPSIS)
  range.push(totalPages)
  return range
}

/**
 * Paginación STUDIO: prev/next outline + pastillas numeradas (activo =
 * `bg-primary text-primary-foreground`), números en mono, elipsis en huecos.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
  ...aria
}: PaginationProps) {
  if (totalPages <= 1) return null

  const range = buildRange(page, totalPages, siblingCount)
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <nav
      aria-label={aria["aria-label"] ?? "Paginación"}
      className={cn("flex items-center gap-1", className)}
    >
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Página anterior"
        disabled={!canPrev}
        onClick={() => canPrev && onPageChange(page - 1)}
      >
        <ChevronLeft />
      </Button>

      {range.map((item, i) => {
        if (item === ELLIPSIS) {
          return (
            <span
              key={`ellipsis-${i}`}
              aria-hidden
              className="inline-flex size-8 items-center justify-center text-xs text-ink-subtle"
            >
              …
            </span>
          )
        }
        const active = item === page
        return (
          <button
            key={item}
            type="button"
            aria-label={`Página ${item}`}
            aria-current={active ? "page" : undefined}
            onClick={() => onPageChange(item)}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-[var(--radius-md)] font-[family-name:var(--font-mono)] text-xs font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/30",
              active
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item}
          </button>
        )
      })}

      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Página siguiente"
        disabled={!canNext}
        onClick={() => canNext && onPageChange(page + 1)}
      >
        <ChevronRight />
      </Button>
    </nav>
  )
}
