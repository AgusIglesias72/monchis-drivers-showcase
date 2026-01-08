// lib/actions/send-onboarding-list.actions.ts
"use server"

import { auth } from "@clerk/nextjs/server"
import { sendQuickWhatsAppMessage } from "./quick-whatsapp.actions"
import {
  getUpcomingOnboardingEvents,
  formatOnboardingEventsMessage,
  formatOnboardingReminderMessage,
} from "@/lib/services/onboarding-messaging.service"

interface SendOnboardingListParams {
  driverId: string
  driverName: string
  phoneNumber: string
}

/**
 * Envía un mensaje con el listado de capacitaciones disponibles
 */
export async function sendOnboardingListMessage(params: SendOnboardingListParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: "No autorizado",
      }
    }

    // Obtener capacitaciones disponibles en los próximos 7 días
    const events = await getUpcomingOnboardingEvents(7)

    // Formatear el mensaje
    const message = formatOnboardingEventsMessage(events, params.driverName)

    // Enviar mensaje por WhatsApp
    const result = await sendQuickWhatsAppMessage({
      driverId: params.driverId,
      driverName: params.driverName,
      phoneNumber: params.phoneNumber,
      message,
      // No usamos templateId porque es un mensaje dinámico generado en tiempo real
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Error al enviar mensaje",
      }
    }

    return {
      success: true,
      message: "Mensaje con capacitaciones enviado correctamente",
      eventsCount: events.length,
    }
  } catch (error) {
    console.error("Error sending onboarding list message:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

/**
 * Envía un mensaje de recordatorio con el listado de capacitaciones
 * Para conductores que ya fueron verificados pero no se agendaron
 */
export async function sendOnboardingReminderMessage(params: SendOnboardingListParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: "No autorizado",
      }
    }

    // Obtener capacitaciones disponibles en los próximos 7 días
    const events = await getUpcomingOnboardingEvents(7)

    // Formatear el mensaje de recordatorio
    const message = formatOnboardingReminderMessage(events, params.driverName)

    // Enviar mensaje por WhatsApp
    const result = await sendQuickWhatsAppMessage({
      driverId: params.driverId,
      driverName: params.driverName,
      phoneNumber: params.phoneNumber,
      message,
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Error al enviar mensaje",
      }
    }

    return {
      success: true,
      message: "Recordatorio con capacitaciones enviado correctamente",
      eventsCount: events.length,
    }
  } catch (error) {
    console.error("Error sending onboarding reminder message:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}
