// app/api/public/auth/session/validate/route.ts
// POST { shareToken } → PublicBookingSessionInfo

import { NextRequest, NextResponse } from 'next/server'
import { validateShareToken } from '@/lib/services/onboarding-booking.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const shareToken = body?.shareToken
    if (!shareToken || typeof shareToken !== 'string') {
      return NextResponse.json({ error: 'shareToken es obligatorio' }, { status: 400 })
    }
    const info = await validateShareToken(shareToken)
    return NextResponse.json(info)
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
