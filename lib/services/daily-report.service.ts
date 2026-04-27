// lib/services/daily-report.service.ts
//
// Calcula las métricas del reporte diario de postulaciones que se envía a las 00hs.

import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns'
import type { FormDriverStatus } from '@prisma/client'

export interface NewPostulacionBrief {
  id: string
  fullName: string
  phoneNumber: string
  status: FormDriverStatus
  createdAt: Date
  adminUrl: string
}

export interface DailyReportData {
  reportDate: Date                    // Fecha que cubre el reporte (el día que acaba de cerrar)
  periodStart: Date
  periodEnd: Date

  // KPIs principales del día
  newPostulaciones: number           // Postulaciones creadas en el día
  completedToday: number             // Pasaron a COMPLETED hoy
  approvedToday: number              // Pasaron a APPROVED hoy
  readyForOnboarding: number         // Pasaron a READY_ONBOARDING hoy

  // Desglose actual por estado (snapshot de la tabla)
  statusBreakdown: Record<FormDriverStatus, number>

  // Totales del mes
  monthNewPostulaciones: number
  monthApproved: number
  monthActive: number

  // Lista de postulaciones nuevas del día (detalle)
  newPostulacionesList: NewPostulacionBrief[]
}

export class DailyReportService {
  /**
   * Calcula métricas para un día específico.
   * Por defecto usa el día que acaba de cerrar (ayer si corre a las 00hs).
   */
  async getDailyReportData(reportDate?: Date): Promise<DailyReportData> {
    // Si no se pasa fecha, asumimos que corre a las 00hs y el día cerrado es "ayer"
    // (ejecución 23-abr 00:00hs reporta sobre el día 22-abr)
    const now = reportDate || new Date()
    const targetDay = reportDate || subDays(now, 1)

    const periodStart = startOfDay(targetDay)
    const periodEnd = endOfDay(targetDay)

    const monthStart = startOfMonth(targetDay)
    const monthEnd = endOfMonth(targetDay)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.monchisdrivers.com'

    const [
      // KPIs del día
      newPostulaciones,
      completedToday,
      approvedToday,
      readyForOnboardingToday,

      // Desglose por estado (snapshot actual)
      statusGroups,

      // Totales del mes
      monthNewPostulaciones,
      monthApproved,
      monthActive,

      // Detalle de nuevas
      newPostulacionesList,
    ] = await Promise.all([
      prisma.formDriver.count({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
      }),
      prisma.formDriver.count({
        where: {
          completedAt: { gte: periodStart, lte: periodEnd },
          status: 'COMPLETED',
        },
      }),
      prisma.formDriver.count({
        where: {
          finalApprovedAt: { gte: periodStart, lte: periodEnd },
          status: { in: ['APPROVED', 'READY_ONBOARDING', 'ONBOARDING', 'ACTIVE'] },
        },
      }),
      prisma.formDriver.count({
        where: {
          status: 'READY_ONBOARDING',
          updatedAt: { gte: periodStart, lte: periodEnd },
        },
      }),

      prisma.formDriver.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),

      prisma.formDriver.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.formDriver.count({
        where: {
          finalApprovedAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.formDriver.count({
        where: { status: 'ACTIVE' },
      }),

      prisma.formDriver.findMany({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
        select: {
          id: true,
          fullName: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    // Construir el breakdown con 0s para los estados que no aparecen
    const allStatuses: FormDriverStatus[] = [
      'IN_PROGRESS',
      'COMPLETED',
      'ABANDONED',
      'SUBMITTED',
      'UNDER_REVIEW',
      'DOCS_PENDING',
      'APPROVED',
      'READY_ONBOARDING',
      'ONBOARDING',
      'ACTIVE',
      'REJECTED',
    ]
    const statusBreakdown = allStatuses.reduce((acc, status) => {
      acc[status] = 0
      return acc
    }, {} as Record<FormDriverStatus, number>)

    statusGroups.forEach((g) => {
      statusBreakdown[g.status] = g._count._all
    })

    return {
      reportDate: targetDay,
      periodStart,
      periodEnd,

      newPostulaciones,
      completedToday,
      approvedToday,
      readyForOnboarding: readyForOnboardingToday,

      statusBreakdown,

      monthNewPostulaciones,
      monthApproved,
      monthActive,

      newPostulacionesList: newPostulacionesList.map((p) => ({
        id: p.id,
        fullName: p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Sin nombre',
        phoneNumber: p.phoneNumber,
        status: p.status,
        createdAt: p.createdAt,
        adminUrl: `${appUrl}/admin/postulaciones/${p.id}`,
      })),
    }
  }
}

export const dailyReportService = new DailyReportService()
