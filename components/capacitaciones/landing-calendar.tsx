'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { addMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  MapPin,
  Video,
  Zap,
  Users,
  ArrowRight,
  Calendar,
  Info,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ymdInTZ, formatPYLong } from '@/lib/utils/onboarding-time'
import { useBookingFlow } from './use-booking-flow'
import { BookingFlowDialogs } from './booking-flow-dialogs'
import type { OnboardingModality } from '@prisma/client'
import type { SlotResponse } from '@/lib/types/onboarding-rules.types'

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

// ymd a partir de las PARTES LOCALES del Date que maneja DayPicker (cada celda
// es la medianoche local de ese día). Tiene que ser consistente con cómo
// `availableDays` posiciona los días (new Date(ymd+'T12:00')), si no, en SSR
// (servidor en UTC) ymdInTZ devuelve el día anterior y desincroniza
// "disponible" (rosa) vs "deshabilitado" → días tachados que sí existen.
const dayPickerYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const MODALITY_ICON = {
  IN_PERSON: MapPin,
  VIRTUAL: Video,
  HYBRID: Zap,
} as const

const MODALITY_DOT_CLASS = {
  IN_PERSON: 'bg-brand',
  VIRTUAL: 'bg-info',
  HYBRID: 'bg-violet-500',
} as const

const MODALITY_LABEL = {
  IN_PERSON: 'Presencial',
  VIRTUAL: 'Virtual',
  HYBRID: 'Híbrida',
} as const

interface Props {
  initialSlots?: SlotResponse[]
  sessionToken?: string
}

