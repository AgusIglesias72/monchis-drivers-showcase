// app/api/public/booking/[token]/cancel/route.ts
// POST { reason? } → { ok: true }

import { NextRequest, NextResponse } from 'next/server'
import { cancelBooking } from '@/lib/services/onboarding-booking.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'
import { sendBookingCancellationWhatsApp } from '@/lib/services/onboarding-notifications.service'
import { recordMessageSent } from '@/lib/services/messaging-frequency.service'
import { prisma } from '@/lib/prisma'

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

    // Best-effort: avisar que se canceló e invitar a reagendar. cancelBooking ya
    // devolvió al driver a READY y reseteó el backoff; registramos este envío con
    // recordMessageSent para fijar el próximo contacto y que el cron no duplique.
    void (async () => {
      try {
        const attendee = await prisma.onboardingAttendee.findUnique({
          where: { confirmationToken: token },
          include: {
            formDriver: { select: { id: true, firstName: true, phoneNumber: true } },
          },
        })
        if (attendee?.formDriver?.phoneNumber) {
          const proto = request.headers.get('x-forwarded-proto') || 'https'
          const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
          const sent = await sendBookingCancellationWhatsApp({
            phoneNumber: attendee.formDriver.phoneNumber,
            driverFirstName: attendee.formDriver.firstName,
            formDriverId: attendee.formDriver.id,
            appBaseUrl: `${proto}://${host}`,
          })
          if (sent) {
            await recordMessageSent(attendee.formDriver.id).catch(() => undefined)
          }
        }
      } catch (e) {
        console.error('[cancel] post-cancel notification failed', e)
      }
    })()

    return NextResponse.json(result)
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
