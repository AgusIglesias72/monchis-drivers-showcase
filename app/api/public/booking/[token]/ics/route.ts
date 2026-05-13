// app/api/public/booking/[token]/ics/route.ts
// GET → text/calendar (.ics) para que el postulante agregue el evento a su calendario.

import { NextRequest, NextResponse } from 'next/server'
import { getBookingByConfirmationToken } from '@/lib/services/onboarding-booking.service'
import { buildIcs } from '@/lib/services/ics.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const detail = await getBookingByConfirmationToken(token)
    const startUTC = new Date(detail.scheduledDateUTC)
    // Si no tenemos endTime explícito, usar duration default para no romper el ICS.
    // Wraparound: si el evento cruza medianoche (ej. 22:00 → 01:00), endTime queda
    // menor que startTime en HHMM; sumamos 24h al wraparound para mantener duración real.
    const [endH, endM] = detail.endTime.split(':').map((s) => parseInt(s, 10))
    const [startH, startM] = detail.startTime.split(':').map((s) => parseInt(s, 10))
    let minutesAdded = (endH * 60 + endM) - (startH * 60 + startM)
    if (minutesAdded < 0) minutesAdded += 24 * 60
    const duration = minutesAdded > 0 ? minutesAdded : 120
    const endUTC = new Date(startUTC.getTime() + duration * 60 * 1000)

    const description = detail.instructions
      ? `Capacitación Monchis Drivers\n\n${detail.instructions}`
      : 'Capacitación Monchis Drivers'

    const location =
      detail.modality === 'VIRTUAL'
        ? null
        : detail.locationAddress || detail.location || null

    const ics = buildIcs({
      uid: `booking-${detail.attendeeId}@monchis-drivers`,
      title: detail.ruleTitle,
      description,
      startUTC,
      endUTC,
      location,
      meetingLink: detail.meetingLink,
    })

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="capacitacion-${detail.attendeeId}.ics"`,
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