export function LandingCalendar({ initialSlots = [], sessionToken }: Props) {
  const flow = useBookingFlow(sessionToken)
  const [month, setMonth] = useState<Date>(new Date())
  const [slots, setSlots] = useState<SlotResponse[]>(initialSlots)
  const [loadedMonths, setLoadedMonths] = useState<Set<string>>(() => {
    if (!initialSlots.length) return new Set()
    const today = new Date()
    return new Set([monthKey(today), monthKey(addMonths(today, 1))])
  })
  const [loading, setLoading] = useState(initialSlots.length === 0)
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Fetch + prefetch del mes siguiente
  useEffect(() => {
    let cancelled = false

    async function fetchMonth(target: Date, showLoading: boolean) {
      const key = monthKey(target)
      const from = ymdInTZ(startOfMonth(target))
      const to = ymdInTZ(endOfMonth(target))
      if (showLoading) setLoading(true)
      try {
        const r = await fetch(`/api/public/capacitaciones/slots?from=${from}&to=${to}`)
        if (!r.ok) return
        const d = await r.json()
        if (cancelled) return
        const newSlots: SlotResponse[] = d.slots || []
        setSlots((prev) => {
          // Reemplazo los del rango exacto, mantengo el resto
          const filtered = prev.filter((s) => s.date < from || s.date > to)
          return [...filtered, ...newSlots].sort((a, b) =>
            a.date !== b.date ? a.date.localeCompare(b.date) : a.startTime.localeCompare(b.startTime),
          )
        })
        setLoadedMonths((prev) => {
          if (prev.has(key)) return prev
          const next = new Set(prev)
          next.add(key)
          return next
        })
      } catch {
        // silent
      } finally {
        if (showLoading && !cancelled) setLoading(false)
      }
    }

    const currentKey = monthKey(month)
    const nextMonth = addMonths(month, 1)
    const nextKey = monthKey(nextMonth)

    if (!loadedMonths.has(currentKey)) {
      void fetchMonth(month, true)
    } else if (!loadedMonths.has(nextKey)) {
      void fetchMonth(nextMonth, false)
    }

    return () => {
      cancelled = true
    }
  }, [month, loadedMonths])

  // Index slots por fecha
  const slotsByDate = useMemo(() => {
    const map = new Map<string, SlotResponse[]>()
    for (const s of slots) {
      const arr = map.get(s.date) || []
      arr.push(s)
      map.set(s.date, arr)
    }
    return map
  }, [slots])

  // Modificadores por modalidad: cada día tiene 1, 2 o 3 dots según las modalidades
  // distintas que ocurren ese día (con al menos 1 slot disponible).
  const dayModalities = useMemo(() => {
    const map = new Map<string, Set<OnboardingModality>>()
    for (const [ymd, ss] of slotsByDate.entries()) {
      const mods = new Set<OnboardingModality>()
      for (const s of ss) {
        if (!s.isFull && !s.isPast && !s.isPastNotice) {
          mods.add(s.modality)
        }
      }
      if (mods.size > 0) map.set(ymd, mods)
    }
    return map
  }, [slotsByDate])

  const availableDays = useMemo(
    () =>
      Array.from(dayModalities.keys()).map((ymd) => new Date(ymd + 'T12:00:00')),
    [dayModalities],
  )

  const selectedDaySlots = useMemo(() => {
    if (!selectedDay) return []
    const ymd = dayPickerYmd(selectedDay)
    return slotsByDate.get(ymd) || []
  }, [selectedDay, slotsByDate])

  // Modalidades distintas presentes en todo el período → leyenda contextual
  const presentModalities = useMemo(() => {
    const set = new Set<OnboardingModality>()
    for (const mods of dayModalities.values()) {
      for (const m of mods) set.add(m)
    }
    return set
  }, [dayModalities])

  const selectedYmd = selectedDay ? dayPickerYmd(selectedDay) : null
  const selectedModalities = selectedYmd ? dayModalities.get(selectedYmd) : null

  return (
    <section className="mt-2 mb-12 lg:mb-14">
      <div className="text-center mb-6 lg:mb-8">
        <div className="text-xs uppercase tracking-wider font-semibold text-brand mb-2">
          Agendá tu capacitación
        </div>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
          Elegí tu fecha
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
          Tocá un día disponible y reservá tu lugar en el momento.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
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
                // En mobile, abrimos el drawer al elegir un día
                if (d && typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setMobileOpen(true)
                }
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
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                if (date < today) return true
                const ymd = dayPickerYmd(date)
                return !dayModalities.has(ymd)
              }}
              locale={es}
              weekStartsOn={1}
              className="!font-sans monchis-day-picker"
            />
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t text-xs text-muted-foreground">
            {presentModalities.has('IN_PERSON') && (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                Presencial
              </div>
            )}
            {presentModalities.has('VIRTUAL') && (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-info" />
                Virtual
              </div>
            )}
            {presentModalities.has('HYBRID') && (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                Híbrida
              </div>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <span
                className="h-2.5 w-2.5 rounded-md"
                style={{
                  backgroundImage:
                    'linear-gradient(to top right, transparent 47%, color-mix(in srgb, var(--muted-foreground) 40%, transparent) 48%, color-mix(in srgb, var(--muted-foreground) 40%, transparent) 52%, transparent 53%)',
                }}
              />
              Sin capacitación
            </div>
          </div>
        </div>

        {/* Detalle del día — solo desktop. En mobile usamos un Sheet (abajo). */}
        <div className="hidden lg:block rounded-xl border bg-card p-4 lg:p-5 shadow-sm min-h-[20rem]">
          <DaySlotsContent
            selectedDay={selectedDay}
            slots={selectedDaySlots}
            sessionToken={flow.sessionToken}
            onReservar={(s) => flow.startBooking(s)}
          />
        </div>
      </div>

      {/* Mobile: Sheet (drawer) que se abre cuando hay día seleccionado */}
      <Sheet
        open={mobileOpen}
        onOpenChange={(v) => {
          setMobileOpen(v)
          if (!v) setSelectedDay(undefined)
        }}
      >
        <SheetContent side="bottom" className="lg:hidden max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left pb-2">
            <SheetTitle className="text-base first-letter:uppercase">
              {selectedDay ? formatPYLong(selectedDay).split(',')[0] : 'Detalle'}
            </SheetTitle>
            <SheetDescription>
              {selectedDaySlots.length === 1
                ? '1 capacitación disponible'
                : `${selectedDaySlots.length} capacitaciones disponibles`}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-2 space-y-3 pb-4">
            {selectedDaySlots.map((s, i) => (
              <SlotItem
                key={`${s.ruleId}-${i}`}
                slot={s}
                sessionToken={flow.sessionToken}
                onReservar={() => {
                  setMobileOpen(false)
                  flow.startBooking(s)
                }}
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <BookingFlowDialogs flow={flow} />
    </section>
  )
}

// ───────────────────── Sub-componentes ─────────────────────

function DaySlotsContent({
  selectedDay,
  slots,
  sessionToken,
  onReservar,
}: {
  selectedDay: Date | undefined
  slots: SlotResponse[]
  sessionToken: string | undefined
  onReservar: (slot: SlotResponse) => void
}) {
  if (!selectedDay) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-8">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="font-semibold text-sm">Elegí una fecha</div>
        <div className="text-xs text-muted-foreground mt-1 max-w-[200px]">
          Tocá un día marcado para ver qué capacitaciones hay disponibles.
        </div>
      </div>
    )
  }
  if (slots.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground py-8">
        No hay capacitaciones este día
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div className="pb-2.5 border-b">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {slots.length === 1
            ? '1 capacitación disponible'
            : `${slots.length} capacitaciones disponibles`}
        </div>
        <div className="text-base font-semibold first-letter:uppercase mt-0.5">
          {formatPYLong(selectedDay).split(',')[0]}
        </div>
      </div>
      {slots.map((s, i) => (
        <SlotItem
          key={`${s.ruleId}-${i}`}
          slot={s}
          sessionToken={sessionToken}
          onReservar={() => onReservar(s)}
        />
      ))}
    </div>
  )
}

function SlotItem({
  slot,
  sessionToken,
  onReservar,
}: {
  slot: SlotResponse
  sessionToken: string | undefined
  onReservar: () => void
}) {
  const Icon = MODALITY_ICON[slot.modality]
  const disabled = slot.isFull || slot.isPast || slot.isPastNotice
  const detailHref = sessionToken
    ? `/capacitaciones/${slot.ruleSlug}?session=${sessionToken}`
    : `/capacitaciones/${slot.ruleSlug}`

  return (
    <div
      className={`group rounded-lg border p-3 transition-all ${
        disabled ? 'opacity-60 bg-muted/20' : 'hover:border-brand/40 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`h-5 w-5 rounded-full flex items-center justify-center text-white ${MODALITY_DOT_CLASS[slot.modality]}`}
          >
            <Icon className="h-3 w-3" />
          </span>
          <span className="font-medium text-muted-foreground">
            {MODALITY_LABEL[slot.modality]}
          </span>
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {slot.startTime} — {slot.endTime}
        </span>
      </div>
      <div className="font-semibold text-sm leading-tight mb-3">{slot.ruleTitle}</div>
      {disabled && (
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mb-3 -mt-1.5">
          <Users className="h-3 w-3" />
          {slot.isFull ? 'Sin cupos disponibles' : 'Cerrado'}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onReservar}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-semibold transition-colors h-9 px-3 ${
            disabled
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-brand text-brand-foreground hover:bg-brand-hover'
          }`}
        >
          Reservar
          {!disabled && (
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          )}
        </button>
        <Link
          href={detailHref}
          aria-label="Ver detalles de la capacitación"
          className="inline-flex items-center justify-center h-9 w-9 rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Info className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
