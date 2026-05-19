// lib/services/whatsapp-multi-bot.service.ts
//
// Shim de compatibilidad para UI admin que aún espera la interfaz multi-bot.
// Tras la consolidación al bot único en apps/whatsapp-bot/, este archivo
// reexporta una interfaz equivalente pero delega TODO al bot único vía
// `whatsapp-bot.service.ts`. NO usar desde código nuevo.

import { whatsappBotService } from './whatsapp-bot.service'

export interface BotStatusResponse {
  botId: string
  status: 'connected' | 'disconnected' | 'initializing' | 'error'
  qr?: string
  generatedAt?: string
  connectionInfo?: {
    phoneNumber: string
    displayName: string
    platform: string
  }
  error?: string
}

export interface SendMessageParams {
  phone: string
  message: string
  type?: string
  imageUrl?: string
}

export interface SendContextualMessageParams {
  phone: string
  name: string
  type: string
  step?: string
  metadata?: Record<string, any>
}

export interface BotApiResponse {
  success: boolean
  data?: any
  error?: string
}

export interface AvailableBot {
  clientId: string
  ready: boolean
  name: string
}

function mapStatus(status: { status: string; connected: boolean }): BotStatusResponse['status'] {
  switch (status.status) {
    case 'connected':
      return 'connected'
    case 'qr_available':
      return 'disconnected'
    case 'initializing':
      return 'initializing'
    default:
      return 'error'
  }
}

export async function getBotStatus(_botId: string): Promise<BotStatusResponse> {
  const status = await whatsappBotService.getStatus()
  const connInfo = status.connected ? await whatsappBotService.getConnectionInfo() : null
  return {
    botId: 'whatsapp-bot',
    status: mapStatus(status),
    qr: status.qr,
    generatedAt: status.generatedAt,
    connectionInfo:
      connInfo && connInfo.connected
        ? {
            phoneNumber: connInfo.phoneNumber ?? '',
            displayName: connInfo.displayName ?? '',
            platform: connInfo.platform ?? '',
          }
        : undefined,
    error: status.status === 'error' ? status.message : undefined,
  }
}

export async function sendMessage(_botId: string, params: SendMessageParams): Promise<BotApiResponse> {
  const r = await whatsappBotService.sendMessage(params)
  return { success: r.success, data: r.data, error: r.error }
}

export async function sendMessageWithImage(_botId: string, params: { phone: string; message: string; imageUrl: string }): Promise<BotApiResponse> {
  return sendMessage('', params)
}

export async function sendContextualMessage(_botId: string, params: SendContextualMessageParams): Promise<BotApiResponse> {
  const r = await whatsappBotService.sendContextualMessage(params)
  return { success: r.success, data: r.data, error: r.error }
}

export async function logoutBot(_botId: string): Promise<BotApiResponse> {
  const r = await whatsappBotService.logout()
  return { success: r.success, error: r.error }
}

export async function restartBot(_botId: string): Promise<BotApiResponse> {
  // No hay endpoint /restart en el bot single-tenant. Logout fuerza re-init y
  // genera nuevo QR, que es lo que esperaban los call sites del legacy.
  return logoutBot('')
}

export async function getAvailableBots(): Promise<AvailableBot[]> {
  const status = await whatsappBotService.getStatus()
  if (!status.connected) return []
  return [{ clientId: 'whatsapp-bot', ready: true, name: 'Bot WhatsApp' }]
}

export const whatsappMultiBotService = {
  getBotStatus,
  sendMessage,
  sendMessageWithImage,
  sendContextualMessage,
  logoutBot,
  restartBot,
  getAvailableBots,
}
