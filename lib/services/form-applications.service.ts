// lib/services/form-applications.service.ts
import { prisma } from '@/lib/prisma';

export const formApplicationsService = {
  /**
   * Obtiene todas las postulaciones con filtros
   */
  async getFormApplications(filters?: {
    status?: string;
    documentsStatus?: string;
    onboardingStatus?: string;
    assignedTo?: string;
    search?: string;
  }) {
    const where: any = {};
    
    if (filters?.status) where.status = filters.status;
    if (filters?.documentsStatus) where.documentsStatus = filters.documentsStatus;
    if (filters?.onboardingStatus) where.onboardingStatus = filters.onboardingStatus;
    if (filters?.assignedTo) where.assignedTo = filters.assignedTo;
    
    if (filters?.search) {
      where.OR = [
        { cedula: { contains: filters.search, mode: 'insensitive' } },
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { phoneNumber: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const formDrivers = await prisma.formDriver.findMany({
      where,
      include: {
        documents: {
          select: {
            id: true,
            documentType: true,
            status: true,
            uploadedAt: true
          }
        },
        _count: {
          select: {
            notes: true
          }
        }
      },
      orderBy: { lastActivityAt: 'desc' }
    });

    return formDrivers;
  },

  /**
   * Obtiene estadísticas generales
   */
  async getStats() {
    const [
      total,
      byStatus,
      byDocStatus,
      byOnboardingStatus,
      recentSubmissions
    ] = await Promise.all([
      prisma.formDriver.count(),
      
      prisma.formDriver.groupBy({
        by: ['status'],
        _count: true
      }),
      
      prisma.formDriver.groupBy({
        by: ['documentsStatus'],
        _count: true
      }),
      
      prisma.formDriver.groupBy({
        by: ['onboardingStatus'],
        _count: true,
        where: {
          onboardingStatus: { not: null }
        }
      }),

      prisma.formDriver.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
          }
        }
      })
    ]);

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
      byDocStatus: Object.fromEntries(byDocStatus.map(s => [s.documentsStatus, s._count])),
      byOnboardingStatus: Object.fromEntries(byOnboardingStatus.map(s => [s.onboardingStatus!, s._count])),
      recentSubmissions
    };
  },

  /**
   * Obtiene postulantes que requieren atención
   */
  async getRequiringAttention() {
    return await prisma.formDriver.findMany({
      where: {
        OR: [
          { status: 'SUBMITTED' },
          { documentsStatus: 'PENDING' },
          { documentsStatus: 'CORRECTIONS' },
          {
            AND: [
              { documentsStatus: 'APPROVED' },
              { status: { notIn: ['READY_ONBOARDING', 'ONBOARDING', 'ACTIVE'] } }
            ]
          }
        ]
      },
      include: {
        documents: {
          select: {
            id: true,
            documentType: true,
            status: true
          }
        },
        _count: {
          select: { notes: true }
        }
      },
      orderBy: { lastActivityAt: 'desc' },
      take: 50
    });
  },

  /**
   * Obtiene un postulante específico con toda la info
   */
  async getFormDriverById(id: string) {
    return await prisma.formDriver.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { uploadedAt: 'desc' }
        },
        notes: {
          orderBy: { createdAt: 'desc' }
        },
        submissions: {
          orderBy: { lastActivityAt: 'desc' },
          take: 1
        }
      }
    });
  }
};