// lib/config/whatsapp-bots.config.ts
//
// Shim de compatibilidad para UI admin que aún referencia el modelo multi-bot.
// Tras la consolidación al bot único en apps/whatsapp-bot/ este archivo expone
// un solo bot ("whatsapp-bot") para no romper componentes legacy mientras se
// terminan de simplificar. Las API/Services del backend usan
// `lib/services/whatsapp-bot.service.ts` directamente — NO importar este config
// desde código nuevo.

export interface BotConfig {
  id: string
  name: string
  description: string
  urlKey: string
  apiKeyKey: string
  color: string
  icon: string
  messageTypes: string[]
  status?: 'active' | 'inactive' | 'maintenance'
}

export const WHATSAPP_BOTS_CONFIG: Record<string, BotConfig> = {
  'whatsapp-bot': {
    id: 'whatsapp-bot',
    name: 'Bot WhatsApp',
    description: 'Bot único corriendo en apps/whatsapp-bot/ (Railway)',
    urlKey: 'WHATSAPP_BOT_URL',
    apiKeyKey: 'WHATSAPP_BOT_API_KEY',
    color: 'green',
    icon: '💬',
    messageTypes: [
      'APPLICATION_RECEIVED',
      'FORM_INCOMPLETE',
      'CAPACITATION_NO_SHOW',
      'REACTIVATION_REMINDER',
      'INCENTIVE_NOTIFICATION',
      'CUSTOM',
    ],
    status: 'active',
  },
}

export function getBotConfig(_botId?: string): BotConfig | undefined {
  return WHATSAPP_BOTS_CONFIG['whatsapp-bot']
}

export function getActiveBots(): BotConfig[] {
  return [WHATSAPP_BOTS_CONFIG['whatsapp-bot']]
}

export function getBotUrl(_botId?: string): string {
  return (
    process.env.WHATSAPP_BOT_URL ||
    process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL ||
    ''
  )
}

export function getBotApiKey(): string {
  return process.env.WHATSAPP_BOT_API_KEY || ''
}

export function getBotCredentials(_botId?: string) {
  return { url: getBotUrl(), apiKey: getBotApiKey() }
}

export function getAllBotConfigs() {
  return Object.values(WHATSAPP_BOTS_CONFIG)
}

// BotId queda como string para que componentes existentes sigan compilando sin
// cambios. El valor canónico es 'whatsapp-bot'.
export type BotId = string
export type MessageType = string
