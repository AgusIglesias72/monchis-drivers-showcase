"use client"

import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface NumberInputProps {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: React.ReactNode
  className?: string
}

/** Input numérico con steppers − / + (mono, clamp a min/max). */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  className,
}: NumberInputProps) {
  const clamp = (n: number) =>
    Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, n))
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[var(--radius-md)] border border-border bg-card shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-r-none"
        onClick={() => onChange(clamp(value - step))}
        disabled={min !== undefined && value <= min}
        aria-label="Restar"
      >
        <Minus />
      </Button>
      <div className="flex min-w-[3.5rem] items-center justify-center gap-1 px-2 font-[family-name:var(--font-mono)] text-sm tabular-nums">
        <span>{value}</span>
        {suffix && <span className="text-muted-foreground">{suffix}</span>}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-l-none"
        onClick={() => onChange(clamp(value + step))}
        disabled={max !== undefined && value >= max}
        aria-label="Sumar"
      >
        <Plus />
      </Button>
    </div>
  )
}
