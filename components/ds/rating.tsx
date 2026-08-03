"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export interface RatingProps {
  value: number
  onChange?: (n: number) => void
  max?: number
  readOnly?: boolean
  size?: number
  className?: string
}

/** Rating de estrellas (interactivo o readOnly). */
export function Rating({
  value,
  onChange,
  max = 5,
  readOnly,
  size = 18,
  className,
}: RatingProps) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value
  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      onMouseLeave={() => setHover(null)}
    >
      {Array.from({ length: max }).map((_, i) => {
        const idx = i + 1
        const filled = idx <= shown
        return (
          <button
            key={idx}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(idx)}
            onClick={() => !readOnly && onChange?.(idx)}
            className={cn("outline-none", !readOnly && "cursor-pointer")}
            aria-label={`${idx} de ${max}`}
          >
            <Star
              style={{ width: size, height: size }}
              className={cn(filled ? "fill-warning text-warning" : "text-ink-subtle")}
            />
          </button>
        )
      })}
    </div>
  )
}
