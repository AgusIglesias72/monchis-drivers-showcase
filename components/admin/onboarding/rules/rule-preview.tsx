'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPYShort, addMinutesToHHMM, PY_TZ } from '@/lib/utils/onboarding-time'
import { addDays, startOfToday } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { DAY_NAMES_ES } from '@/lib/types/onboarding-rules.types'

interface Props {
  daysOfWeek: number[]
  startTime: string
  durationMinutes: number
  validFrom?: string
  validTo?: string | null
  modality: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID'
  maxCapacity: number
}

export function RulePreview({
  daysOfWeek,
  startTime,
  durationMinutes,
  validFrom,
  validTo,
  modality,
  maxCapacity,
}: Props) {
  const slots: Array<{ date: Date; dayName: string; startTime: string; endTime: string }> = []
  if (daysOfWeek.length === 0 || !startTime || !durationMinutes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Vista previa</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Configurá días, hora y duración para ver una previsualización.
        </CardContent>
      </Card>
    )
  }

  const today = startOfToday()
  const from = validFrom ? new Date(validFrom) : today
  const startCursor = from.getTime() < today.getTime() ? today : from
  const validToDate = validTo ? new Date(validTo) : null

  let endTime: string
  try {
    endTime = addMinutesToHHMM(startTime, durationMinutes)
  } catch {
    endTime = '—'
  }

  let cursor = startCursor
  let safety = 0
  while (slots.length < 6 && safety < 90) {
    safety++
    if (validToDate && cursor.getTime() > validToDate.getTime()) break
    const zoned = toZonedTime(cursor, PY_TZ)
    const dow = zoned.getDay()
    if (daysOfWeek.includes(dow)) {
      slots.push({
        date: new Date(cursor),
        dayName: DAY_NAMES_ES[dow],
        startTime,
        endTime,
      })
    }
    cursor = addDays(cursor, 1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Vista previa</CardTitle>
        <p className="text-xs text-muted-foreground">Próximas 6 fechas</p>
      </CardHeader>
      <CardContent>
        {slots.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin fechas disponibles con esta configuración.</p>
        ) : (
          <ul className="space-y-2">
            {slots.map((s, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between text-sm py-2 border-b last:border-0"
              >
                <div>
                  <div className="font-medium capitalize">{s.dayName}</div>
                  <div className="text-xs text-muted-foreground">{formatPYShort(s.date)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    {s.startTime} <span className="text-muted-foreground">— {s.endTime}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {modality === 'VIRTUAL' ? 'Online' : `Hasta ${maxCapacity}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
