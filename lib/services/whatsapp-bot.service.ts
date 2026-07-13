// lib/services/whatsapp-bot.service.ts
//
// Capa fina sobre el bot WhatsApp (apps/whatsapp-bot/) corriendo en Railway.
// Reemplaza a `whatsapp-multi-bot.service.ts` con una interfaz single-tenant.
//
// El bot expone:
//   GET  /health, /qr-status, /connection-info
//   POST /send-message            { phone, message, type?, imageUrl? }
//   POST /send-contextual-message { phone, name, type, step?, metadata? }
//   POST /send-bulk               { messages: [...], delayMs? }
//   POST /logout                  (cierra sesión y muestra nuevo QR)

// Identificador estable para persistir en WhatsAppMessage.botId. Single-tenant,
// pero conservamos la columna por si vuelve multi-bot a futuro.
export const WHATSAPP_BOT_ID = 'whatsapp-bot' as const;

interface BotEnv {
  url: string;
  apiKey: string;
}

function getBotEnv(): BotEnv {
  // Solo server-side. NUNCA exponer WHATSAPP_BOT_API_KEY al cliente.
  const url = (process.env.WHATSAPP_BOT_URL || '').replace(/\/$/, '');
  const apiKey = process.env.WHATSAPP_BOT_API_KEY || '';
  return { url, apiKey };
}

function buildHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'x-api-key': apiKey } : {}),
  };
}

async function callBot<T>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown } = { method: 'GET' },
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const { url, apiKey } = getBotEnv();
  if (!url) {
    return { ok: false, status: 500, error: 'WHATSAPP_BOT_URL no configurado' };
  }

  try {
    const res = await fetch(`${url}${path}`, {
      method: init.method,
      headers: buildHeaders(apiKey),
      body: init.method === 'POST' ? JSON.stringify(init.body ?? {}) : undefined,
    });

    const text = await res.text();
    let parsed: any = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
    }

    if (!res.ok) {
      const errorMsg =
        parsed?.error || parsed?.message || `HTTP ${res.status} ${res.statusText}`;
      return { ok: false, status: res.status, error: errorMsg };
    }

    return { ok: true, data: parsed as T };
  } catch (err: any) {
    return { ok: false, status: 502, error: err?.message || 'Network error' };
  }
}

// ==================== TYPES ====================

export interface SendMessageParams {
  phone: string;
  message: string;
  type?: string;
  imageUrl?: string;
}

export interface SendContextualMessageParams {
  phone: string;
  name: string;
  type: string;
  step?: string;
  metadata?: Record<string, unknown>;
}

export interface BulkMessage {
  phone: string;
  message: string;
  type?: string;
  imageUrl?: string;
}

export interface BulkSendBotResult {
  phone: string;
  success: boolean;
  sentAt?: string;
  error?: string;
}

export interface BulkSendResponse {
  summary: { total: number; successful: number; failed: number };
  results: BulkSendBotResult[];
}

export interface BotStatus {
  status: 'connected' | 'qr_available' | 'initializing' | 'error';
  connected: boolean;
  qr?: string;
  generatedAt?: string;
  message?: string;
  timestamp?: string;
}

export interface ConnectionInfo {
  connected: boolean;
  phoneNumber?: string | null;
  displayName?: string | null;
  platform?: string | null;
}

export interface SendResponse {
  success: boolean;
  data?: {
    phone: string;
    chatId: string;
    type?: string;
    hasMedia?: boolean;
    sentAt: string;
    // Solo en /send-contextual-message:
    message?: string;
    messageLength?: number;
    name?: string;
    step?: string | null;
    responseTimeMs?: number;
  };
  error?: string;
}

// ==================== API ====================

// Guard de conexión: el bot whatsapp-web.js puede aceptar /send-message y
// responder OK aunque la sesión de WhatsApp esté DESCONECTADA — eso producía
// registros SENT falsos (el mensaje nunca se entregaba). Antes de cada envío
// verificamos que la sesión esté conectada. Cacheamos el estado unos segundos
// para no llamar /qr-status en cada mensaje de un loop de cron.
const CONN_CACHE_MS = 15_000;
let _connCache: { connected: boolean; at: number } | null = null;

async function isBotConnectedCached(): Promise<boolean> {
  const now = Date.now();
  if (_connCache && now - _connCache.at < CONN_CACHE_MS) return _connCache.connected;
  const st = await getStatus();
  _connCache = { connected: st.connected === true, at: now };
  return _connCache.connected;
}

const DISCONNECTED_ERROR = 'WhatsApp bot desconectado (sesión no conectada)';

export async function sendMessage(params: SendMessageParams): Promise<SendResponse> {
  if (!(await isBotConnectedCached())) {
    console.warn('[WHATSAPP_BOT] envío bloqueado: sesión desconectada', { phone: params.phone });
    return { success: false, error: DISCONNECTED_ERROR };
  }
  const result = await callBot<SendResponse>('/send-message', {
    method: 'POST',
    body: params,
  });
  if (!result.ok) return { success: false, error: result.error };
  return result.data;
}

export async function sendContextualMessage(
  params: SendContextualMessageParams,
): Promise<SendResponse> {
  if (!(await isBotConnectedCached())) {
    console.warn('[WHATSAPP_BOT] envío contextual bloqueado: sesión desconectada', { phone: params.phone });
    return { success: false, error: DISCONNECTED_ERROR };
  }
  const result = await callBot<SendResponse>('/send-contextual-message', {
    method: 'POST',
    body: params,
  });
  if (!result.ok) return { success: false, error: result.error };
  return result.data;
}

export async function sendBulk(
  messages: BulkMessage[],
  options?: { delayMs?: number },
): Promise<{ success: boolean; data?: BulkSendResponse; error?: string }> {
  const result = await callBot<BulkSendResponse>('/send-bulk', {
    method: 'POST',
    body: { messages, delayMs: options?.delayMs },
  });
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function getStatus(): Promise<BotStatus> {
  const result = await callBot<BotStatus>('/qr-status');
  if (!result.ok) {
    return { status: 'error', connected: false, message: result.error };
  }
  return result.data;
}

export async function getConnectionInfo(): Promise<ConnectionInfo> {
  const result = await callBot<ConnectionInfo>('/connection-info');
  if (!result.ok) return { connected: false };
  return result.data;
}

export async function logout(): Promise<{ success: boolean; error?: string }> {
  const result = await callBot<{ success: boolean; message: string }>('/logout', {
    method: 'POST',
  });
  if (!result.ok) return { success: false, error: result.error };
  return { success: result.data.success };
}

// ==================== EXPORT ====================

export const whatsappBotService = {
  sendMessage,
  sendContextualMessage,
  sendBulk,
  getStatus,
  getConnectionInfo,
  logout,
};
