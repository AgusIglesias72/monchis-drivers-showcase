// lib/actions/link-manychat-subscriber.actions.ts
//
// Vinculación manual de un FormDriver con un subscriber existente en ManyChat.
// Necesario para drivers legacy: el subscriber ya existe en ManyChat (creado
// manualmente o por código antiguo) pero ManyChat no expone forma de buscarlo
// por teléfono cuando es solo-WhatsApp y no tiene mirror custom field.
//
// El admin abre ManyChat → encuentra al subscriber → copia el ID → lo pega
// acá. Validamos contra la API que existe antes de guardar.

'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import {
  getSubscriberInfo,
  setCustomField,
  ManyChatError,
} from '@/lib/services/manychat.service'

export interface LinkManychatSubscriberParams {
  driverId: string
  subscriberId: string
}

export type LinkManychatSubscriberResult =
  | {
      success: true
      subscriberId: string
      subscriberName?: string
      subscriberPhone?: string
    }
  | { success: false; error: string }

function getMirrorFieldId(): number | null {
  const raw = process.env.MANYCHAT_WHATSAPP_PHONE_FIELD_ID
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function normalizeSubscriberId(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  // Aceptamos tanto el ID directo (ej "123456789") como una URL de ManyChat
  // que contenga el subscriber ID. Ej:
  //   https://app.manychat.com/fb<page>/users/123456789
  //   https://manychat.com/subscriber/123456789
  const urlMatch = trimmed.match(/(?:users?|subscribers?)\/(\d+)/)
  if (urlMatch) return urlMatch[1]

  // Solo dígitos (con espacios/separadores tolerados).
  const digitsOnly = trimmed.replace(/\D/g, '')
  return digitsOnly
}

export async function linkManychatSubscriber(
  params: LinkManychatSubscriberParams,
): Promise<LinkManychatSubscriberResult> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: 'No autorizado' }

    const subscriberId = normalizeSubscriberId(params.subscriberId)
    if (!subscriberId) {
      return { success: false, error: 'ID de subscriber vacío o inválido' }
    }
    if (!/^\d{5,}$/.test(subscriberId)) {
      return {
        success: false,
        error: 'El subscriber ID debe ser numérico (mínimo 5 dígitos). Pegá el ID o la URL del subscriber desde ManyChat.',
      }
    }

    const driver = await prisma.formDriver.findUnique({
      where: { id: params.driverId },
      select: { id: true, phoneNumber: true, manychatSubscriberId: true },
    })
    if (!driver) return { success: false, error: 'Postulante no encontrado' }

    // Validar que el subscriber existe en ManyChat antes de guardar.
    let subscriberInfo
    try {
      subscriberInfo = await getSubscriberInfo(subscriberId)
    } catch (err) {
      if (err instanceof ManyChatError) {
        return {
          success: false,
          error: `ManyChat no encontró ese subscriber ID: ${err.apiMessage}`,
        }
      }
      throw err
    }

    // Sanity check: que el teléfono del subscriber sea similar al del driver.
    // Si no coincide, igual permitimos (el admin sabrá), pero loggeamos.
    const driverDigits = driver.phoneNumber.replace(/\D/g, '')
    const subscriberPhone = subscriberInfo.whatsapp_phone ?? subscriberInfo.phone ?? ''
    const subscriberDigits = subscriberPhone.replace(/\D/g, '')
    const phoneMismatch =
      subscriberDigits.length > 0 &&
      driverDigits.length > 0 &&
      !subscriberDigits.endsWith(driverDigits.slice(-9)) &&
      !driverDigits.endsWith(subscriberDigits.slice(-9))

    if (phoneMismatch) {
      console.warn('[LINK_MANYCHAT] phone mismatch (vinculando igual)', {
        driverId: driver.id,
        driverPhone: driver.phoneNumber,
        subscriberPhone,
      })
    }

    // Popular el mirror field si está configurado, así futuros lookups por
    // findByCustomField funcionan automáticamente.
    const mirrorFieldId = getMirrorFieldId()
    if (mirrorFieldId) {
      const e164 = driverDigits.startsWith('595')
        ? `+${driverDigits}`
        : driverDigits.startsWith('0') && driverDigits.length === 10
          ? `+595${driverDigits.substring(1)}`
          : driverDigits.length === 9
            ? `+595${driverDigits}`
            : `+${driverDigits}`
      try {
        await setCustomField(subscriberId, { id: mirrorFieldId }, e164)
      } catch (err) {
        console.warn('[LINK_MANYCHAT] setCustomField mirror falló (no bloqueante)', {
          subscriberId,
          error: err instanceof Error ? err.message : err,
        })
      }
    }

    await prisma.formDriver.update({
      where: { id: driver.id },
      data: { manychatSubscriberId: subscriberId },
    })

    console.log('[LINK_MANYCHAT] subscriber vinculado manualmente', {
      driverId: driver.id,
      subscriberId,
      linkedBy: userId,
    })

    return {
      success: true,
      subscriberId,
      subscriberName:
        subscriberInfo.name ||
        [subscriberInfo.first_name, subscriberInfo.last_name].filter(Boolean).join(' ') ||
        undefined,
      subscriberPhone: subscriberPhone || undefined,
    }
  } catch (err) {
    console.error('[LINK_MANYCHAT] excepción no esperada', {
      driverId: params.driverId,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    })
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado en el servidor',
    }
  }
}
