'use client'

import { useEffect, useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { addMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useBookingFlow } from './use-booking-flow'
import { BookingFlowDialogs } from './booking-flow-dialogs'
import { ymdInTZ, formatPYLong } from '@/lib/utils/onboarding-time'
import type { SlotResponse } from '@/lib/types/onboarding-rules.types'

interface Props {
  slug: string
  initialSession?: string
  initialSlots?: SlotResponse[]
  ruleTitle?: string
  /** Si está presente, todo POST va al endpoint de reschedule */
  rescheduleToken?: string
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export function BookingCalendar({
  slug,
  initialSession,
  initialSlots = [],
  ruleTitle,
  rescheduleToken,
}: Props) {
  const flow = useBookingFlow(initialSession, rescheduleToken)
  const [month, setMonth] = useState<Date>(new Date())
  const [slots, setSlots] = useState<SlotResponse[]>(initialSlots)
  // Meses ya cargados (key: "YYYY-MM"). Empezamos asumiendo que el server
  // pre-cargó el mes actual + el siguiente cuando initialSlots viene populado.
  const [loadedMonths, setLoadedMonths] = useState<Set<string>>(() => {
    if (!initialSlots.length) return new Set()
    const today = new Date()
    return new Set([monthKey(today), monthKey(addMonths(today, 1))])
  })
  const [loading, setLoading] = useState(initialSlots.length === 0)
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined)
  const [selectedSlot, setSelectedSlot] = useState<SlotResponse | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchMonth(target: Date, showLoading: boolean): Promise<void> {
      const key = monthKey(target)
      const from = ymdInTZ(startOfMonth(target))
      const to = ymdInTZ(endOfMonth(target))
      if (showLoading) setLoading(true)
      try {
        const r = await fetch(`/api/public/capacitaciones/${slug}/slots?from=${from}&to=${to}`)
        if (!r.ok) return
        const d = await r.json()
        if (cancelled) return
        const newSlots: SlotResponse[] = d.slots || []
        setSlots((prev) => {
          // dedupe por scheduledDateUTC
          const seen = new Set(prev.map((s) => s.scheduledDateUTC))
          const merged = prev.slice()
          for (const s of newSlots) if (!seen.has(s.scheduledDateUTC)) merged.push(s)
          return merged
        })
        setLoadedMonths((prev) => {
          if (prev.has(key)) return prev
          const next = new Set(prev)
          next.add(key)
          return next
        })
      } catch {
        // silent — el calendar muestra vacío para ese mes
      } finally {
        if (showLoading && !cancelled) setLoading(false)
      }
    }

    const currentKey = monthKey(month)
    const nextMonth = addMonths(month, 1)
    const nextKey = monthKey(nextMonth)

    if (!loadedMonths.has(currentKey)) {
      // No tenemos este mes — fetch visible. El prefetch del siguiente lo hace
      // automáticamente la próxima ejecución del effect cuando loadedMonths se
      // actualice y el currentKey ya esté presente.
      void fetchMonth(month, true)
    } else if (!loadedMonths.has(nextKey)) {
      // El mes actual ya está cacheado — prefetch del siguiente en background
      void fetchMonth(nextMonth, false)
    }

    return () => {
      cancelled = true
    }
  }, [slug, month, loadedMonths])

  const slotsByDate = useMemo(() => {
    const map = new Map<string, SlotResponse[]>()
    for (const s of slots || []) {
      const list = map.get(s.date) || []
      list.push(s)
      map.set(s.date, list)
    }
    return map
  }, [slots])

  const availableDays = useMemo(
    () =>
      Array.from(slotsByDate.entries())
        .filter(([, ss]) => ss.some((s) => !s.isFull && !s.isPast && !s.isPastNotice))
        .map(([d]) => new Date(d + 'T12:00:00')),
    [slotsByDate],
  )

  const fullDays = useMemo(
    () =>
      Array.from(slotsByDate.entries())
        .filter(([, ss]) => ss.length > 0 && ss.every((s) => s.isFull || s.isPast || s.isPastNotice))
        .map(([d]) => new Date(d + 'T12:00:00')),
    [slotsByDate],
  )

  const selectedDaySlots = useMemo(() => {
    if (!selectedDay) return []
    const ymd = ymdInTZ(selectedDay)
    return slotsByDate.get(ymd) || []
  }, [selectedDay, slotsByDate])

  function handleReservar() {
    if (!selectedSlot) return
    flow.startBooking(selectedSlot, ruleTitle)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
        {/* Calendar */}
        <div className="rounded-xl border bg-card p-4 lg:p-5 shadow-sm">
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <DayPicker
              mode="single"
              selected={selectedDay}
              onSelect={(d) => {
                setSelectedDay(d)
                setSelectedSlot(null)
              }}
              month={month}
              onMonthChange={setMonth}
              modifiers={{ available: availableDays }}
              modifiersClassNames={{
                available: 'rdp-available',
                selected: 'rdp-selected',
                today: 'rdp-today',
              }}
              disabled={(date) => {
                // Disabled: pasado O sin slot disponible (sin capacitación, lleno, o cerrado por minNotice)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                if (date < today) return true
                const ymd = ymdInTZ(date)
                const ss = slotsByDate.get(ymd)
                if (!ss || ss.length === 0) return true
                return ss.every((s) => s.isFull || s.isPast || s.isPastNotice)
              }}
              locale={es}
              weekStartsOn={1}
              className="!font-sans monchis-day-picker"
            />
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-md"
                style={{ backgroundColor: 'color-mix(in srgb, var(--brand) 12%, transparent)' }}
              />
              Con capacitación
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-md"
                style={{
                  backgroundImage:
                    'linear-gradient(to top right, transparent 47%, color-mix(in srgb, var(--muted-foreground) 40%, transparent) 48%, color-mix(in srgb, var(--muted-foreground) 40%, transparent) 52%, transparent 53%)',
                }}
              />
              Sin capacitación
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-brand" />
              Seleccionado
            </div>
          </div>
        </div>

        {/* Slots */}
        <div className="rounded-xl border bg-card p-4 lg:p-5 shadow-sm">
          {!selectedDay ? (
            <div className="text-sm text-muted-foreground py-12 text-center">
              <div className="mb-2 text-base font-medium text-foreground">Elegí un día</div>
              <div>Tocá una fecha disponible del calendario para ver los horarios.</div>
            </div>
          ) : selectedDaySlots.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center">
              No hay capacitaciones este día
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-semibold mb-3 pb-2 border-b first-letter:uppercase">
                {formatPYLong(selectedDay).split(',')[0]}
              </div>
              {selectedDaySlots.map((s, i) => {
                const disabled = s.isFull || s.isPast || s.isPastNotice
                const isSelected = selectedSlot?.scheduledDateUTC === s.scheduledDateUTC
                const stateLabel = disabled
                  ? s.isFull
                    ? 'Sin cupos disponibles'
                    : s.isPastNotice
                      ? 'Cierre de inscripción anticipado'
                      : 'Ya pasó'
                  : `${s.availableSlots} de ${s.maxCapacity} cupos`
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedSlot(s)}
                    aria-pressed={isSelected}
                    className={`group w-full flex items-center justify-between gap-3 border rounded-lg px-4 py-3 text-left transition-all
                      ${
                        isSelected
                          ? 'bg-brand text-brand-foreground border-brand shadow-sm'
                          : disabled
                            ? 'border-dashed bg-muted/30 cursor-not-allowed'
                            : 'border-border hover:border-brand/60 hover:shadow-sm hover:-translate-y-px'
                      }`}
                  >
                    <div className="min-w-0">
                      <div
                        className={`font-semibold tabular-nums ${
                          isSelected ? '' : disabled ? 'text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {s.startTime} — {s.endTime}
                      </div>
                      <div
                        className={`text-xs mt-0.5 ${
                          isSelected
                            ? 'text-brand-foreground/85'
                            : disabled
                              ? 'text-muted-foreground/80'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {stateLabel}
                      </div>
                    </div>
                    {disabled ? (
                      <Badge
                        variant="secondary"
                        className="shrink-0 bg-muted text-muted-foreground border-0"
                      >
                        {s.isFull ? 'Lleno' : s.isPastNotice ? 'Cierre' : 'Pasó'}
                      </Badge>
                    ) : isSelected ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                    ) : (
                      <span className="text-xs font-medium text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                        Seleccionar →
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* CTA — sticky bottom mobile, inline desktop */}
      {selectedSlot && (
        <>
          <div className="fixed bottom-0 inset-x-0 bg-background border-t p-4 z-20 md:hidden">
            <Button
              onClick={handleReservar}
              disabled={flow.booking}
              className="w-full bg-brand text-brand-foreground hover:bg-brand-hover"
              size="lg"
            >
              {flow.isReschedule ? 'Reagendar' : 'Reservar'} {selectedSlot.startTime} — {selectedSlot.endTime}
            </Button>
          </div>
          <div className="hidden md:flex justify-end pt-4 pb-12">
            <Button
              onClick={handleReservar}
              disabled={flow.booking}
              className="bg-brand text-brand-foreground hover:bg-brand-hover"
              size="lg"
            >
              {flow.isReschedule ? 'Reagendar' : 'Reservar'} {selectedSlot.startTime} — {selectedSlot.endTime}
            </Button>
          </div>
        </>
      )}

      <BookingFlowDialogs flow={flow} />
    </div>
  )
}
