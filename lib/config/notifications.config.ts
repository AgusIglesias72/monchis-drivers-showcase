// lib/config/notifications.config.ts
//
// Configuración de notificaciones por email (Resend).
// Centraliza destinatarios, remitente y paleta de marca.

export interface NotificationsConfig {
  from: string
  replyTo: string
  // Destinatarios por tipo de notificación
  dailyReport: string[]        // Reporte diario de postulaciones (00hs)
  postulacionReady: string[]   // Aviso: postulación disponible para agendar
  processReports: string[]     // Reportes de pagos, bonos, conductores externos
}

export const NOTIFICATIONS_CONFIG: NotificationsConfig = {
  from: process.env.RESEND_FROM_EMAIL || 'Monchis Drivers <no-reply@monchisdrivers.com>',
  replyTo: process.env.RESEND_REPLY_TO || 'agustin.iglesias@itti.digital',

  dailyReport: [
    'agustin.iglesias@itti.digital',
    // TODO: agregar los 4 destinatarios finales del equipo admin
  ],

  postulacionReady: [
    'agustin.iglesias@itti.digital',
    // TODO: ajustar según el equipo que agenda capacitaciones
  ],

  processReports: [
    'agustin.iglesias@itti.digital',
  ],
}

// Paleta de marca Monchis (usada por los templates de email)
export const BRAND = {
  // Color principal (extraído del logo monchis-icon.svg)
  primary: '#e7224f',
  primaryDark: '#b8183e',
  primaryLight: '#fde7ec',

  // Neutros
  text: '#111827',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  bgCard: '#f9fafb',
  bgPage: '#ffffff',

  // Estados
  success: '#16a34a',
  successBg: '#f0fdf4',
  warning: '#d97706',
  warningBg: '#fffbeb',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  info: '#2563eb',
  infoBg: '#eff6ff',

  // Assets (servidos desde https://www.monchisdrivers.com/public)
  logoUrl: 'https://www.monchisdrivers.com/monchis-logo-red.png',       // logo a color (fondo blanco)
  logoWhiteUrl: 'https://www.monchisdrivers.com/monchis-logo-white.png', // logo blanco (fondo de color)
  iconUrl: 'https://www.monchisdrivers.com/monchis-icon.svg',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://www.monchisdrivers.com',
} as const

export function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    throw new Error('RESEND_API_KEY no está configurada en las variables de entorno')
  }
  return key
}
