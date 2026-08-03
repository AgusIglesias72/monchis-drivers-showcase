"use client"

import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

export interface InlineCalendarProps {
  value?: Date
  onChange: (d?: Date) => void
  className?: string
}

/** Calendario siempre visible (no popover), en un panel STUDIO. */
export function InlineCalendar({ value, onChange, className }: InlineCalendarProps) {
  return (
    <div
      className={cn(
        "inline-block rounded-[var(--radius-xl)] border border-border bg-card p-2 shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <Calendar mode="single" selected={value} onSelect={onChange} />
    </div>
  )
}
