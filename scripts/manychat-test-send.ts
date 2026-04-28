// scripts/manychat-test-send.ts
//
// Script de prueba para mandar un mensaje a un subscriber de ManyChat vía API.
//
// Uso:
//   npx tsx scripts/manychat-test-send.ts <subscriberId> ["texto libre"]
//   npx tsx scripts/manychat-test-send.ts <subscriberId> <flow_ns> --flow
//
// Modo "texto libre" (default): manda un mensaje de texto. SOLO funciona dentro de
// la ventana de servicio de 24h. Para abrirla, mandá un mensaje desde tu WhatsApp
// al número del bot (+15754194027) ANTES de correr este script.
//
// Modo "--flow": dispara un Flow ya creado en ManyChat. Funciona también fuera de
// ventana 24h si el Flow envuelve un template Meta aprobado.
//
// Cómo conseguir tu subscriberId:
//   1) Mandá "hola" al +15754194027 desde tu WhatsApp (eso te crea el subscriber).
//   2) En ManyChat UI → Audience → buscá tu nombre/número → abrí el contacto.
//   3) El subscriber_id aparece en la URL o en el panel de details.

import 'dotenv/config';
import {
  sendContent,
  sendFlow,
  ManyChatError,
} from '../lib/services/manychat.service';

const subscriberId = process.argv[2];
const messageOrFlow = process.argv[3];
const isFlowMode = process.argv.includes('--flow');

if (!subscriberId) {
  console.error('Falta subscriberId.\n');
  console.error('Uso:');
  console.error('  npx tsx scripts/manychat-test-send.ts <subscriberId> "<texto>"');
  console.error('  npx tsx scripts/manychat-test-send.ts <subscriberId> <flow_ns> --flow');
  process.exit(1);
}

if (!process.env.MANYCHAT_API_TOKEN) {
  console.error('MANYCHAT_API_TOKEN no está configurado en .env');
  process.exit(1);
}

async function main() {
  try {
    if (isFlowMode) {
      if (!messageOrFlow) {
        console.error('Modo --flow requiere un flow_ns como segundo argumento.');
        process.exit(1);
      }
      console.log(`[TEST] Disparando flow "${messageOrFlow}" a subscriber ${subscriberId}...`);
      await sendFlow(subscriberId, messageOrFlow);
      console.log('[TEST] OK — flow enviado');
      return;
    }

    const text =
      messageOrFlow || `Test desde monchis-drivers - ${new Date().toISOString()}`;
    console.log(`[TEST] Mandando texto a subscriber ${subscriberId}:`);
    console.log(`        "${text}"`);
    await sendContent(subscriberId!, [{ type: 'text', text }]);
    console.log('[TEST] OK — mensaje enviado');
  } catch (err) {
    if (err instanceof ManyChatError) {
      console.error(`[TEST] ManyChat respondió error (HTTP ${err.httpStatus}):`);
      console.error(`        ${err.apiMessage}`);
      if (err.details) console.error('        details:', err.details);
      // Hint común: sendContent fuera de ventana 24h.
      if (err.apiMessage.toLowerCase().includes('message tag')) {
        console.error(
          '\n   Hint: el subscriber NO tiene una ventana 24h abierta. Mandá un mensaje\n' +
          '   desde tu WhatsApp al bot primero, después correr este script de nuevo.'
        );
      }
    } else {
      console.error('[TEST] Error inesperado:', err);
    }
    process.exit(1);
  }
}

void main();
