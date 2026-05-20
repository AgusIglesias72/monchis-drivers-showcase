import { format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import { TURNOS_CONFIG } from "@/lib/config/turnos.config"

// Hoy en zona Asunción, formato "YYYY-MM-DD".
export function todayInPyIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TURNOS_CONFIG.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

export function dayNameFromIso(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`))
}

// Etiqueta de pill de fecha: Hoy/Ayer/Mañana o "EEE" + "d MMM".
export function formatDatePill(iso: string): {
  primary: string
  secondary: string
} {
  try {
    const d = parseISO(iso)
    if (isToday(d)) return { primary: "Hoy", secondary: format(d, "d MMM", { locale: es }) }
    if (isTomorrow(d)) return { primary: "Mañana", secondary: format(d, "d MMM", { locale: es }) }
    if (isYesterday(d)) return { primary: "Ayer", secondary: format(d, "d MMM", { locale: es }) }
    return {
      primary: format(d, "EEE", { locale: es }),
      secondary: format(d, "d MMM", { locale: es }),
    }
  } catch {
    return { primary: iso, secondary: "" }
  }
}
