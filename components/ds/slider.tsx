"use client"

import { cn } from "@/lib/utils"

export interface SliderProps {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  step?: number
  label?: React.ReactNode
  showValue?: boolean
  className?: string
}

/** Slider brand (native range con accent-color brand). */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue,
  className,
}: SliderProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          {showValue && (
            <span className="font-[family-name:var(--font-mono)] text-foreground">
              {value}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ accentColor: "var(--brand)" }}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
      />
    </div>
  )
}
