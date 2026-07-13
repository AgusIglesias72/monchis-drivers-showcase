"use client"

import { useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar } from "./avatar"
import { StatusPill, type StatusTone } from "./status-pill"

export interface CalendarEvent {
  id: string
  date: Date
  /** Hora "HH:mm". */
  time: string
  title: string
  /** Línea con ícono de ubicación (zona, sucursal…). */
  subtitle?: string
  /** Línea extra (dirección, nota…). */
  detail?: string
  /** Avatar con iniciales junto al título. */
  avatarName?: string
  status?: { label: string; tone: StatusTone }
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]
const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"]

/** Primer día del mes → offset lunes-based (0=lunes…6=domingo). */
function primerDiaSemana(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function diasEnMes(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export interface MonthlyCalendarProps {
  events: CalendarEvent[]
  selected?: Date
  onSelect?: (date: Date) => void
  /** Default: fecha actual. */
  today?: Date
  className?: string
}

/** Calendario mensual navegable con dots de densidad de eventos por día. */
export function MonthlyCalendar({
  events,
  selected,
  onSelect,
  today = new Date(),
  className,
}: MonthlyCalendarProps) {
  const initial = selected ?? today
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  const offset = primerDiaSemana(viewYear, viewMonth)
  const totalDays = diasEnMes(viewYear, viewMonth)

  const eventosPorDia: Record<number, number> = {}
  for (const e of events) {
    if (e.date.getFullYear() === viewYear && e.date.getMonth() === viewMonth) {
      const d = e.date.getDate()
      eventosPorDia[d] = (eventosPorDia[d] ?? 0) + 1
    }
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else setViewMonth((m) => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else setViewMonth((m) => m + 1)
  }

  const cells: Array<number | null> = [
    ...Array.from<null>({ length: offset }).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between px-1 pb-3">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Mes anterior"
          className="grid size-8 place-items-center rounded-[var(--r-pill)] text-muted-foreground transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
          {MESES[viewMonth]} {viewYear}
        </h3>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Mes siguiente"
          className="grid size-8 place-items-center rounded-[var(--r-pill)] text-muted-foreground transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {DIAS_SEMANA.map((d) => (
          <div
            key={d}
            className="py-1 text-center font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.08em] text-ink-subtle"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="h-10" />
          const date = new Date(viewYear, viewMonth, day)
          const isToday = sameDay(date, today)
          const isSelected = selected != null && sameDay(date, selected)
          const count = eventosPorDia[day] ?? 0
          return (
            <button
              key={`day-${day}`}
              type="button"
              onClick={() => onSelect?.(date)}
              aria-label={`${day} de ${MESES[viewMonth]}`}
              aria-pressed={isSelected}
              className={cn(
                "relative flex h-10 w-full flex-col items-center justify-center rounded-[var(--r-md)] text-xs font-semibold transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]"
                  : isToday
                    ? "bg-brand-100 text-primary ring-1 ring-brand-300"
                    : "text-foreground hover:bg-[var(--surface-2)]",
              )}
            >
              {day}
              {count > 0 && (
                <span className="absolute bottom-1 flex items-center gap-0.5" aria-hidden>
                  {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "size-1 rounded-full",
                        isSelected ? "bg-primary-foreground" : "bg-primary",
                      )}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Fila de evento en la agenda del día. */
export function AgendaItem({
  event,
  compact,
}: {
  event: CalendarEvent
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[var(--r-md)] border border-border bg-card px-3 py-2.5 transition-shadow hover:shadow-[var(--shadow-1)]",
        compact && "py-2",
      )}
    >
      <span className="mt-0.5 shrink-0 font-[family-name:var(--font-mono)] text-xs font-bold text-primary">
        {event.time}
      </span>
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        {event.avatarName && <Avatar name={event.avatarName} size="sm" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
          {event.subtitle && (
            <div className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate text-xs">{event.subtitle}</span>
            </div>
          )}
          {!compact && event.detail && (
            <p className="mt-0.5 truncate text-xs text-ink-subtle">{event.detail}</p>
          )}
        </div>
      </div>
      {event.status && (
        <StatusPill tone={event.status.tone} dot className="mt-0.5 shrink-0">
          {event.status.label}
        </StatusPill>
      )}
    </div>
  )
}

export interface AgendaPanelProps {
  date: Date
  events: CalendarEvent[]
  /** Default: fecha actual (para el prefijo "Hoy, …"). */
  today?: Date
  /** Botón de acción a la derecha del título. */
  action?: React.ReactNode
  /** Override del texto del banner de conteo. */
  countText?: string
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

/** Panel "agenda del día": header con fecha, banner de conteo y lista de eventos. */
export function AgendaPanel({
  date,
  events,
  today = new Date(),
  action,
  countText,
  emptyTitle = "Día libre",
  emptyDescription = "No hay eventos para este día.",
  className,
}: AgendaPanelProps) {
  const isToday = sameDay(date, today)
  const mesLabel = `${MESES[date.getMonth()]!.toLowerCase()} ${date.getFullYear()}`
  const count =
    countText ??
    (events.length === 0
      ? "Sin eventos agendados"
      : events.length === 1
        ? "1 evento agendado"
        : `${events.length} eventos agendados`)

  return (
    <div className={cn("flex h-full flex-col gap-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.08em] text-ink-subtle">
            {mesLabel}
          </p>
          <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
            {isToday ? "Hoy, " : ""}
            {date.getDate()} de {MESES[date.getMonth()]!.toLowerCase()}
          </h3>
        </div>
        {action}
      </div>

      <div className="flex items-center gap-2 rounded-[var(--r-md)] bg-brand-50 px-3 py-2.5">
        <CalendarDays className="size-4 text-primary" aria-hidden />
        <span className="text-xs font-semibold text-primary">{count}</span>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-[var(--r-lg)] border border-dashed border-border py-10 text-center">
          <Clock className="size-8 text-ink-subtle" aria-hidden />
          <p className="text-sm font-semibold text-muted-foreground">{emptyTitle}</p>
          <p className="text-xs text-ink-subtle">{emptyDescription}</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {events.map((e) => (
            <AgendaItem key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  )
}
