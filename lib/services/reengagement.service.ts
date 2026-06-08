// lib/services/reengagement.service.ts
//
// Selección de postulantes para el cron de reenganche al agendamiento
// (/api/cron/reengage-scheduling). Dos segmentos, alineados con los filtros
// rápidos del admin:
//
//  - "Pendiente de Agendar": postulación aprobada (cédula + antecedentes con un
//    doc APPROVED = verde/azul) que todavía no reservó ni fue no-show. Recibe el
//    mensaje de agendamiento (capacitaciones), bypasseando el "te faltan
//    documentos" aunque el documentsStatus agregado siga PENDING (p.ej. azul).
//  - "No Asistieron": tiene una asistencia NO_SHOW y no volvió a reservar.
//    Recibe el mensaje de re-agendar (capacitacion_no_show).
//
// Ambos respetan el backoff exponencial compartido (noContactBefore) para no
// spamear al mismo postulante; el cron registra cada envío con recordMessageSent.

import { prisma } from '@/lib/prisma'
import { hasCoreDocsApproved } from './onboarding-eligibility'

export interface ReengagementDriver {
  id: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  phoneNumber: string
  messagesSentCount: number
}

/**
 * Segmento "Pendiente de Agendar": form completado, core docs aprobados
 * (verde/azul), onboarding pendiente (null/NOT_READY/READY), sin reserva activa
 * ni no-show previo, y fuera del período de backoff.
 */
export async function getPendingScheduleDrivers(limit = 5): Promise<ReengagementDriver[]> {
  const now = new Date()

  const drivers = await prisma.formDriver.findMany({
    where: {
      status: 'COMPLETED',
      phoneNumber: { not: '' },
      AND: [
        { OR: [{ onboardingStatus: null }, { onboardingStatus: { in: ['NOT_READY', 'READY'] } }] },
        { OR: [{ noContactBefore: null }, { noContactBefore: { lte: now } }] },
      ],
      // Ni reserva activa ni no-show (los no-show van al otro segmento).
      onboardingAttendances: {
        none: { status: { in: ['INVITED', 'CONFIRMED', 'SCHEDULED', 'NO_SHOW'] } },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      phoneNumber: true,
      messagesSentCount: true,
      documents: { select: { documentType: true, status: true } },
    },
    orderBy: [{ messagesSentCount: 'asc' }, { createdAt: 'asc' }],
    take: limit * 3, // tomamos de más para filtrar por color de docs en JS
  })

  const eligible: ReengagementDriver[] = []
  for (const d of drivers) {
    if (eligible.length >= limit) break
    if (!hasCoreDocsApproved(d.documents)) continue
    eligible.push({
      id: d.id,
      firstName: d.firstName,
      lastName: d.lastName,
      fullName: d.fullName,
      phoneNumber: d.phoneNumber,
      messagesSentCount: d.messagesSentCount,
    })
  }
  return eligible
}

/**
 * Segmento "No Asistieron": tiene al menos una asistencia NO_SHOW, no volvió a
 * reservar (sin asistencia activa), no completó el onboarding, y fuera del
 * backoff.
 */
export async function getNoShowReengageDrivers(limit = 5): Promise<ReengagementDriver[]> {
  const now = new Date()

  const drivers = await prisma.formDriver.findMany({
    where: {
      status: 'COMPLETED',
      phoneNumber: { not: '' },
      NOT: { onboardingStatus: 'COMPLETED' },
      OR: [{ noContactBefore: null }, { noContactBefore: { lte: now } }],
      onboardingAttendances: {
        some: { status: 'NO_SHOW' },
        none: { status: { in: ['INVITED', 'CONFIRMED', 'SCHEDULED'] } },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      phoneNumber: true,
      messagesSentCount: true,
    },
    orderBy: [{ messagesSentCount: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  })

  return drivers
}
