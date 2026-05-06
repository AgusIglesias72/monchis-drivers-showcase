// app/api/public/booking/[token]/reschedule/route.ts
// POST { eventId? | ruleId?+scheduledDateUTC? } → BookingResponse

import { NextRequest, NextResponse } from 'next/server'
import { rescheduleBooking } from '@/lib/services/onboarding-booking.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    if (!token) return NextResponse.json({ error: 'token requerido' }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const result = await rescheduleBooking(token, {
      eventId: typeof body?.eventId === 'string' ? body.eventId : undefined,
      ruleId: typeof body?.ruleId === 'string' ? body.ruleId : undefined,
      scheduledDateUTC: typeof body?.scheduledDateUTC === 'string' ? body.scheduledDateUTC : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
