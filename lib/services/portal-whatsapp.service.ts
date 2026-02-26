// lib/services/portal-whatsapp.service.ts
import { sendWhatsAppMessage, type SendWhatsAppMessageParams } from './messages.service'
import { WhatsAppMessageType, WhatsAppMessageSource } from '@prisma/client'

/**
 * Obtiene la URL base del portal
 */
function getPortalBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://app.monchis.com'
}

/**
 * Construye la URL del portal para un token específico
 */
function buildPortalUrl(accessToken: string): string {
  const baseUrl = getPortalBaseUrl()
  return `${baseUrl}/postulacion/${accessToken}`
}

/**
 * Envía mensaje de bienvenida con link del portal (al completar formulario)
 */
export async function sendPortalAccessInitial(
  phone: string,
  firstName: string,
  accessToken: string,
  formDriverId: string
) {
  const portalUrl = buildPortalUrl(accessToken)

  const message = `¡Hola ${firstName}! 👋

Recibimos tu postulación exitosamente.

Podés ver el estado de tu postulación y gestionar tus documentos desde tu portal personalizado:

👉 ${portalUrl}

Desde ahí podrás:
✅ Ver el estado de tus documentos
✅ Actualizar tu información
✅ Seleccionar tu fecha de capacitación (cuando tus documentos estén aprobados)

¿Tenés dudas? Respondé este mensaje.

¡Bienvenido! 🚗`

  return sendWhatsAppMessage({
    phone,
    name: firstName,
    type: WhatsAppMessageType.PORTAL_ACCESS_INITIAL,
    customMessage: message,
    formDriverId,
    source: WhatsAppMessageSource.TRIGGER,
    metadata: {
      portalUrl,
      accessToken,
    },
  })
}

/**
 * Envía mensaje para corregir documento rechazado
 */
export async function sendPortalDocumentFix(
  phone: string,
  firstName: string,
  accessToken: string,
  formDriverId: string,
  documentType: string,
  rejectionReason: string
) {
  const portalUrl = buildPortalUrl(accessToken)

  const message = `Hola ${firstName},

Revisamos tu documento *${documentType}* y necesitamos que lo actualices.

📌 Motivo: ${rejectionReason}

Ingresá a tu portal para subir el documento correcto:
👉 ${portalUrl}

También podés actualizar cualquier otro dato si es necesario.

¿Necesitás ayuda? Respondé este mensaje.`

  return sendWhatsAppMessage({
    phone,
    name: firstName,
    type: WhatsAppMessageType.PORTAL_ACCESS_DOCUMENT_FIX,
    customMessage: message,
    formDriverId,
    source: WhatsAppMessageSource.TRIGGER,
    metadata: {
      portalUrl,
      accessToken,
      documentType,
      rejectionReason,
    },
  })
}

/**
 * Envía mensaje para seleccionar capacitación (al aprobar todos los documentos)
 */
export async function sendPortalSelectCapacitacion(
  phone: string,
  firstName: string,
  accessToken: string,
  formDriverId: string
) {
  const portalUrl = buildPortalUrl(accessToken)

  const message = `¡Excelente ${firstName}! ✅

Todos tus documentos fueron aprobados. Ya podés seleccionar tu fecha de capacitación.

📅 Seleccioná tu fecha aquí:
👉 ${portalUrl}

Tenemos eventos disponibles todos los días de la semana. Elegí el que mejor te quede.

¡Te esperamos! 💪`

  return sendWhatsAppMessage({
    phone,
    name: firstName,
    type: WhatsAppMessageType.PORTAL_SELECT_CAPACITACION,
    customMessage: message,
    formDriverId,
    source: WhatsAppMessageSource.TRIGGER,
    metadata: {
      portalUrl,
      accessToken,
    },
  })
}

/**
 * Envía confirmación de capacitación seleccionada
 */
export async function sendCapacitacionSelected(
  phone: string,
  firstName: string,
  accessToken: string,
  formDriverId: string,
  eventDetails: {
    scheduledDate: Date
    startTime: string
    endTime?: string
    location: string
    locationAddress: string
    meetingLink?: string | null
  }
) {
  const portalUrl = buildPortalUrl(accessToken)

  const formattedDate = new Date(eventDetails.scheduledDate).toLocaleDateString('es-PY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const timeRange = eventDetails.endTime
    ? `${eventDetails.startTime} - ${eventDetails.endTime}`
    : eventDetails.startTime

  let message = `¡Perfecto ${firstName}! 📅

Tu capacitación está confirmada:

📍 Fecha: ${formattedDate}
🕐 Hora: ${timeRange}
📌 Lugar: ${eventDetails.location}
${eventDetails.locationAddress}`

  if (eventDetails.meetingLink) {
    message += `\n\n🔗 Link de reunión: ${eventDetails.meetingLink}`
  }

  message += `\n\n💡 Si necesitás cambiar la fecha, podés hacerlo desde tu portal:
${portalUrl}

¡Nos vemos pronto! 🚗`

  return sendWhatsAppMessage({
    phone,
    name: firstName,
    type: WhatsAppMessageType.CAPACITACION_SELECTED,
    customMessage: message,
    formDriverId,
    source: WhatsAppMessageSource.TRIGGER,
    metadata: {
      portalUrl,
      accessToken,
      ...eventDetails,
    },
  })
}

/**
 * Envía confirmación de cambio de capacitación
 */
export async function sendCapacitacionChanged(
  phone: string,
  firstName: string,
  formDriverId: string,
  previousEvent: {
    scheduledDate: Date
    startTime: string
  },
  newEvent: {
    scheduledDate: Date
    startTime: string
    endTime?: string
    location: string
    locationAddress: string
    meetingLink?: string | null
  }
) {
  const prevDate = new Date(previousEvent.scheduledDate).toLocaleDateString('es-PY', {
    day: 'numeric',
    month: 'long',
  })

  const newDate = new Date(newEvent.scheduledDate).toLocaleDateString('es-PY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const newTimeRange = newEvent.endTime
    ? `${newEvent.startTime} - ${newEvent.endTime}`
    : newEvent.startTime

  let message = `Hola ${firstName},

Confirmamos el cambio de tu capacitación:

❌ Fecha anterior: ${prevDate} ${previousEvent.startTime}

✅ Nueva fecha: ${newDate}
🕐 Hora: ${newTimeRange}
📌 Lugar: ${newEvent.location}
${newEvent.locationAddress}`

  if (newEvent.meetingLink) {
    message += `\n\n🔗 Link de reunión: ${newEvent.meetingLink}`
  }

  message += `\n\nTodo listo. ¡Nos vemos! 💪`

  return sendWhatsAppMessage({
    phone,
    name: firstName,
    type: WhatsAppMessageType.CAPACITACION_CHANGED,
    customMessage: message,
    formDriverId,
    source: WhatsAppMessageSource.TRIGGER,
    metadata: {
      previousEvent,
      newEvent,
    },
  })
}
