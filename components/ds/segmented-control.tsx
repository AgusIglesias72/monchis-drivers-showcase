"use client"

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { ArrowDown, ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SegmentedOption {
  value: string
  label: React.ReactNode
}

export interface SegmentedControlProps {
  value: string
  onValueChange: (value: string) => void
  options: SegmentedOption[]
  /** Muestra flecha de dirección en el activo (para usar como sort). */
  direction?: "asc" | "desc"
  size?: "sm" | "md"
  className?: string
  "aria-label"?: string
}

/**
 * Control segmentado STUDIO: track `bg-muted`, activo = pastilla `bg-card`
 * con texto brand. NUNCA negro. Sirve de filtro (radio) o de sort (con `direction`).
 */
export function SegmentedControl({
  value,
  onValueChange,
  options,
  direction,
  size = "md",
  className,
  ...aria
}: SegmentedControlProps) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-full bg-muted p-1",
        className,
      )}
      {...aria}
    >
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <RadioGroupPrimitive.Item
            key={opt.value}
            value={opt.value}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1 rounded-full font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
              size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
              active
                ? "bg-card text-primary shadow-[var(--shadow-soft)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
            {active && direction === "desc" && <ArrowDown className="size-3" />}
            {active && direction === "asc" && <ArrowUp className="size-3" />}
          </RadioGroupPrimitive.Item>
        )
      })}
    </RadioGroupPrimitive.Root>
  )
}
