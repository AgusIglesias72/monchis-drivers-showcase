import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import {
  initializeWhatsApp,
  getClient,
  isClientReady,
  formatPhoneNumber,
  logoutAndReinit,
} from './whatsapp.js';
import { handleIncomingMessage } from './messageHandler.js';
import {
  generateContextualMessage,
  isValidMessageType,
  getValidMessageTypes,
  getMessageTypeInfo,
} from './messageTemplates.js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '5mb' }));

// CORS configurable: ALLOWED_ORIGINS es coma-separado. Default cubre dev local
// + prod en Vercel; agregar dominio custom (ej. monchis-drivers.com) por env var.
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://monchis-drivers.vercel.app',
];
const allowedOrigins = (process.env.ALLOWED_ORIGINS || defaultOrigins.join(','))
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

const PORT = process.env.PORT || 3000;
const VERCEL_WEBHOOK_URL = process.env.VERCEL_WEBHOOK_URL;
const API_KEY = process.env.API_KEY;

function verifyApiKey(req, res, next) {
  if (!API_KEY) return next(); // dev mode sin key
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'API Key inválida o faltante' });
  }
  next();
}

// ===== ESTADO QR (in-memory) =====
let currentQRCode = null;
let qrTimestamp = null;

console.log('🚀 Iniciando servidor del bot de WhatsApp...\n');

initializeWhatsApp(message => {
  handleIncomingMessage(message, VERCEL_WEBHOOK_URL);
});

function bindQrEvents() {
  const c = getClient();
  if (!c) return;
  c.on('qr', qr => {
    currentQRCode = qr;
    qrTimestamp = new Date().toISOString();
    console.log('📱 QR Code disponible en /qr-status');
  });
  c.on('ready', () => {
    currentQRCode = null;
    qrTimestamp = null;
  });
  c.on('authenticated', () => {
    currentQRCode = null;
    qrTimestamp = null;
  });
}
bindQrEvents();

// ===== ENDPOINTS =====

