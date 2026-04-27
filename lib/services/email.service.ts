// lib/services/email.service.ts
//
// Servicio de envío de emails vía Resend + React Email.
// Las firmas de las funciones existentes se mantienen para no romper callers.

import { Resend } from 'resend'
import ProcessCompletedEmail from '@/emails/process-completed'
import ProcessFailedEmail from '@/emails/process-failed'
import BonusCompletedEmail from '@/emails/bonus-completed'
import DailyPostulacionesReportEmail from '@/emails/daily-postulaciones-report'
import {
  NOTIFICATIONS_CONFIG,
  getResendApiKey,
} from '@/lib/config/notifications.config'
import type { DailyReportData } from './daily-report.service'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(getResendApiKey())
  return _resend
}

// Deduplica destinatarios (por si alguien pasa un email que ya está en el default)
function dedupeEmails(...lists: string[][]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of lists) {
    for (const email of list) {
      const norm = email.trim().toLowerCase()
      if (norm && !seen.has(norm)) {
        seen.add(norm)
        out.push(email.trim())
      }
    }
  }
  return out
}

export const emailService = {
  async sendProcessCompletedEmail(data: {
    startDate: string
    endDate: string
    reportsStats?: {
      totalRows: number
      dataRows: number
      processedRanges: number
    }
    driversStats?: {
      successful: number
      failed: number
      total: number
      errors?: Array<{ driver: string; error: string }>
    }
    spreadsheetUrl?: string
    notificationEmails?: string[]
  }): Promise<void> {
    try {
      const to = dedupeEmails(
        NOTIFICATIONS_CONFIG.processReports,
        data.notificationEmails || []
      )

      const { data: result, error } = await getResend().emails.send({
        from: NOTIFICATIONS_CONFIG.from,
        to,
        replyTo: NOTIFICATIONS_CONFIG.replyTo,
        subject: `Proceso completado: ${data.startDate} al ${data.endDate}`,
        react: ProcessCompletedEmail({
          startDate: data.startDate,
          endDate: data.endDate,
          reportsStats: data.reportsStats,
          driversStats: data.driversStats,
          spreadsheetUrl: data.spreadsheetUrl,
        }),
      })

      if (error) {
        console.error('❌ Error enviando email (proceso completado):', error)
        return
      }
      console.log(`✅ Email "proceso completado" enviado [${result?.id}] a: ${to.join(', ')}`)
    } catch (err: any) {
      console.error('❌ Excepción enviando email:', err.message)
    }
  },

  async sendProcessFailedEmail(data: {
    startDate: string
    endDate: string
    error: string
    notificationEmails?: string[]
  }): Promise<void> {
    try {
      const to = dedupeEmails(
        NOTIFICATIONS_CONFIG.processReports,
        data.notificationEmails || []
      )

      const { data: result, error } = await getResend().emails.send({
        from: NOTIFICATIONS_CONFIG.from,
        to,
        replyTo: NOTIFICATIONS_CONFIG.replyTo,
        subject: `❌ Proceso fallido: ${data.startDate} al ${data.endDate}`,
        react: ProcessFailedEmail({
          startDate: data.startDate,
          endDate: data.endDate,
          error: data.error,
        }),
      })

      if (error) {
        console.error('❌ Error enviando email (proceso fallido):', error)
        return
      }
      console.log(`✅ Email "proceso fallido" enviado [${result?.id}] a: ${to.join(', ')}`)
    } catch (err: any) {
      console.error('❌ Excepción enviando email de error:', err.message)
    }
  },

  async sendBonusProcessCompletedEmail(data: {
    bonusDate: string
    executionMode: 'DRY_RUN' | 'EXECUTE'
    stats: {
      totalOrders: number
      driversProcessed: number
      extrasCreated: number
      assignmentsSuccessful: number
      assignmentsFailed: number
      totalPayoutAmount: number
    }
    errors?: Array<{ driver: string; error: string }>
    notificationEmails?: string[]
  }): Promise<void> {
    try {
      const to = dedupeEmails(
        NOTIFICATIONS_CONFIG.processReports,
        data.notificationEmails || []
      )

      const subjectPrefix = data.executionMode === 'DRY_RUN' ? '[DRY RUN] ' : ''
      const { data: result, error } = await getResend().emails.send({
        from: NOTIFICATIONS_CONFIG.from,
        to,
        replyTo: NOTIFICATIONS_CONFIG.replyTo,
        subject: `${subjectPrefix}Bonos ${data.bonusDate} — ${data.stats.driversProcessed} conductores`,
        react: BonusCompletedEmail({
          bonusDate: data.bonusDate,
          executionMode: data.executionMode,
          stats: data.stats,
          errors: data.errors,
        }),
      })

      if (error) {
        console.error('❌ Error enviando email (bonos):', error)
        return
      }
      console.log(`✅ Email "bonos" enviado [${result?.id}] a: ${to.join(', ')}`)
    } catch (err: any) {
      console.error('❌ Excepción enviando email de bonos:', err.message)
    }
  },

  /**
   * Envía el reporte diario de postulaciones (cron a las 00hs Paraguay).
   */
  async sendDailyPostulacionesReport(params: {
    data: DailyReportData
    notificationEmails?: string[]
  }): Promise<{ id?: string; error?: string }> {
    try {
      const to = dedupeEmails(
        NOTIFICATIONS_CONFIG.dailyReport,
        params.notificationEmails || []
      )

      const dateStr = params.data.reportDate.toLocaleDateString('es-PY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })

      const { data, error } = await getResend().emails.send({
        from: NOTIFICATIONS_CONFIG.from,
        to,
        replyTo: NOTIFICATIONS_CONFIG.replyTo,
        subject: `📋 Reporte diario ${dateStr} — ${params.data.newPostulaciones} postulaciones nuevas`,
        react: DailyPostulacionesReportEmail({ data: params.data }),
      })

      if (error) {
        console.error('❌ Error enviando reporte diario:', error)
        return { error: String(error) }
      }
      console.log(`✅ Reporte diario enviado [${data?.id}] a: ${to.join(', ')}`)
      return { id: data?.id }
    } catch (err: any) {
      console.error('❌ Excepción enviando reporte diario:', err.message)
      return { error: err.message }
    }
  },
}
