import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

let client = null;
let isReady = false;

// En Railway el chromium del sistema vive en /usr/bin/chromium. Si está seteado
// PUPPETEER_EXECUTABLE_PATH (Docker), preferirlo.
function buildPuppeteerConfig() {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
  return {
    headless: true,
    executablePath,
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
  client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'whatsapp-bot-main',
      dataPath: './.wwebjs_auth',
    }),
    puppeteer: buildPuppeteerConfig(),
    webVersionCache: {
      type: 'remote',
      remotePath:
        'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
  });

  attachListeners(client, onMessageReceived);

  console.log('🚀 Inicializando cliente de WhatsApp con LocalAuth...');
  console.log('💾 Sesión se guarda en ./.wwebjs_auth');
  client.initialize();

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
