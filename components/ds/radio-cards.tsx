"use client"

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Check, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface RadioCardOption {
  value: string
  label: React.ReactNode
  description?: React.ReactNode
  icon?: LucideIcon
}

export interface RadioCardsProps {
  value: string
  onChange: (value: string) => void
  options: RadioCardOption[]
  /** Columnas de la grilla (1–4). Default 1. */
  columns?: 1 | 2 | 3 | 4
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

const COLS: Record<NonNullable<RadioCardsProps["columns"]>, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
}

/**
 * Grupo de radios como tarjetas seleccionables STUDIO: no seleccionada
 * `border-border bg-card`, seleccionada `border-primary bg-brand-soft` con check.
 */
export function RadioCards({
  value,
  onChange,
  options,
  columns = 1,
  disabled,
  className,
  ...aria
}: RadioCardsProps) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      className={cn("grid gap-2.5", COLS[columns], className)}
      {...aria}
    >
      {options.map((opt) => {
        const Icon = opt.icon
        const active = value === opt.value
        return (
          <RadioGroupPrimitive.Item
            key={opt.value}
            value={opt.value}
            className={cn(
              "group relative flex items-start gap-3 rounded-[var(--radius-lg)] border p-3 text-left outline-none transition-all",
              "shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
              "focus-visible:ring-[3px] focus-visible:ring-ring/30",
              "disabled:pointer-events-none disabled:opacity-50",
              active
                ? "border-primary bg-brand-soft"
                : "border-border bg-card hover:border-brand-300",
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              />
            )}
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "text-sm font-medium",
                  active ? "text-primary" : "text-foreground",
                )}
              >
                {opt.label}
              </div>
              {opt.description && (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {opt.description}
                </div>
              )}
            </div>
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card",
              )}
            >
              <RadioGroupPrimitive.Indicator>
                <Check className="size-3.5" />
              </RadioGroupPrimitive.Indicator>
            </span>
          </RadioGroupPrimitive.Item>
        )
      })}
    </RadioGroupPrimitive.Root>
  )
}
