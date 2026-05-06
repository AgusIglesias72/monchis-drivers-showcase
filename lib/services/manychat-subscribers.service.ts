// lib/services/manychat-subscribers.service.ts

import type { FormDriver } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  createSubscriber,
  findSubscriberByCustomField,
  findSubscriberBySystemField,
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
 * Normaliza un número a formato E.164 (`+<digits>`) asumiendo Paraguay por defecto.
 * Acepta formatos comunes:
 *   - `0981234567` (local con 0) → `+595981234567`
 *   - `981234567`  (local sin 0) → `+595981234567`
 *   - `595981234567` (con código país) → `+595981234567`
 *   - `+595981234567` (ya E.164) → `+595981234567`
 * Si el número ya empieza con otro código de país (54 Argentina, etc) se respeta.
 *
 * ManyChat rechaza con 400 "Validation error" si recibe un E.164 inválido (ej `+0981...`).
 */
function normalizeE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) throw new Error('Teléfono vacío o inválido');

  // Ya tiene código país explícito reconocido → respetar.
  if (digits.startsWith('595')) return `+${digits}`;
  if (digits.startsWith('54') && digits.length >= 12) return `+${digits}`;

  // Formato local PY con 0 inicial: 0981234567 (10 dígitos).
  if (digits.startsWith('0') && digits.length === 10) {
    return `+595${digits.substring(1)}`;
  }

  // Formato local PY sin 0: 981234567 (9 dígitos).
  if (digits.length === 9) {
    return `+595${digits}`;
  }

  // Largo suficiente para asumir código país de otro lado → respetar.
  if (digits.length >= 12) return `+${digits}`;

  // Fallback: asumimos PY.
  return `+595${digits}`;
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
    if (!(err instanceof ManyChatError) || !isAlreadyExistsError(err)) {
      throw err;
    }

    // Subscriber duplicado en ManyChat (creado manualmente o por código viejo).
    // Hay que encontrarlo y vincularlo. Probamos varios caminos porque dependiendo
    // de cómo nació el subscriber, puede o no tener el custom field espejo seteado.
    const phoneNoPlus = phone.replace(/^\+/, '');
    const found = await locateExistingSubscriber({
      mirrorFieldId,
      phoneE164: phone,
      phoneNoPlus,
    });

    if (!found) {
      console.error(
        '[MANYCHAT_SUBSCRIBERS] subscriber duplicado pero no resoluble vía findBy*',
        {
          driverId: driver.id,
          phone,
          mirrorFieldId,
          apiDetails: err.details,
        }
      );
      throw new ManyChatError(
        err.httpStatus,
        `Subscriber ya existe en ManyChat (${phone}) pero no se puede resolver automáticamente. ` +
          `Verifica que MANYCHAT_WHATSAPP_PHONE_FIELD_ID esté configurado y que el subscriber existente tenga ese custom field populado, ` +
          `o vinculá manualmente el manychatSubscriberId al FormDriver desde el panel.`,
        err.details
      );
    }
    subscriber = found;
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
  // ManyChat tira 400 "Validation error" como apiMessage genérico y mete el motivo
  // real en err.details — ej:
  //   { messages: { wa_id: { message: ["This WhatsApp ID already exists: 5959..."] } } }
  // Antes mirábamos sólo apiMessage, así que perdíamos este caso (que es justo el
  // que necesita el fallback findByCustomField).
  if (err.httpStatus === 409) return true;

  const haystack = (err.apiMessage + ' ' + safeStringify(err.details)).toLowerCase();
  return (
    haystack.includes('already exists') ||
    haystack.includes('already') ||
    haystack.includes('duplicate') ||
    haystack.includes('subscriber with this phone') ||
    haystack.includes('whatsapp id already')
  );
}

function safeStringify(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * Resuelve un subscriber existente probando, en orden:
 * 1. Custom field espejo (`whatsapp_phone_mirror`) con E.164 — el caso normal.
 * 2. Custom field espejo sin `+` — para subscribers viejos que se guardaron sin el `+`.
 * 3. System field `phone` — best effort; la API oficial avisa que rara vez funciona
 *    con subscribers solo-WhatsApp, pero costo cero probar.
 * Si nada matchea, devuelve null y el caller decide qué hacer.
 */
async function locateExistingSubscriber(params: {
  mirrorFieldId: number | null;
  phoneE164: string;
  phoneNoPlus: string;
}): Promise<ManyChatSubscriber | null> {
  const { mirrorFieldId, phoneE164, phoneNoPlus } = params;

  if (mirrorFieldId) {
    const byMirrorE164 = await findSubscriberByCustomField(mirrorFieldId, phoneE164);
    if (byMirrorE164) return byMirrorE164;

    const byMirrorNoPlus = await findSubscriberByCustomField(mirrorFieldId, phoneNoPlus);
    if (byMirrorNoPlus) return byMirrorNoPlus;
  }

  const bySystem = await findSubscriberBySystemField('phone', phoneE164);
  if (bySystem) return bySystem;

  return null;
}