app.get('/', (req, res) => {
  res.json({
    service: 'WhatsApp Bot - Monchis Drivers',
    version: '2.0.0',
    status: isClientReady() ? 'connected' : 'disconnected',
    endpoints: [
      'GET  /health',
      'GET  /qr-status',
      'GET  /connection-info',
      'POST /logout',
      'POST /send-message',
      'POST /send-contextual-message',
      'POST /send-bulk',
      'GET  /message-types',
    ],
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    whatsappReady: isClientReady(),
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/qr-status', (req, res) => {
  if (isClientReady()) {
    return res.json({
      status: 'connected',
      connected: true,
      qr: null,
      message: 'WhatsApp ya está conectado',
      timestamp: new Date().toISOString(),
    });
  }
  if (currentQRCode) {
    return res.json({
      status: 'qr_available',
      connected: false,
      qr: currentQRCode,
      generatedAt: qrTimestamp,
      message: 'Escanea este QR para conectar WhatsApp',
      timestamp: new Date().toISOString(),
    });
  }
  return res.json({
    status: 'initializing',
    connected: false,
    qr: null,
    message: 'Inicializando WhatsApp, espera unos segundos...',
    timestamp: new Date().toISOString(),
  });
});

app.get('/connection-info', (req, res) => {
  const client = getClient();
  if (!isClientReady() || !client) {
    return res.json({ connected: false });
  }
  const info = client.info || {};
  res.json({
    connected: true,
    phoneNumber: info.wid?.user || null,
    displayName: info.pushname || null,
    platform: info.platform || null,
  });
});

app.post('/logout', verifyApiKey, async (req, res) => {
  try {
    console.log('🔄 /logout solicitado — cerrando sesión y reinicializando');
    currentQRCode = null;
    qrTimestamp = null;
    await logoutAndReinit(message => handleIncomingMessage(message, VERCEL_WEBHOOK_URL));
    bindQrEvents();
    res.json({
      success: true,
      message: 'Sesión cerrada. Esperar nuevo QR en /qr-status',
    });
  } catch (error) {
    console.error('❌ Error en /logout:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /send-message
 * Body: { phone, message, type?, imageUrl? }
 * Si imageUrl está presente, envía con MessageMedia y `message` va como caption.
 */
app.post('/send-message', verifyApiKey, async (req, res) => {
  try {
    const { phone, message, type, imageUrl } = req.body;

    if (!phone || (!message && !imageUrl)) {
      return res.status(400).json({
        error: 'Parámetros faltantes',
        required: ['phone', 'message (o imageUrl)'],
      });
    }
    if (!isClientReady()) {
      return res.status(503).json({
        error: 'WhatsApp no está conectado todavía',
      });
    }

    const client = getClient();
    const chatId = formatPhoneNumber(phone);

    if (imageUrl) {
      const { MessageMedia } = await import('whatsapp-web.js');
      const media = await MessageMedia.fromUrl(imageUrl);
      await client.sendMessage(chatId, media, { caption: message || '' });
    } else {
      await client.sendMessage(chatId, message);
    }

    console.log(`✅ Mensaje enviado a ${phone}${type ? ` (${type})` : ''}`);

    res.json({
      success: true,
      data: {
        phone,
        chatId,
        type: type || 'general',
        hasMedia: !!imageUrl,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Error en /send-message:', error);
    if (error.message?.includes('phone number is not registered')) {
      return res.status(400).json({
        error: 'Número no registrado en WhatsApp',
        phone: req.body.phone,
      });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /send-contextual-message
 * Body: { phone, name, type, step?, metadata? }
 * Genera el mensaje desde template predefinido y lo envía. La mayoría de los
 * call sites del Next ya pasan el mensaje armado via /send-message; este
 * endpoint queda como utility para templates simples manejados por el bot.
 */
app.post('/send-contextual-message', verifyApiKey, async (req, res) => {
  try {
    const { phone, name, type, step, metadata } = req.body;

    if (!phone || !name || !type) {
      return res.status(400).json({
        error: 'Parámetros faltantes',
        required: ['phone', 'name', 'type'],
      });
    }
    if (!isValidMessageType(type)) {
      return res.status(400).json({
        error: `Tipo de mensaje no válido: ${type}`,
        validTypes: getValidMessageTypes(),
      });
    }
    if (type === 'form_incomplete' && !step) {
      return res.status(400).json({
        error: 'step requerido para form_incomplete',
      });
    }
    if (!isClientReady()) {
      return res.status(503).json({ error: 'WhatsApp no está conectado todavía' });
    }

    const message = generateContextualMessage(type, name, step, metadata || {});
    if (!message) {
      return res.status(500).json({ error: 'No se pudo generar el mensaje' });
    }

    const client = getClient();
    const chatId = formatPhoneNumber(phone);
    const t0 = Date.now();
    await client.sendMessage(chatId, message);

    res.json({
      success: true,
      data: {
        phone,
        chatId,
        name,
        type,
        step: step || null,
        message,
        sentAt: new Date().toISOString(),
        responseTimeMs: Date.now() - t0,
      },
    });
  } catch (error) {
    console.error('❌ Error en /send-contextual-message:', error);
    if (error.message?.includes('phone number is not registered')) {
      return res.status(400).json({
        error: 'Número no registrado en WhatsApp',
        phone: req.body.phone,
      });
    }
    res.status(500).json({ error: error.message });
  }
});

app.get('/message-types', verifyApiKey, (req, res) => {
  const types = getValidMessageTypes();
  res.json({
    availableTypes: types,
    details: types.map(t => ({ type: t, info: getMessageTypeInfo(t) })),
  });
});

/**
 * POST /send-bulk
 * Body: { messages: [{ phone, message, type?, imageUrl? }], delayMs? }
 */
app.post('/send-bulk', verifyApiKey, async (req, res) => {
  try {
    const { messages, delayMs } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Se requiere array messages no vacío' });
    }
    if (!isClientReady()) {
      return res.status(503).json({ error: 'WhatsApp no está conectado todavía' });
    }

    const client = getClient();
    const results = [];
    // Delay mínimo entre mensajes para mitigar riesgo de ban en envíos masivos.
    const minDelay = typeof delayMs === 'number' && delayMs >= 0 ? delayMs : 2000;

    console.log(`📤 Bulk: enviando ${messages.length} mensajes (delay ${minDelay}ms)`);

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      try {
        if (!msg.phone || (!msg.message && !msg.imageUrl)) {
          results.push({
            phone: msg.phone || 'unknown',
            success: false,
            error: 'Faltan phone o message/imageUrl',
          });
          continue;
        }
        const chatId = formatPhoneNumber(msg.phone);
        if (msg.imageUrl) {
          const { MessageMedia } = await import('whatsapp-web.js');
          const media = await MessageMedia.fromUrl(msg.imageUrl);
          await client.sendMessage(chatId, media, { caption: msg.message || '' });
        } else {
          await client.sendMessage(chatId, msg.message);
        }
        results.push({
          phone: msg.phone,
          success: true,
          sentAt: new Date().toISOString(),
        });
        console.log(`✅ [${i + 1}/${messages.length}] ${msg.phone}`);

        if (i < messages.length - 1) {
          // Jitter pequeño para no parecer un bot perfecto.
          const delay = minDelay + Math.random() * 1000;
          await new Promise(r => setTimeout(r, delay));
        }
      } catch (error) {
        results.push({
          phone: msg.phone,
          success: false,
          error: error.message,
        });
        console.error(`❌ [${i + 1}/${messages.length}] ${msg.phone}: ${error.message}`);
      }
    }

    const successful = results.filter(r => r.success).length;
    res.json({
      summary: {
        total: messages.length,
        successful,
        failed: messages.length - successful,
      },
      results,
    });
  } catch (error) {
    console.error('❌ Error en /send-bulk:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);
  res.status(500).json({ error: 'Error interno', message: err.message });
});

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 Webhook entrante → ${VERCEL_WEBHOOK_URL || 'no configurado'}`);
  console.log(`🔐 API Key: ${API_KEY ? '✅' : '⚠️  no configurada (modo dev)'}`);
  console.log(`🌐 CORS allowed: ${allowedOrigins.join(', ')}`);
  console.log(`${'='.repeat(50)}\n`);
});

async function gracefulShutdown(signal) {
  console.log(`\n⚠️  ${signal} recibido, cerrando...`);
  const client = getClient();
  if (client) {
    try {
      await client.destroy();
    } catch (e) {
      console.error('Error destruyendo client:', e.message);
    }
  }
  process.exit(0);
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
