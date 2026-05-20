import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';

const DATA_PATH = './.wwebjs_auth';

let client = null;
let isReady = false;

/**
 * Borra los lock files de Chromium que pudo dejar un deploy anterior en el
 * volumen persistente. Sin esto, el nuevo contenedor falla con
 * "The profile appears to be in use by another Chromium process" porque el
 * lock quedó stale (el proceso que lo creó ya no existe — perdió el volumen).
 */
function clearChromiumLocks(dataPath) {
  const lockNames = new Set(['SingletonLock', 'SingletonSocket', 'SingletonCookie']);
  const walk = dir => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (lockNames.has(entry.name) || entry.name.startsWith('SingletonLock')) {
        try {
          fs.unlinkSync(full);
          console.log('🔓 Lock de Chromium borrado:', full);
        } catch {
          /* ignore */
        }
      }
    }
  };
  walk(dataPath);
}

// Puppeteer trae su propio Chromium (matchea exacto con la versión de la lib).
// Solo seteamos executablePath si PUPPETEER_EXECUTABLE_PATH viene del entorno
// (override manual); por defecto dejamos que puppeteer use el suyo.
function buildPuppeteerConfig() {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  return {
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-features=AudioServiceOutOfProcess',
    ],
  };
}

function attachListeners(c, onMessageReceived) {
  c.on('qr', qr => {
    console.log('\n🔐 ===== ESCANEA ESTE QR CON WHATSAPP =====\n');
    qrcode.generate(qr, { small: true });
    console.log('\n📱 WhatsApp > Dispositivos vinculados > Vincular dispositivo');
    console.log('⏳ Esperando escaneo...\n');
  });

  c.on('ready', () => {
    console.log('✅ WhatsApp Bot conectado y listo');
    console.log(`📞 Conectado como: ${c.info?.pushname || 'unknown'}`);
    console.log(`📱 Número: ${c.info?.wid?.user || 'unknown'}`);
    isReady = true;
  });

  c.on('authenticated', () => {
    console.log('🔓 Autenticación exitosa');
  });

  c.on('auth_failure', msg => {
    console.error('❌ Error de autenticación:', msg);
    isReady = false;
  });

  c.on('message', async message => {
    const isGroup = message.from.includes('@g.us');
    console.log('📨 Mensaje recibido:', {
      from: message.from,
      fromName: message._data?.notifyName || 'Desconocido',
      body: message.body,
      isGroup,
      timestamp: new Date(),
    });
    if (onMessageReceived) {
      try {
        await onMessageReceived(message);
      } catch (error) {
        console.error('Error en callback de mensaje:', error);
      }
    }
  });

  c.on('disconnected', reason => {
    console.log('❌ Cliente desconectado:', reason);
    isReady = false;
    console.log('🔄 whatsapp-web.js intentará reconectar automáticamente');
  });

  c.on('loading_screen', (percent, message) => {
    console.log(`⏳ Cargando... ${percent}% — ${message}`);
  });
}

/**
 * Inicializa el cliente de WhatsApp con LocalAuth.
 * onMessageReceived: callback cuando llega un mensaje entrante.
 */
export function initializeWhatsApp(onMessageReceived) {
  // Limpiar locks stale de Chromium de deploys anteriores (volumen persistente).
  clearChromiumLocks(DATA_PATH);

  client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'whatsapp-bot-main',
      dataPath: DATA_PATH,
    }),
    puppeteer: buildPuppeteerConfig(),
    webVersionCache: {
      type: 'remote',
      remotePath:
        'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1039829830-alpha.html',
    },
  });

  attachListeners(client, onMessageReceived);

  console.log('🚀 Inicializando cliente de WhatsApp con LocalAuth...');
  console.log('💾 Sesión se guarda en ./.wwebjs_auth');
  // initialize() es async: si rechaza (Chromium, sesión corrupta, etc.) lo
  // capturamos para NO tumbar el proceso. El server Express sigue vivo y el
  // healthcheck pasa; el cliente reintenta o se reconecta solo.
  client.initialize().catch(err => {
    console.error('❌ client.initialize() falló:', err?.message || err);
    isReady = false;
  });

  return client;
}

/**
 * Cierra sesión, borra credenciales locales y reinicializa con un nuevo QR.
 * Útil para rotar el número o desbloquear una sesión rota.
 */
export async function logoutAndReinit(onMessageReceived) {
  if (client) {
    try {
      // logout() invalida la sesión en WhatsApp Web; destroy() libera puppeteer.
      await client.logout().catch(err => {
        console.warn('client.logout() falló, sigo con destroy():', err.message);
      });
      await client.destroy();
    } catch (err) {
      console.warn('Error cerrando client previo:', err.message);
    }
  }
  isReady = false;
  client = null;
  initializeWhatsApp(onMessageReceived);
}

export function getClient() {
  return client;
}

export function isClientReady() {
  return isReady;
}

/**
 * Resuelve el chatId real de un número validando que tenga WhatsApp.
 * Devuelve { ok: true, chatId } si existe, o { ok: false } si el número no
 * está registrado / está mal escrito. Usa getNumberId de WA (más confiable que
 * construir @c.us a mano, sobre todo con el formato @lid de números nuevos).
 */
export async function resolveChatId(phone) {
  const raw = String(phone).replace(/\D/g, '');
  if (!raw || raw.length < 8) return { ok: false, reason: 'invalid_format' };
  try {
    const numberId = await client.getNumberId(raw);
    if (!numberId) return { ok: false, reason: 'not_registered' };
    return { ok: true, chatId: numberId._serialized };
  } catch (err) {
    console.warn('getNumberId falló:', err?.message);
    return { ok: false, reason: 'lookup_failed' };
  }
}

/**
 * Formatea un número al formato @c.us de WhatsApp.
 * Acepta con/sin código de país; default Argentina (54). Para Paraguay (595),
 * MX (52), etc., el caller debe pasar el código incluido.
 */
export function formatPhoneNumber(phone) {
  let cleanPhone = String(phone).replace(/\D/g, '');
  if (!cleanPhone.startsWith('54') && cleanPhone.length === 10) {
    cleanPhone = '54' + cleanPhone;
  }
  if (!cleanPhone.includes('@c.us')) {
    cleanPhone = cleanPhone + '@c.us';
  }
  return cleanPhone;
}
