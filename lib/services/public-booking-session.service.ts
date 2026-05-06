// lib/services/public-booking-session.service.ts
//
// Emite y reusa shareTokens efímeros para el flujo público de booking de capacitaciones.
// El shareToken viaja en el link de WhatsApp post-aprobación y es la credencial del
// flow público (sin Clerk). Recovery: el postulante puede solicitar uno nuevo desde
// el portal viejo (/postulacion/[token]/booking-session).

import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

export interface PublicBookingSessionEmission {
  shareToken: string
  expiresAt: Date
  reused: boolean
}

const DEFAULT_TTL_DAYS = 30

export async function emitShareTokenForFormDriver(
  formDriverId: string,
  ttlDays: number = DEFAULT_TTL_DAYS,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ shareToken: string; expiresAt: Date }> {
  const formDriver = await prisma.formDriver.findUnique({
    where: { id: formDriverId },
    select: { id: true },
  })
  if (!formDriver) throw new Error(`FormDriver "${formDriverId}" no encontrado`)

  const shareToken = nanoid(32)
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)

  await prisma.publicBookingSession.create({
    data: {
      formDriverId,
      shareToken,
      expiresAt,
      ipAddress,
      userAgent,
    },
  })

  return { shareToken, expiresAt }
}

export async function getOrCreateActiveSession(
  formDriverId: string,
  ttlDays: number = DEFAULT_TTL_DAYS,
  ipAddress?: string,
  userAgent?: string,
): Promise<PublicBookingSessionEmission> {
  const now = new Date()
  // WHY: si hay una sesión vigente la reusamos para no inundar al postulante con
  // múltiples links válidos en distintos canales.
  const existing = await prisma.publicBookingSession.findFirst({
    where: {
      formDriverId,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    return { shareToken: existing.shareToken, expiresAt: existing.expiresAt, reused: true }
  }

  const created = await emitShareTokenForFormDriver(formDriverId, ttlDays, ipAddress, userAgent)
  return { ...created, reused: false }
}

export async function findSessionByShareToken(shareToken: string) {
  return prisma.publicBookingSession.findUnique({
    where: { shareToken },
    include: {
      formDriver: {
        include: {
          documents: {
            select: { documentType: true, status: true },
          },
          onboardingAttendances: {
            include: { event: true },
          },
        },
      },
    },
  })
}
