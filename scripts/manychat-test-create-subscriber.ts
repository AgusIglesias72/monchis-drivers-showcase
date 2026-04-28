// scripts/manychat-test-create-subscriber.ts
//
// Prueba `createSubscriber` contra la API de ManyChat con un teléfono nuevo.
// Sirve para validar que el bot tiene habilitado el permiso de import vía API
// (sin eso, el cron de recordatorios no podrá crear contactos para postulantes
// que nunca escribieron al bot primero).
//
// Uso:
//   npx tsx scripts/manychat-test-create-subscriber.ts <phoneE164> [firstName] [lastName]
//
// Ejemplos:
//   npx tsx scripts/manychat-test-create-subscriber.ts +595981234567
//   npx tsx scripts/manychat-test-create-subscriber.ts +595981234567 Juan Pérez
//
// El teléfono DEBE estar en formato E.164 con `+` y código de país.
// El número que pases tiene que NO existir todavía en ManyChat (si existe, va a
// devolver "already exists" — usá otro).

import 'dotenv/config';
import {
  createSubscriber,
  ManyChatError,
} from '../lib/services/manychat.service';

const phone = process.argv[2];
const firstName = process.argv[3] || 'Test';
const lastName = process.argv[4] || 'Contact';
const consentPhrase =
  process.env.MANYCHAT_CONSENT_PHRASE ||
  'Acepto recibir mensajes de WhatsApp de Monchis sobre mi postulación';

if (!phone) {
  console.error('Falta el teléfono.\n');
  console.error('Uso: npx tsx scripts/manychat-test-create-subscriber.ts <phoneE164> [firstName] [lastName]');
  console.error('Ej:  npx tsx scripts/manychat-test-create-subscriber.ts +595981234567 Juan Pérez');
  process.exit(1);
}

if (!phone.startsWith('+')) {
  console.error(`El teléfono "${phone}" no empieza con "+". Usá formato E.164 (ej. +595981234567).`);
  process.exit(1);
}

if (!process.env.MANYCHAT_API_TOKEN) {
  console.error('MANYCHAT_API_TOKEN no está configurado en .env');
  process.exit(1);
}

async function main() {
  console.log(`[TEST] createSubscriber:`);
  console.log(`        phone:          ${phone}`);
  console.log(`        first_name:     ${firstName}`);
  console.log(`        last_name:      ${lastName}`);
  console.log(`        consent_phrase: "${consentPhrase}"`);
  console.log('');

  try {
    const sub = await createSubscriber({
      whatsappPhone: phone!,
      consentPhrase,
      firstName,
      lastName,
    });
    console.log('[TEST] OK — subscriber creado:');
    console.log(`        id:             ${sub.id}`);
    console.log(`        whatsapp_phone: ${sub.whatsapp_phone ?? '(no devuelto)'}`);
    console.log(`        first_name:     ${sub.first_name ?? '(no devuelto)'}`);
    console.log('');
    console.log('   Verificá en ManyChat → Audience → buscá el número.');
    console.log('   Si querés borrarlo después de la prueba, hacelo desde la UI.');
  } catch (err) {
    if (err instanceof ManyChatError) {
      console.error(`[TEST] FALLÓ — ManyChat respondió HTTP ${err.httpStatus}`);
      console.error(`        message: ${err.apiMessage}`);
      if (err.details) console.error('        details:', err.details);

      const msg = err.apiMessage.toLowerCase();
      console.error('');
      if (msg.includes('permission') && msg.includes('wa_id')) {
        console.error('   Diagnóstico: la cuenta de ManyChat NO tiene habilitado el permiso para importar contactos');
        console.error('   de WhatsApp vía API. Sin esto, el cron de recordatorios no va a poder crear subscribers');
        console.error('   para postulantes que nunca le escribieron al bot.');
        console.error('   Solución: ManyChat → Settings → WhatsApp → buscar el toggle de "Import contacts via API"');
        console.error('   (puede llamarse distinto), o contactar al soporte de ManyChat para habilitarlo.');
      } else if (msg.includes('already')) {
        console.error('   Diagnóstico: ese teléfono ya existe como subscriber en ManyChat. Probá con otro.');
      } else if (msg.includes('consent')) {
        console.error('   Diagnóstico: la consent_phrase no fue aceptada. Verificá MANYCHAT_CONSENT_PHRASE en .env');
        console.error('   y asegurate de que coincida con el texto que el postulante aceptó.');
      }
    } else {
      console.error('[TEST] Error inesperado:', err);
    }
    process.exit(1);
  }
}

void main();
