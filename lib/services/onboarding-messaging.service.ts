// lib/services/onboarding-messaging.service.ts

import { prisma } from '@/lib/prisma'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Obtiene las capacitaciones disponibles en los próximos N días
 * IMPORTANTE: Solo muestra capacitaciones desde mañana en adelante (no incluye hoy)
 */
export async function getUpcomingOnboardingEvents(daysAhead: number = 7) {
  const now = new Date()
  // Comenzar desde mañana, no desde hoy
  const tomorrow = addDays(now, 1)
  const startDate = startOfDay(tomorrow)
  const endDate = endOfDay(addDays(tomorrow, daysAhead - 1))

  const events = await prisma.onboardingEvent.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      scheduledDate: 'asc',
    },
    select: {
      id: true,
      title: true,
      scheduledDate: true,
      startTime: true,
      endTime: true,
      location: true,
      locationAddress: true,
      maxCapacity: true,
      currentCapacity: true,
    },
  })

  return events
}

/**
 * Formatea el listado de capacitaciones para WhatsApp
 */
export function formatOnboardingEventsMessage(
  events: any[],
  driverName: string
): string {
  if (events.length === 0) {
    return `Hola ${driverName}! 👋

Por el momento no tenemos capacitaciones programadas en los próximos días.

Te avisaremos apenas tengamos nuevas fechas disponibles. ¡Seguimos en contacto! 😊`
  }

  const eventsList = events
    .map((event, index) => {
      const date = format(new Date(event.scheduledDate), "EEEE d 'de' MMMM", {
        locale: es,
      })
      const time = event.startTime

      return `${index + 1}. *${capitalize(date)} - ${time}*`
    })
    .join('\n')

  return `Hola ${driverName}! 👋

Finalizamos tu verificación y confirmamos que reunís todos los requisitos para ser Monchis Driver 🛵💨

¿Cómo estás? Te escribo para compartirte las capacitaciones disponibles en los próximos días:

${eventsList}

📅 Para reservar tu lugar, solo confirmame a qué fecha te gustaría asistir.

*Información importante:*

⏱ *Tolerancia máxima:* 10 minutos

💳 *Costo:* Gs. 100.000 en concepto de entrega de equipos (solo POS o transferencia, no efectivo)

¿Alguna de estas fechas te viene bien? 😊`
}

/**
 * Formatea el mensaje de recordatorio para conductores verificados que no se agendaron
 */
export function formatOnboardingReminderMessage(
  events: any[],
  driverName: string
): string {
  if (events.length === 0) {
    return `Hola ${driverName}! 👋

Te escribimos para recordarte que cumplís con los requisitos para ser repartidor en Monchis.

Por el momento no tenemos capacitaciones programadas en los próximos días, pero te avisaremos apenas tengamos nuevas fechas disponibles.

¡Seguimos en contacto! 😊`
  }

  const eventsList = events
    .map((event, index) => {
      const date = format(new Date(event.scheduledDate), "EEEE d 'de' MMMM", {
        locale: es,
      })
      const time = event.startTime

      return `${index + 1}. *${capitalize(date)} - ${time}*`
    })
    .join('\n')

  return `Hola ${driverName}! 👋

Te escribimos para recordarte que cumplís con los requisitos para ser repartidor en Monchis.

Te comparto las capacitaciones que tenemos disponibles actualmente:

${eventsList}

📅 Para reservar tu lugar, solo confirmame a qué fecha te gustaría asistir.

*Información importante:*

⏱ *Tolerancia máxima:* 10 minutos

💳 *Costo:* Gs. 100.000 en concepto de entrega de equipos (solo POS o transferencia, no efectivo)

¿Alguna de estas fechas te viene bien? 😊`
}

/**
 * Capitaliza la primera letra de un string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
