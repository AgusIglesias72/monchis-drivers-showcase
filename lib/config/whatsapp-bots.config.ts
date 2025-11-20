// lib/config/whatsapp-bots.config.ts

/**
 * Configuración centralizada de bots de WhatsApp
 * Cada bot puede tener diferentes URLs, API keys y tipos de mensajes
 */

export interface BotConfig {
  id: string;
  name: string;
  description: string;
  urlKey: string; // Variable de entorno para URL (NEXT_PUBLIC)
  apiKeyKey: string; // Variable de entorno para API key (server-side)
  color: string; // Color para UI
  icon: string; // Emoji o símbolo
  messageTypes: string[]; // Tipos de mensaje que maneja
  status?: 'active' | 'inactive' | 'maintenance';
}

export const WHATSAPP_BOTS_CONFIG: Record<string, BotConfig> = {
  'bot-adquisicion-prod': {
    id: 'bot-adquisicion-prod',
    name: 'Bot de Adquisición',
    description: 'Maneja postulaciones y formularios de nuevos drivers',
    urlKey: 'NEXT_PUBLIC_WHATSAPP_BOT_ADQUISICION_URL',
    apiKeyKey: 'WHATSAPP_BOT_ADQUISICION_API_KEY',
    color: 'blue',
    icon: '👥',
    messageTypes: [
      'APPLICATION_RECEIVED',
      'FORM_INCOMPLETE',
      'CUSTOM',
    ],
    status: 'active',
  },
  'bot-reactivacion-prod': {
    id: 'bot-reactivacion-prod',
    name: 'Bot de Reactivación',
    description: 'Maneja recordatorios y seguimiento de drivers inactivos',
    urlKey: 'NEXT_PUBLIC_WHATSAPP_BOT_REACTIVACION_URL',
    apiKeyKey: 'WHATSAPP_BOT_REACTIVACION_API_KEY',
    color: 'green',
    icon: '🔄',
    messageTypes: [
      'REACTIVATION_REMINDER',
      'INCENTIVE_NOTIFICATION',
      'CUSTOM',
    ],
    status: 'active',
  },
} as const;

// Helper para obtener la configuración de un bot
export function getBotConfig(botId: string): BotConfig | undefined {
  return WHATSAPP_BOTS_CONFIG[botId];
}

// Helper para obtener todos los bots activos
export function getActiveBots(): BotConfig[] {
  return Object.values(WHATSAPP_BOTS_CONFIG).filter(
    (bot) => bot.status === 'active'
  );
}

// Helper para obtener URL y API key de un bot (SERVER SIDE ONLY)
export function getBotCredentials(botId: string) {
  const config = getBotConfig(botId);
  if (!config) {
    return { url: '', apiKey: '' };
  }

  // En servidor, acceder directamente a las variables
  const url = process.env[config.urlKey] || '';
  const apiKey = process.env[config.apiKeyKey] || '';

  return { url, apiKey };
}

// ✅ Helper para obtener URL de un bot (CLIENT + SERVER SAFE)
export function getBotUrl(botId: string): string {
  const config = getBotConfig(botId);
  if (!config) return '';
  
  // ✅ CRÍTICO: Acceder directamente a la variable específica
  // Next.js solo expone variables NEXT_PUBLIC_* al cliente
  switch (botId) {
    case 'bot-adquisicion-prod':
      return process.env.NEXT_PUBLIC_WHATSAPP_BOT_ADQUISICION_URL || '';
    case 'bot-reactivacion-prod':
      return process.env.NEXT_PUBLIC_WHATSAPP_BOT_REACTIVACION_URL || '';
    default:
      return '';
  }
}

// ✅ Helper para obtener API Key pública (CLIENT SAFE)
export function getBotApiKey(): string {
  // Usar una API key compartida para todos los bots (solo lectura)
  return process.env.NEXT_PUBLIC_WHATSAPP_BOT_API_KEY || '';
}

// Tipos para TypeScript
export type BotId = keyof typeof WHATSAPP_BOTS_CONFIG;
export type MessageType = string;