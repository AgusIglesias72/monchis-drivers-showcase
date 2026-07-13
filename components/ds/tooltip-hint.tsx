"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type TooltipSide = "top" | "right" | "bottom" | "left"

export interface TooltipHintProps {
  label: React.ReactNode
  children: React.ReactNode
  side?: TooltipSide
}

/** Hint sobre un ícono/elemento (caso común de tooltip corto). */
export function TooltipHint({ label, children, side = "top" }: TooltipHintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}
