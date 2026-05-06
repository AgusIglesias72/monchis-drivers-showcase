// lib/utils/onboarding-time.ts
//
// Helpers de timezone para el sistema de capacitaciones. Reemplaza el offset
// hardcoded `-3` que usaba el cron viejo (rompe en horario de invierno PY).
// Usa America/Asuncion (IANA), que maneja DST correctamente.

import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz'
import { addDays, addMinutes, startOfDay } from 'date-fns'

export const PY_TZ = 'America/Asuncion'

/**
 * Parsea un string "HH:MM" en horas y minutos, o lanza si está mal formateado.
 */
export function parseHHMM(time: string): { hours: number; minutes: number } {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) throw new Error(`Hora inválida: "${time}". Formato esperado HH:MM`)
  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Hora fuera de rango: "${time}"`)
  }
  return { hours, minutes }
}

export function formatHHMM(date: Date, timezone = PY_TZ): string {
  return formatInTimeZone(date, timezone, 'HH:mm')
}

/**
 * Combina un día calendario (en TZ) con una hora "HH:MM" y devuelve el Date UTC equivalente.
 *
 * Uso típico: "lunes 12 mayo 10:00 PY" → Date UTC.
 */
export function combineDateAndTimeInTZ(
  ymd: string, // "YYYY-MM-DD"
  hhmm: string, // "HH:MM"
  timezone = PY_TZ,
): Date {
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!ymdMatch) throw new Error(`Fecha inválida: "${ymd}". Formato esperado YYYY-MM-DD`)
  const { hours, minutes } = parseHHMM(hhmm)

  // Construir un ISO local (sin tz) y convertirlo desde la zona dada a UTC
  const localISO = `${ymd}T${hhmm.padStart(5, '0')}:00`
  return fromZonedTime(localISO, timezone)
}

/**
 * Devuelve "YYYY-MM-DD" en la timezone dada para una fecha cualquiera.
 */
export function ymdInTZ(date: Date, timezone = PY_TZ): string {
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd')
}

/**
 * Devuelve el día de la semana (0=domingo..6=sábado) en la timezone dada.
 */
export function dayOfWeekInTZ(date: Date, timezone = PY_TZ): number {
  // En date-fns el formato 'i' es 1=lunes..7=domingo, pero JS Date.getDay() usa 0=domingo.
  // formatInTimeZone con 'e' da 1=domingo..7=sábado en locale en-US, sumamos -1 para alinear.
  // Usamos el truco de tomar el zoned date y usar getDay():
  const zoned = toZonedTime(date, timezone)
  return zoned.getDay()
}

export function nowInTZ(timezone = PY_TZ): Date {
  return toZonedTime(new Date(), timezone)
}

/**
 * Itera todos los días entre `from` y `to` (inclusive) y devuelve el array de YYYY-MM-DD
 * en la TZ dada. Útil para enumerar slots candidatos.
 */
export function enumerateDaysInTZ(
  from: Date,
  to: Date,
  timezone = PY_TZ,
): string[] {
  const out: string[] = []
  // Trabajamos en TZ local para enumerar días calendario
  const fromZ = toZonedTime(from, timezone)
  const toZ = toZonedTime(to, timezone)
  let cursor = startOfDay(fromZ)
  const end = startOfDay(toZ)
  while (cursor.getTime() <= end.getTime()) {
    out.push(formatInTimeZone(fromZonedTime(cursor, timezone), timezone, 'yyyy-MM-dd'))
    cursor = addDays(cursor, 1)
  }
  return out
}

/**
 * Calcula el endTime "HH:MM" sumando durationMinutes a startTime "HH:MM".
 * Si cruza la medianoche, devuelve "HH:MM" del mismo día siguiente — quien lo
 * use debe saber que el evento puede cruzar día (raro en capacitaciones).
 */
export function addMinutesToHHMM(time: string, minutes: number): string {
  const { hours, minutes: m } = parseHHMM(time)
  const total = hours * 60 + m + minutes
  const newH = Math.floor((total % (24 * 60)) / 60)
  const newM = total % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

/**
 * Formatea una fecha (UTC) en español PY largo, ej. "lunes 12 de mayo de 2026, 10:00".
 */
export function formatPYLong(date: Date, timezone = PY_TZ): string {
  // date-fns-tz no acepta locale fácilmente; armamos a mano con formatInTimeZone
  const day = formatInTimeZone(date, timezone, 'd')
  const monthIdx = parseInt(formatInTimeZone(date, timezone, 'M'), 10) - 1
  const year = formatInTimeZone(date, timezone, 'yyyy')
  const dowIdx = dayOfWeekInTZ(date, timezone)
  const time = formatInTimeZone(date, timezone, 'HH:mm')

  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]
  return `${days[dowIdx]} ${day} de ${months[monthIdx]} de ${year}, ${time}`
}

export function formatPYShort(date: Date, timezone = PY_TZ): string {
  const day = formatInTimeZone(date, timezone, 'd')
  const monthIdx = parseInt(formatInTimeZone(date, timezone, 'M'), 10) - 1
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ]
  return `${day} ${months[monthIdx]}`
}

export { addMinutes, addDays }
