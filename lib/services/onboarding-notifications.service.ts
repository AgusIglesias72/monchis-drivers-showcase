// lib/services/onboarding-notifications.service.ts
//
// Wrapper de notificaciones para el flujo público de capacitaciones.
// MVP: email vía Resend. Hook ready para WhatsApp ManyChat (queda en TODO hasta
// que los templates estén lanzados — ver project memory).

import { Resend } from 'resend'
import { render } from '@react-email/render'
import BookingConfirmationEmail from '@/emails/booking-confirmation'
import {
  NOTIFICATIONS_CONFIG,
  getResendApiKey,
} from '@/lib/config/notifications.config'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(getResendApiKey())
  return _resend
}

export interface BookingConfirmationData {
  driverEmail: string | null
  driverFirstName: string | null
  ruleTitle: string
  scheduledDateUTC: string
  startTime: string
  endTime: string
  modality: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID'
  location: string | null
  locationAddress: string | null
  meetingLink: string | null
  instructions: string | null
  confirmationToken: string
  appBaseUrl: string
}

export async function sendBookingConfirmation(data: BookingConfirmationData): Promise<void> {
  if (!data.driverEmail) return // sin email, skip silencioso (WhatsApp cubre el caso)

  try {
    const html = await render(
      BookingConfirmationEmail({
        driverFirstName: data.driverFirstName,
        ruleTitle: data.ruleTitle,
        scheduledDateUTC: data.scheduledDateUTC,
        startTime: data.startTime,
        endTime: data.endTime,
        modality: data.modality,
        location: data.location,
        locationAddress: data.locationAddress,
        meetingLink: data.meetingLink,
        instructions: data.instructions,
        confirmationUrl: `${data.appBaseUrl}/capacitaciones/reserva/${data.confirmationToken}`,
        icsUrl: `${data.appBaseUrl}/api/public/booking/${data.confirmationToken}/ics`,
      }),
    )

    await getResend().emails.send({
      from: NOTIFICATIONS_CONFIG.from,
      to: [data.driverEmail],
      replyTo: NOTIFICATIONS_CONFIG.replyTo,
      subject: `Tu capacitación ${data.ruleTitle} está confirmada`,
      html,
    })
  } catch (err) {
    console.error('[onboarding-notifications] Failed to send confirmation email:', err)
    // No relanzamos: el booking ya quedó creado, el email es best-effort
  }
}

// TODO V2: cuando se lancen los templates de ManyChat, agregar aquí
// `sendBookingConfirmationWhatsApp({ phoneNumber, ... })` siguiendo el patrón
// de `lib/services/messages.service.ts`.
