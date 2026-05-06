// app/api/public/auth/session/profile/route.ts
//
// POST { shareToken } → datos completos del FormDriver (no enmascarados) para
// pre-llenar el form de confirmación de reserva. La credencial es el shareToken
// (lo trajo el driver en el link de WhatsApp/email post-aprobación), así que
// asumimos que es el dueño y le devolvemos sus datos para que confirme.

import { NextRequest, NextResponse } from 'next/server'
import { findSessionByShareToken } from '@/lib/services/public-booking-session.service'
import {
  ShareTokenInvalidError,
  ShareTokenExpiredError,
  mapOnboardingErrorToStatus,
} from '@/lib/services/onboarding-errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const shareToken = body?.shareToken
    if (!shareToken || typeof shareToken !== 'string') {
      return NextResponse.json({ error: 'shareToken es obligatorio' }, { status: 400 })
    }

    const session = await findSessionByShareToken(shareToken)
    if (!session) throw new ShareTokenInvalidError()
    if (session.expiresAt.getTime() <= Date.now()) throw new ShareTokenExpiredError()

    const fd = session.formDriver

    return NextResponse.json({
      profile: {
        firstName: fd.firstName ?? '',
        lastName: fd.lastName ?? '',
        cedula: fd.cedula ?? '',
        phoneNumber: fd.phoneNumber ?? '',
        email: fd.email ?? '',
      },
    })
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
