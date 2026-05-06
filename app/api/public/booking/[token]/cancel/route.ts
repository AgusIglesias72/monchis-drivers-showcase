// app/api/public/booking/[token]/cancel/route.ts
// POST { reason? } → { ok: true }

import { NextRequest, NextResponse } from 'next/server'
import { cancelBooking } from '@/lib/services/onboarding-booking.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    if (!token) return NextResponse.json({ error: 'token requerido' }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const reason = typeof body?.reason === 'string' ? body.reason : undefined
    const result = await cancelBooking(token, reason)
    return NextResponse.json(result)
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
