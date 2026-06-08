// lib/services/onboarding-notifications.service.ts
//
// Wrapper de notificaciones para el flujo público de capacitaciones.
// Doble canal: email (Resend) + WhatsApp (bot). La audiencia es WhatsApp-first,
// así que WhatsApp es el principal y el email queda de respaldo.

import { Resend } from 'resend'
import { render } from '@react-email/render'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { WhatsAppMessageType, WhatsAppMessageSource } from '@prisma/client'
import BookingConfirmationEmail from '@/emails/booking-confirmation'
import {
  NOTIFICATIONS_CONFIG,
  getResendApiKey,
} from '@/lib/config/notifications.config'
import { messagesService } from '@/lib/services/messages.service'

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
  /** true si es una reprogramación (cambia el copy de "reservada" a "reagendada"). */
  isReschedule?: boolean
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
      subject: data.isReschedule
        ? `Tu capacitación ${data.ruleTitle} fue reagendada`
        : `Tu capacitación ${data.ruleTitle} está confirmada`,
      html,
    })
  } catch (err) {
    console.error('[onboarding-notifications] Failed to send confirmation email:', err)
    // No relanzamos: el booking ya quedó creado, el email es best-effort
  }
}

// ==================== WhatsApp: confirmación de reserva ====================

export interface BookingConfirmationWhatsAppData {
  phoneNumber: string | null
  driverFirstName: string | null
  formDriverId: string
  ruleTitle: string
  scheduledDateUTC: string
  startTime: string
  endTime: string
  modality: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID'
  location: string | null
  locationAddress: string | null
  meetingLink: string | null
  confirmationToken: string
  appBaseUrl: string
  /** true si es una reprogramación (cambia el copy de "reservada" a "reagendada"). */
  isReschedule?: boolean
}

/**
 * Formatea la fecha del evento a "lunes 25 de mayo" en español. Toma solo la
 * parte de fecha del ISO (sin conversión de timezone) para evitar off-by-one.
 */
function formatEventDate(scheduledDateUTC: string): string {
  const datePart = scheduledDateUTC.slice(0, 10) // YYYY-MM-DD
  const d = new Date(`${datePart}T12:00:00`)
  if (isNaN(d.getTime())) return ''
  const label = format(d, "EEEE d 'de' MMMM", { locale: es })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Manda la confirmación de reserva por WhatsApp (best-effort). Incluye fecha,
 * hora, lugar/link y el link de gestión (clave: única forma de volver a la
 * reserva sin re-identificarse). Persiste en WhatsAppMessage para el historial.
 */
export async function sendBookingConfirmationWhatsApp(
  data: BookingConfirmationWhatsAppData,
): Promise<void> {
  if (!data.phoneNumber) return // sin teléfono no hay nada que mandar

  const nombre = data.driverFirstName?.trim() || 'Hola'
  const fecha = formatEventDate(data.scheduledDateUTC)
  const manageUrl = `${data.appBaseUrl}/capacitaciones/reserva/${data.confirmationToken}`

  // Lugar según modalidad: presencial muestra dirección; virtual muestra link.
  let dondeLine: string
  if (data.modality === 'VIRTUAL' && data.meetingLink) {
    dondeLine = `Es virtual. Link de la reunión: ${data.meetingLink}`
  } else {
    const lugar = [data.location, data.locationAddress].filter(Boolean).join(' — ')
    dondeLine = lugar ? `Dónde: ${lugar}` : ''
  }

  const lines = [
    data.isReschedule
      ? `¡Listo ${nombre}! Reagendamos tu capacitación.`
      : `¡Buenas ${nombre}! Tu capacitación quedó reservada.`,
    '',
    `Cuándo: ${fecha}, de ${data.startTime} a ${data.endTime}`,
    dondeLine,
    '',
    'Llevá tu cédula y tu licencia de conducir.',
    '',
    'Si necesitás cambiar o cancelar tu reserva, entrá acá:',
    manageUrl,
  ].filter(line => line !== null && line !== undefined)

  const message = lines.join('\n').replace(/\n{3,}/g, '\n\n')

  try {
    await messagesService.sendWhatsAppMessage({
      phone: data.phoneNumber,
      name: nombre,
      type: WhatsAppMessageType.CAPACITACION_SELECTED,
      customMessage: message,
      formDriverId: data.formDriverId,
      source: WhatsAppMessageSource.TRIGGER,
      metadata: {
        flow: data.isReschedule ? 'booking_reschedule' : 'booking_confirmation',
        confirmationToken: data.confirmationToken,
        ruleTitle: data.ruleTitle,
      },
    })
  } catch (err) {
    // No relanzamos: la reserva ya quedó creada, el WhatsApp es best-effort.
    console.error('[onboarding-notifications] Failed to send WhatsApp confirmation:', err)
  }
}

// ==================== WhatsApp: cancelación de reserva ====================

export interface BookingCancellationWhatsAppData {
  phoneNumber: string | null
  driverFirstName: string | null
  formDriverId: string
  appBaseUrl: string
}

/**
 * Avisa por WhatsApp que la reserva se canceló e invita a reagendar (best-effort).
 * cancelBooking ya devolvió al driver a onboardingStatus=READY, así que el link a
 * /capacitaciones lo deja re-reservar. Devuelve true si se envió (para que el
 * caller registre el envío en el control de frecuencia y el cron no duplique).
 */
export async function sendBookingCancellationWhatsApp(
  data: BookingCancellationWhatsAppData,
): Promise<boolean> {
  if (!data.phoneNumber) return false

  const nombre = data.driverFirstName?.trim() || 'Hola'
  const message = [
    `Hola ${nombre}, cancelamos tu reserva de la capacitación de Monchis.`,
    '',
    'Cuando quieras podés elegir un nuevo día acá:',
    `${data.appBaseUrl}/capacitaciones`,
    '',
    'Cualquier duda, respondé este mensaje.',
  ].join('\n')

  try {
    const result = await messagesService.sendWhatsAppMessage({
      phone: data.phoneNumber,
      name: nombre,
      type: WhatsAppMessageType.CAPACITACION_CHANGED,
      customMessage: message,
      formDriverId: data.formDriverId,
      source: WhatsAppMessageSource.TRIGGER,
      metadata: { flow: 'booking_cancellation' },
    })
    return result.success
  } catch (err) {
    console.error('[onboarding-notifications] Failed to send WhatsApp cancellation:', err)
    return false
  }
}
