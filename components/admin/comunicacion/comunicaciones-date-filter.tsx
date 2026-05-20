// components/admin/comunicacion/comunicaciones-date-filter.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'
import { CalendarDays, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface Props {
  currentStartDate?: string
  currentEndDate?: string
  /** Path al que navegar al aplicar el filtro. Default: /admin/comunicaciones */
  basePath?: string
  /** Params de URL que mapean a las fechas. Default: startDate, endDate */
  paramKeys?: { from: string; to: string }
}

function parseYmd(s: string | undefined): Date | undefined {
  if (!s) return undefined
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return undefined
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatRangeLabel(from?: Date, to?: Date): string {
  if (!from && !to) return 'Últimas 24h'
  if (from && !to) return `Desde ${format(from, 'dd MMM', { locale: es })}`
  if (!from && to) return `Hasta ${format(to, 'dd MMM', { locale: es })}`
  if (from && to) {
    const sameDay =
      from.getFullYear() === to.getFullYear() &&
      from.getMonth() === to.getMonth() &&
      from.getDate() === to.getDate()
    if (sameDay) return format(from, 'dd MMM yyyy', { locale: es })
    return `${format(from, 'dd MMM', { locale: es })} → ${format(to, 'dd MMM yyyy', { locale: es })}`
  }
  return ''
}

export function ComunicacionesDateFilter({
  currentStartDate,
  currentEndDate,
  basePath = '/admin/comunicaciones',
  paramKeys = { from: 'startDate', to: 'endDate' },
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = parseYmd(currentStartDate)
    const to = parseYmd(currentEndDate)
    return from || to ? { from, to } : undefined
  })
  const [open, setOpen] = useState(false)

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') params.delete(k)
      else params.set(k, v)
    }
    // Reset paginación cuando cambia el rango.
    params.delete('page')
    startTransition(() => {
      router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ''}`)
    })
  }

  const commitRange = (range: DateRange | undefined) => {
    setDateRange(range)
    updateParams({
      [paramKeys.from]: range?.from ? toYmd(range.from) : null,
      [paramKeys.to]: range?.to ? toYmd(range.to) : null,
    })
    setOpen(false)
  }

  const handleSelect = (range: DateRange | undefined, triggerDate: Date | undefined) => {
    if (dateRange?.from && dateRange?.to && triggerDate) {
      setDateRange({ from: triggerDate, to: undefined })
      return
    }
    setDateRange(range)
    if (range?.from && range?.to) commitRange(range)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next && dateRange?.from && !dateRange?.to) {
      const urlFrom = parseYmd(currentStartDate)
      const urlTo = parseYmd(currentEndDate)
      setDateRange(urlFrom || urlTo ? { from: urlFrom, to: urlTo } : undefined)
    }
  }

  const applyPreset = (days: number | 'today') => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const from = days === 'today' ? today : subDays(today, days === 0 ? 0 : days - 1)
    commitRange({ from, to: today })
  }

  const hasFilter = !!currentStartDate || !!currentEndDate

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 gap-2 font-normal min-w-[180px] justify-start',
            !hasFilter && 'text-muted-foreground',
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {isPending ? 'Aplicando…' : formatRangeLabel(dateRange?.from, dateRange?.to)}
          </span>
          {hasFilter && (
            <span
              role="button"
              tabIndex={0}
              onClick={e => {
                e.stopPropagation()
                commitRange(undefined)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  commitRange(undefined)
                }
              }}
              aria-label="Limpiar rango"
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 flex flex-col sm:flex-row">
        <div className="flex flex-row sm:flex-col gap-1 border-b sm:border-b-0 sm:border-r p-2 min-w-[140px] flex-wrap">
          {[
            { label: 'Hoy', days: 'today' as const },
            { label: 'Últimos 7', days: 7 },
            { label: 'Últimos 14', days: 14 },
            { label: 'Últimos 30', days: 30 },
            { label: 'Últimos 90', days: 90 },
          ].map(p => (
            <Button
              key={p.label}
              variant="ghost"
              size="sm"
              className="justify-start h-8 text-xs sm:w-full"
              onClick={() => applyPreset(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <Calendar
          mode="range"
          min={1}
          selected={dateRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          defaultMonth={dateRange?.from}
          locale={es}
          showOutsideDays={false}
        />
      </PopoverContent>
    </Popover>
  )
}
