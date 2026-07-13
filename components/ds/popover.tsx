"use client"

import {
  Popover as UIPopover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface PopoverProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: "start" | "center" | "end"
  className?: string
}

/** Popover genérico STUDIO (trigger + contenido). */
export function Popover({
  trigger,
  children,
  align = "start",
  className,
}: PopoverProps) {
  return (
    <UIPopover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className={cn(className)}>
        {children}
      </PopoverContent>
    </UIPopover>
  )
}
