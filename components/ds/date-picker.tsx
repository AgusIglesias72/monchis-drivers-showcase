"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarDays, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
  value?: Date
  onChange: (date?: Date) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Selector de fecha única STUDIO. Trigger outline con ícono de calendario y
 * fecha formateada en mono; abre un Popover con el calendario. Sin `<input type=date>`.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Elegir fecha",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-9 min-w-[180px] justify-start gap-2 font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="size-4 shrink-0" />
          <span
            className={cn(
              "truncate",
              value && "font-[family-name:var(--font-mono)]",
            )}
          >
            {value ? format(value, "dd MMM yyyy", { locale: es }) : placeholder}
          </span>
          <ChevronDown className="ml-auto size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date)
            setOpen(false)
          }}
          defaultMonth={value}
          locale={es}
          showOutsideDays={false}
        />
      </PopoverContent>
    </Popover>
  )
}
