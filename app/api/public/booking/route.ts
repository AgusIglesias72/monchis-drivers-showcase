// app/api/public/booking/route.ts
// POST BookingCreateInput → BookingResponse
// Rate limit: 10 / hour por shareToken.

import { NextRequest, NextResponse } from 'next/server'
import { createBooking } from '@/lib/services/onboarding-booking.service'
import { mapOnboardingErrorToStatus } from '@/lib/services/onboarding-errors'
import {
  sendBookingConfirmation,
  sendBookingConfirmationWhatsApp,
} from '@/lib/services/onboarding-notifications.service'
import { prisma } from '@/lib/prisma'
import type { BookingCreateInput } from '@/lib/types/onboarding-rules.types'

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX = 10

const counters = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const rec = counters.get(key)
  if (!rec || now > rec.resetAt) {
    counters.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (rec.count >= RATE_LIMIT_MAX) return false
  rec.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as BookingCreateInput
    if (!input?.shareToken) {
      return NextResponse.json({ error: 'shareToken es obligatorio' }, { status: 400 })
    }
    if (!checkRateLimit(`booking:${input.shareToken}`)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intentá nuevamente en una hora.' },
        { status: 429 },
      )
    }
    const response = await createBooking(input)

    // Best-effort: send confirmation email (no bloquear si falla)
    void (async () => {
      try {
        const attendee = await prisma.onboardingAttendee.findUnique({
          where: { confirmationToken: response.confirmationToken },
          include: {
            formDriver: { select: { id: true, email: true, firstName: true, phoneNumber: true } },
          },
        })
        if (attendee?.formDriver) {
          const proto = request.headers.get('x-forwarded-proto') || 'https'
          const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
          const appBaseUrl = `${proto}://${host}`

          // Doble canal, ambos best-effort e independientes (uno no bloquea al otro).
          await Promise.allSettled([
            sendBookingConfirmation({
              driverEmail: attendee.formDriver.email,
              driverFirstName: attendee.formDriver.firstName,
              ruleTitle: response.ruleTitle,
              scheduledDateUTC: response.scheduledDateUTC,
              startTime: response.startTime,
              endTime: response.endTime,
              modality: response.modality,
              location: response.location,
              locationAddress: response.locationAddress,
              meetingLink: response.meetingLink,
              instructions: response.instructions,
              confirmationToken: response.confirmationToken,
              appBaseUrl,
            }),
            sendBookingConfirmationWhatsApp({
              phoneNumber: attendee.formDriver.phoneNumber,
              driverFirstName: attendee.formDriver.firstName,
              formDriverId: attendee.formDriver.id,
              ruleTitle: response.ruleTitle,
              scheduledDateUTC: response.scheduledDateUTC,
              startTime: response.startTime,
              endTime: response.endTime,
              modality: response.modality,
              location: response.location,
              locationAddress: response.locationAddress,
              meetingLink: response.meetingLink,
              confirmationToken: response.confirmationToken,
              appBaseUrl,
            }),
          ])
        }
      } catch (e) {
        console.error('[booking] post-create notifications failed', e)
      }
    })()

    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    const { status, body } = mapOnboardingErrorToStatus(err)
    return NextResponse.json(body, { status })
  }
}
