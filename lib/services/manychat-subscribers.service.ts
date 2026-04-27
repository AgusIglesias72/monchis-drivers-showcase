// lib/services/manychat-subscribers.service.ts

import type { FormDriver } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  createSubscriber,
  findSubscriberByCustomField,
  setCustomField,
  ManyChatError,
  type ManyChatSubscriber,
} from './manychat.service';

/**
 * Mapea un FormDriver a su subscriber correspondiente en ManyChat.
 *
 * Responsabilidades:
 * - Cacheo: si el FormDriver ya tiene `manychatSubscriberId`, devolverlo sin llamar a la API.
 * - Creación: si no existe, crear el subscriber vía API y persistir el ID.
 * - Fallback: si `createSubscriber` falla porque el subscriber ya existe (race o creación
 *   manual en la UI), resolverlo vía `findSubscriberByCustomField` sobre el mirror
 *   `whatsapp_phone`. Sin el mirror configurado no hay fallback posible.
 * - Espejo: al crear, setea el número E.164 en el custom field `whatsapp_phone_mirror`
 *   para que queries futuras puedan resolverlo por número.
 *
 * Env vars:
 * - MANYCHAT_WHATSAPP_PHONE_FIELD_ID: ID numérico del custom field espejo en ManyChat.
 *   Si no está, `getOrCreateManychatSubscriber` sigue funcionando (crea y persiste),
 *   pero pierde el fallback por "already exists" y el lookup por teléfono desde otro lado.
 * - MANYCHAT_CONSENT_PHRASE: frase exacta de consentimiento que el postulante aceptó
 *   en el form. Requerida por Meta para dar de alta un subscriber de WhatsApp.
 */

type FormDriverSubscriberFields = Pick<
  FormDriver,
  'id' | 'phoneNumber' | 'firstName' | 'lastName' | 'manychatSubscriberId'
>;

function getWhatsAppPhoneFieldId(): number | null {
  const raw = process.env.MANYCHAT_WHATSAPP_PHONE_FIELD_ID;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function getConsentPhrase(): string {
  return (
    process.env.MANYCHAT_CONSENT_PHRASE ||
    'Acepto recibir mensajes de WhatsApp de Monchis sobre mi postulación'
  );
}

/**
 * Normaliza un número a formato E.164 (`+<digits>`). Asume que el número ya incluye
 * código de país — no intenta inferirlo. Si `phoneNumber` del FormDriver viene en
 * formato local sin 595, este helper NO lo corrige.
 */
function normalizeE164(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) throw new Error('Teléfono vacío o inválido');
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Devuelve el manychatSubscriberId del FormDriver, creándolo en ManyChat si hace falta.
 * Idempotente: llamarla N veces con el mismo FormDriver produce el mismo ID.
 */
export async function getOrCreateManychatSubscriber(
  driver: FormDriverSubscriberFields
): Promise<string> {
  if (driver.manychatSubscriberId) {
    return driver.manychatSubscriberId;
  }

  const phone = normalizeE164(driver.phoneNumber);
  const mirrorFieldId = getWhatsAppPhoneFieldId();

  let subscriber: ManyChatSubscriber;

  try {
    subscriber = await createSubscriber({
      whatsappPhone: phone,
      consentPhrase: getConsentPhrase(),
      firstName: driver.firstName ?? undefined,
      lastName: driver.lastName ?? undefined,
    });
  } catch (err) {
    // Si el subscriber ya existe, resolverlo por el mirror field.
    if (err instanceof ManyChatError && isAlreadyExistsError(err) && mirrorFieldId) {
      const existing = await findSubscriberByCustomField(mirrorFieldId, phone);
      if (!existing) {
        console.error('[MANYCHAT_SUBSCRIBERS] createSubscriber reportó duplicado pero findByCustomField no lo encontró', {
          driverId: driver.id,
          phone,
        });
        throw err;
      }
      subscriber = existing;
    } else {
      throw err;
    }
  }

  // Espejar el teléfono en el custom field (best effort — si falla, seguimos).
  if (mirrorFieldId) {
    try {
      await setCustomField(subscriber.id, { id: mirrorFieldId }, phone);
    } catch (err) {
      console.error('[MANYCHAT_SUBSCRIBERS] setCustomField mirror falló (no bloqueante)', {
        subscriberId: subscriber.id,
        error: err instanceof Error ? err.message : err,
      });
    }
  }

  await prisma.formDriver.update({
    where: { id: driver.id },
    data: { manychatSubscriberId: subscriber.id },
  });

  console.log('[MANYCHAT_SUBSCRIBERS] subscriber vinculado', {
    driverId: driver.id,
    subscriberId: subscriber.id,
  });

  return subscriber.id;
}

function isAlreadyExistsError(err: ManyChatError): boolean {
  const msg = err.apiMessage.toLowerCase();
  return (
    err.httpStatus === 400 ||
    err.httpStatus === 409 ||
    msg.includes('already') ||
    msg.includes('exists') ||
    msg.includes('duplicate')
  );
}
