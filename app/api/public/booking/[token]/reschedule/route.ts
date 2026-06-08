// app/api/public/booking/[token]/reschedule/route.ts
// POST { eventId? | ruleId?+scheduledDateUTC? } → BookingResponse

import { NextRequest, NextResponse } from 'next/server'
import { rescheduleBooking } from '@/lib/services/onboarding-booking.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'
import {
  sendBookingConfirmation,
  sendBookingConfirmationWhatsApp,
} from '@/lib/services/onboarding-notifications.service'
import { prisma } from '@/lib/prisma'

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

    // Best-effort: confirmación de la NUEVA reserva (fecha + link de gestión
    // nuevo). Sin esto el postulante reagenda a ciegas y el link viejo queda
    // muerto. Mismo patrón que la ruta de creación.
    void (async () => {
      try {
        const attendee = await prisma.onboardingAttendee.findUnique({
          where: { confirmationToken: result.confirmationToken },
          include: {
            formDriver: { select: { id: true, email: true, firstName: true, phoneNumber: true } },
          },
        })
        if (attendee?.formDriver) {
          const proto = request.headers.get('x-forwarded-proto') || 'https'
          const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
          const appBaseUrl = `${proto}://${host}`

          await Promise.allSettled([
            sendBookingConfirmation({
              driverEmail: attendee.formDriver.email,
              driverFirstName: attendee.formDriver.firstName,
              ruleTitle: result.ruleTitle,
              scheduledDateUTC: result.scheduledDateUTC,
              startTime: result.startTime,
              endTime: result.endTime,
              modality: result.modality,
              location: result.location,
              locationAddress: result.locationAddress,
              meetingLink: result.meetingLink,
              instructions: result.instructions,
              confirmationToken: result.confirmationToken,
              appBaseUrl,
              isReschedule: true,
            }),
            sendBookingConfirmationWhatsApp({
              phoneNumber: attendee.formDriver.phoneNumber,
              driverFirstName: attendee.formDriver.firstName,
              formDriverId: attendee.formDriver.id,
              ruleTitle: result.ruleTitle,
              scheduledDateUTC: result.scheduledDateUTC,
              startTime: result.startTime,
              endTime: result.endTime,
              modality: result.modality,
              location: result.location,
              locationAddress: result.locationAddress,
              meetingLink: result.meetingLink,
              confirmationToken: result.confirmationToken,
              appBaseUrl,
              isReschedule: true,
            }),
          ])
        }
      } catch (e) {
        console.error('[reschedule] post-reschedule notifications failed', e)
      }
    })()

    return NextResponse.json(result)
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
