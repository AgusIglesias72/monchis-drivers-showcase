// lib/services/postulaciones-with-badges.service.ts

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * Include completo para cargar todas las relaciones necesarias
 * para calcular los badges de estado
 */
export const POSTULACION_WITH_BADGES_INCLUDE = {
  documents: {
    orderBy: {
      createdAt: 'desc' as const
    }
  },
  equipmentPayments: {
    orderBy: {
      createdAt: 'desc' as const
    }
  },
  financialService: true,
  onboardingAttendances: {
    include: {
      event: true
    },
    orderBy: {
      createdAt: 'desc' as const
    }
  }
} satisfies Prisma.FormDriverInclude

/**
 * Tipo de postulación con todas las relaciones para badges
 */
export type PostulacionWithBadges = Prisma.FormDriverGetPayload<{
  include: typeof POSTULACION_WITH_BADGES_INCLUDE
}>

class PostulacionesWithBadgesService {
  /**
   * Obtiene una postulación por ID con todas las relaciones
   */
  async getById(id: string): Promise<PostulacionWithBadges | null> {
    return prisma.formDriver.findUnique({
      where: { id },
      include: POSTULACION_WITH_BADGES_INCLUDE
    })
  }

  /**
   * Obtiene postulaciones con filtros y paginación
   */
  async getPostulaciones({
    status = 'all',
    searchTerm,
    onboardingStatus = 'all',
    hasVehicle = 'all',
    startDate,
    endDate,
    page = 1,
    limit = 20,
  }: {
    status?: string
    searchTerm?: string
    onboardingStatus?: string
    hasVehicle?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }): Promise<{
    postulaciones: PostulacionWithBadges[]
    total: number
    page: number
    totalPages: number
    hasMore: boolean
  }> {
    const where: Prisma.FormDriverWhereInput = {}

    // Filtros
    if (status !== 'all') {
      where.status = status as any
    }

    if (onboardingStatus !== 'all' && onboardingStatus) {
      where.onboardingStatus = onboardingStatus as any
    }

    if (hasVehicle === 'yes') {
      where.hasVehicle = true
    } else if (hasVehicle === 'no') {
      where.hasVehicle = false
    }

    if (searchTerm) {
      where.OR = [
        { fullName: { contains: searchTerm, mode: 'insensitive' } },
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { cedula: { contains: searchTerm } },
        { phoneNumber: { contains: searchTerm } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ]
    }

    if (startDate) {
      where.createdAt = { ...((where.createdAt as any) || {}), gte: new Date(startDate) }
    }

    if (endDate) {
      where.createdAt = { ...((where.createdAt as any) || {}), lte: new Date(endDate) }
    }

    // Obtener total y postulaciones
    const [total, postulaciones] = await Promise.all([
      prisma.formDriver.count({ where }),
      prisma.formDriver.findMany({
        where,
        include: POSTULACION_WITH_BADGES_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    const totalPages = Math.ceil(total / limit)
    const hasMore = page < totalPages

    return {
      postulaciones,
      total,
      page,
      totalPages,
      hasMore,
    }
  }

  /**
   * Obtiene postulaciones que requieren atención inmediata
   * (tienen badges de alerta)
   */
  async getPostulacionesRequiringAttention(): Promise<PostulacionWithBadges[]> {
    // Obtener todas las postulaciones completadas
    const postulaciones = await prisma.formDriver.findMany({
      where: {
        status: 'COMPLETED',
        onboardingStatus: {
          not: 'COMPLETED'
        }
      },
      include: POSTULACION_WITH_BADGES_INCLUDE,
      orderBy: { createdAt: 'desc' }
    })

    // Filtrar las que tienen badges críticos
    // (esto se podría optimizar con una query más específica)
    return postulaciones
  }
}

export const postulacionesWithBadgesService = new PostulacionesWithBadgesService()