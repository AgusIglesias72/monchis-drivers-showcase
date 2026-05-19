// lib/actions/quick-whatsapp.actions.ts
"use server"

import { prisma } from "@/lib/prisma"
import { whatsappBotService, WHATSAPP_BOT_ID } from "@/lib/services/whatsapp-bot.service"
import { WhatsAppMessageType, WhatsAppMessageSource } from "@prisma/client"
import { incrementTemplateUsage } from "@/lib/services/whatsapp-templates.service"

interface SendQuickWhatsAppMessageParams {
  driverId: string
  driverName: string
  phoneNumber: string
  message: string
  templateId?: string // ID de la plantilla usada (opcional)
}

export async function sendQuickWhatsAppMessage(params: SendQuickWhatsAppMessageParams) {
  try {
    const { driverId, driverName, phoneNumber, message, templateId } = params

    // Validar que el conductor existe
    const driver = await prisma.formDriver.findUnique({
      where: { id: driverId },
      select: { id: true, fullName: true, phoneNumber: true }
    })

    if (!driver) {
      return {
        success: false,
        error: "Conductor no encontrado"
      }
    }

    // Formatear número de teléfono (asegurar formato internacional)
    let formattedPhone = phoneNumber.trim()

    // Si no empieza con +, agregar +595 (Paraguay)
    if (!formattedPhone.startsWith('+')) {
      // Si empieza con 0, removerlo
      if (formattedPhone.startsWith('0')) {
        formattedPhone = formattedPhone.substring(1)
      }
      formattedPhone = `+595${formattedPhone}`
    }

    const botResponse = await whatsappBotService.sendMessage({
      phone: formattedPhone,
      message: message,
      type: 'custom',
    })

    if (!botResponse.success) {
      return {
        success: false,
        error: botResponse.error || "Error al enviar mensaje de WhatsApp"
      }
    }

    const chatId = `${formattedPhone.replace('+', '')}@c.us`

    await prisma.whatsAppMessage.create({
      data: {
        recipientPhone: formattedPhone,
        recipientName: driverName,
        chatId: chatId,
        messageType: WhatsAppMessageType.CUSTOM,
        message: message,
        messageLength: message.length,
        status: 'SENT',
        source: WhatsAppMessageSource.MANUAL,
        botId: WHATSAPP_BOT_ID,
        formDriverId: driverId,
        metadata: {
          sentBy: 'admin',
          messageCategory: 'quick_reply',
          templateId: templateId || null,
          sentAt: new Date().toISOString()
        }
      }
    })

    // Incrementar contador de uso de la plantilla
    if (templateId) {
      await incrementTemplateUsage(templateId)
    }

    return {
      success: true,
      message: "Mensaje enviado correctamente"
    }
  } catch (error) {
    console.error("Error in sendQuickWhatsAppMessage:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    }
  }
}
