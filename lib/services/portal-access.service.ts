// lib/services/portal-access.service.ts
// Servicio para gestión de tokens de acceso al portal de postulantes

import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import type { Prisma } from '@prisma/client'

// Type for FormDriver with all portal-related includes
const formDriverPortalInclude = {
  documents: {
    orderBy: { uploadedAt: 'desc' as const },
    include: {
      reviewedByUser: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  },
  onboardingAttendances: {
    include: {
      event: {
        include: {
          scheduleRule: {
            select: {
              slug: true,
              title: true,
              modality: true,
              cancelDeadlineHours: true,
              durationMinutes: true,
            },
          },
        },
      },
    },
    orderBy: { invitedAt: 'desc' as const },
  },
  financialService: true,
  equipmentPayments: {
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.FormDriverInclude

export type FormDriverWithPortalIncludes = Prisma.FormDriverGetPayload<{
  include: typeof formDriverPortalInclude
}>

/**
 * Genera un nuevo accessToken para un FormDriver
 * @param formDriverId - ID del FormDriver
 * @returns accessToken generado
 */
export async function generateAccessToken(formDriverId: string): Promise<string> {
  const accessToken = uuidv4()

  await prisma.formDriver.update({
    where: { id: formDriverId },
    data: {
      accessToken,
      accessTokenGeneratedAt: new Date(),
    },
  })

  return accessToken
}

/**
 * Regenera el accessToken de un FormDriver (invalida el anterior)
 * @param formDriverId - ID del FormDriver
 * @returns nuevo accessToken generado
 */
export async function regenerateAccessToken(formDriverId: string): Promise<string> {
  const accessToken = uuidv4()

  await prisma.formDriver.update({
    where: { id: formDriverId },
    data: {
      accessToken,
      accessTokenGeneratedAt: new Date(),
    },
  })

  return accessToken
}

/**
 * Valida un accessToken y retorna el FormDriver si es válido
 * Además actualiza lastPortalAccessAt para tracking
 * @param token - Token a validar
 * @returns FormDriver con relaciones incluidas, o null si no es válido
 * @throws Error si el token es inválido o no existe
 */
export async function validateAccessToken(token: string): Promise<FormDriverWithPortalIncludes> {
  if (!token || typeof token !== 'string') {
    throw new Error('Token inválido')
  }

  const formDriver = await prisma.formDriver.findUnique({
    where: { accessToken: token },
    include: formDriverPortalInclude,
  })

  if (!formDriver) {
    throw new Error('Token no encontrado')
  }

  // Actualizar último acceso al portal (no await para no bloquear)
  prisma.formDriver
    .update({
      where: { id: formDriver.id },
      data: { lastPortalAccessAt: new Date() },
    })
    .catch((error) => {
      console.error('Error actualizando lastPortalAccessAt:', error)
    })

  return formDriver
}

/**
 * Registra acceso al portal (actualiza lastPortalAccessAt)
 * @param token - Token del FormDriver
 */
export async function trackPortalAccess(token: string): Promise<void> {
  await prisma.formDriver.update({
    where: { accessToken: token },
    data: { lastPortalAccessAt: new Date() },
  })
}

/**
 * Verifica si un FormDriver tiene un accessToken generado
 * @param formDriverId - ID del FormDriver
 * @returns true si tiene token, false si no
 */
export async function hasAccessToken(formDriverId: string): Promise<boolean> {
  const formDriver = await prisma.formDriver.findUnique({
    where: { id: formDriverId },
    select: { accessToken: true },
  })

  return formDriver?.accessToken != null
}

/**
 * Obtiene el accessToken de un FormDriver
 * Genera uno nuevo si no existe
 * @param formDriverId - ID del FormDriver
 * @returns accessToken
 */
export async function getOrCreateAccessToken(formDriverId: string): Promise<string> {
  const formDriver = await prisma.formDriver.findUnique({
    where: { id: formDriverId },
    select: { accessToken: true },
  })

  if (!formDriver) {
    throw new Error('FormDriver no encontrado')
  }

  if (formDriver.accessToken) {
    return formDriver.accessToken
  }

  // Generar nuevo token si no existe
  return await generateAccessToken(formDriverId)
}

/**
 * Construye la URL completa del portal para un accessToken
 * @param accessToken - Token de acceso
 * @returns URL completa del portal
 */
export function getPortalUrl(accessToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/postulacion/${accessToken}`
}
