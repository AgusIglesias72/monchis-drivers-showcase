export interface BrazeConfig {
  apiKey: string
  restEndpoint: string
  timeout: number
}

export const BRAZE_CONFIG: BrazeConfig = {
  apiKey: process.env.BRAZE_API_KEY || '',
  restEndpoint: process.env.BRAZE_REST_ENDPOINT || 'https://rest.iad-01.braze.com',
  timeout: 30000, // 30 segundos
}

export function getBrazeApiKey(): string {
  const apiKey = BRAZE_CONFIG.apiKey

  if (!apiKey) {
    throw new Error('BRAZE_API_KEY no está configurada en las variables de entorno')
  }

  return apiKey
}

export function getBrazeRestEndpoint(): string {
  return BRAZE_CONFIG.restEndpoint
}

export function validateBrazeConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!BRAZE_CONFIG.apiKey) {
    errors.push('BRAZE_API_KEY no configurada')
  }

  if (!BRAZE_CONFIG.restEndpoint) {
    errors.push('BRAZE_REST_ENDPOINT no configurada')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export const BRAZE_ENDPOINTS = {
  CAMPAIGNS_TRIGGER_SEND: '/campaigns/trigger/send',
  CANVAS_TRIGGER_SEND: '/canvas/trigger/send',
  USERS_TRACK: '/users/track',
  USERS_IDENTIFY: '/users/identify',
} as const
