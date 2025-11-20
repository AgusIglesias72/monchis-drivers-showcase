// lib/services/whatsapp-multi-bot.service.ts

import { getBotUrl, getBotApiKey, type BotId } from '@/lib/config/whatsapp-bots.config';

// ==================== TYPES ====================

export interface BotStatusResponse {
  botId: string;
  status: 'connected' | 'disconnected' | 'initializing' | 'error';
  qr?: string;
  generatedAt?: string;
  connectionInfo?: {
    phoneNumber: string;
    displayName: string;
    platform: string;
  };
  error?: string;
}

export interface SendMessageParams {
  phone: string;
  message: string;
  type?: string;
}

export interface SendContextualMessageParams {
  phone: string;
  name: string;
  type: string;
  step?: string;
  metadata?: Record<string, any>;
}

export interface BotApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Crea headers comunes para las peticiones
 */
function getCommonHeaders(): HeadersInit {
  const apiKey = getBotApiKey();
  
  return {
    'Content-Type': 'application/json',
    ...(apiKey && { 'x-api-key': apiKey }),
  };
}

/**
 * Maneja errores de fetch
 */
async function handleFetchError(response: Response, context: string): Promise<never> {
  const errorText = await response.text().catch(() => 'Unknown error');
  console.error(`Error in ${context}:`, {
    status: response.status,
    statusText: response.statusText,
    error: errorText,
  });
  
  throw new Error(`API Error (${response.status}): ${errorText}`);
}

// ==================== BOT STATUS ====================

/**
 * Obtiene el estado de un bot específico
 */
export async function getBotStatus(botId: BotId): Promise<BotStatusResponse> {
  try {
    const botUrl = getBotUrl(botId);
    
    if (!botUrl) {
      return {
        botId,
        status: 'error',
        error: 'URL del bot no configurada',
      };
    }

    const response = await fetch(`${botUrl}/qr/${botId}`, {
      method: 'GET',
      headers: getCommonHeaders(),
    });

    if (!response.ok) {
      await handleFetchError(response, 'getBotStatus');
    }

    const data = await response.json();

    // Mapear respuesta del backend a nuestro formato
    return {
      botId: data.botId || botId,
      status: mapBackendStatus(data.status),
      qr: data.qr,
      generatedAt: data.generatedAt,
      connectionInfo: data.connectionInfo,
    };
  } catch (error) {
    console.error('Error getting bot status:', error);
    return {
      botId,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mapea el status del backend a nuestro formato
 */
function mapBackendStatus(backendStatus: string): BotStatusResponse['status'] {
  switch (backendStatus) {
    case 'connected':
      return 'connected';
    case 'qr_available':
      return 'disconnected';
    case 'initializing':
      return 'initializing';
    default:
      return 'error';
  }
}

// ==================== SEND MESSAGES ====================

/**
 * Envía un mensaje simple
 */
export async function sendMessage(
  botId: BotId,
  params: SendMessageParams
): Promise<BotApiResponse> {
  try {
    const botUrl = getBotUrl(botId);
    
    if (!botUrl) {
      return {
        success: false,
        error: 'URL del bot no configurada',
      };
    }

    const response = await fetch(`${botUrl}/send-message`, {
      method: 'POST',
      headers: getCommonHeaders(),
      body: JSON.stringify({
        ...params,
        botId,
      }),
    });

    if (!response.ok) {
      await handleFetchError(response, 'sendMessage');
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Envía un mensaje contextual (con plantilla)
 */
export async function sendContextualMessage(
  botId: BotId,
  params: SendContextualMessageParams
): Promise<BotApiResponse> {
  try {
    const botUrl = getBotUrl(botId);
    
    if (!botUrl) {
      return {
        success: false,
        error: 'URL del bot no configurada',
      };
    }

    const response = await fetch(`${botUrl}/send-contextual-message`, {
      method: 'POST',
      headers: getCommonHeaders(),
      body: JSON.stringify({
        ...params,
        botId,
      }),
    });

    if (!response.ok) {
      await handleFetchError(response, 'sendContextualMessage');
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error sending contextual message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==================== BOT MANAGEMENT ====================

/**
 * Cierra sesión de un bot (logout + elimina sesión de MongoDB + genera nuevo QR)
 * 
 * ⚠️ IMPORTANTE: Este método usa /restart/:botId/fresh que:
 * 1. Cierra el cliente actual
 * 2. Elimina la sesión de MongoDB
 * 3. Reinicia el bot
 * 4. Genera un NUEVO QR (la sesión anterior queda invalidada)
 */
export async function logoutBot(botId: BotId): Promise<BotApiResponse> {
  try {
    const botUrl = getBotUrl(botId);
    
    if (!botUrl) {
      return {
        success: false,
        error: 'URL del bot no configurada',
      };
    }

    console.log(`🔄 Cerrando sesión de ${botId}...`);

    // ✅ Usar /restart/:botId/fresh en lugar de /logout
    // Este endpoint elimina la sesión de MongoDB y genera nuevo QR
    const response = await fetch(`${botUrl}/restart/${botId}/fresh`, {
      method: 'POST',
      headers: getCommonHeaders(),
    });

    if (!response.ok) {
      await handleFetchError(response, 'logoutBot');
    }

    const data = await response.json();
    
    console.log(`✅ Sesión cerrada correctamente:`, data);
    
    return { 
      success: true, 
      data: {
        ...data,
        message: 'Sesión cerrada. Se generará un nuevo QR en unos segundos.'
      }
    };
  } catch (error) {
    console.error('Error logging out bot:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reinicia un bot (mantiene la sesión si existe en MongoDB)
 */
export async function restartBot(botId: BotId): Promise<BotApiResponse> {
  try {
    const botUrl = getBotUrl(botId);
    
    if (!botUrl) {
      return {
        success: false,
        error: 'URL del bot no configurada',
      };
    }

    const response = await fetch(`${botUrl}/restart/${botId}`, {
      method: 'POST',
      headers: getCommonHeaders(),
    });

    if (!response.ok) {
      await handleFetchError(response, 'restartBot');
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error restarting bot:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==================== EXPORT SERVICE ====================

export const whatsappMultiBotService = {
  getBotStatus,
  sendMessage,
  sendContextualMessage,
  logoutBot,
  restartBot,
};