// app/api/public/booking/[token]/route.ts
// GET → BookingDetail (público, sin auth — la credencial es el token)

import { NextRequest, NextResponse } from 'next/server'
import { getBookingByConfirmationToken } from '@/lib/services/onboarding-booking.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    if (!token) return NextResponse.json({ error: 'token requerido' }, { status: 400 })
    const detail = await getBookingByConfirmationToken(token)
    return NextResponse.json(detail)
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
