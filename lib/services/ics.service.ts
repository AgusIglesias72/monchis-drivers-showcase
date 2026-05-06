// lib/services/ics.service.ts
//
// Genera strings VCALENDAR (RFC 5545) para que el postulante pueda agregar el
// evento de capacitación a su calendario. Output diseñado para servirse como
// text/calendar; charset=utf-8 desde un endpoint .ics.

interface BuildIcsOptions {
  uid: string
  title: string
  description?: string | null
  startUTC: Date
  endUTC: Date
  location?: string | null
  meetingLink?: string | null
}

const PRODID = '-//Monchis Drivers//Capacitacion//ES'

function formatICSDate(d: Date): string {
  // YYYYMMDDTHHMMSSZ
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

function escapeICSText(text: string): string {
  // Orden importa: el backslash debe escaparse primero.
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

// RFC 5545: líneas no deben pasar 75 octetos. Plegado por seguridad.
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const out: string[] = []
  let i = 0
  while (i < line.length) {
    const chunk = line.slice(i, i === 0 ? 75 : i + 74)
    out.push(i === 0 ? chunk : ' ' + chunk)
    i += chunk.length - (i === 0 ? 0 : 1)
    if (i === chunk.length && i >= 75) {
      // continuar
    }
  }
  // Implementación más simple y correcta:
  const result: string[] = []
  let pos = 0
  while (pos < line.length) {
    if (pos === 0) {
      const slice = line.slice(0, 75)
      result.push(slice)
      pos = 75
    } else {
      const slice = line.slice(pos, pos + 74)
      result.push(' ' + slice)
      pos += 74
    }
  }
  return result.join('\r\n')
}

export function buildIcs(opts: BuildIcsOptions): string {
  const { uid, title, description, startUTC, endUTC, location, meetingLink } = opts

  const dtstamp = formatICSDate(new Date())
  const dtstart = formatICSDate(startUTC)
  const dtend = formatICSDate(endUTC)

  const summary = escapeICSText(title)

  let descParts: string[] = []
  if (description) descParts.push(description)
  if (meetingLink) descParts.push(`Link: ${meetingLink}`)
  const fullDescription = descParts.length ? escapeICSText(descParts.join('\n\n')) : ''

  const locationLine = location ? escapeICSText(location) : ''

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
  ]
  if (fullDescription) lines.push(`DESCRIPTION:${fullDescription}`)
  if (locationLine) lines.push(`LOCATION:${locationLine}`)
  if (meetingLink) lines.push(`URL:${meetingLink}`)
  lines.push('STATUS:CONFIRMED', 'TRANSP:OPAQUE', 'END:VEVENT', 'END:VCALENDAR')

  // CRLF y line-folding por línea.
  return lines.map(foldLine).join('\r\n') + '\r\n'
}
