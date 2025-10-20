// lib/services/dashboard-stats.service.ts

import { prisma } from '@/lib/prisma';
import { subDays } from 'date-fns';

export class DashboardStatsService {
  
  /**
   * Obtiene todas las estadísticas del dashboard
   */
  async getStats() {
    const [
      manualReviewDocs,
      pendingDocs,
      rejectedDocs,
      newDrivers,
      totalDrivers,
      approvedThisWeek,
      processedThisWeek,
    ] = await Promise.all([
      // Documentos que requieren revisión manual
      prisma.formDocument.count({
        where: { status: 'IN_REVIEW' }
      }),
      
      // Documentos pendientes de procesar con IA
      prisma.formDocument.count({
        where: { status: 'PENDING' }
      }),
      
      // Documentos rechazados
      prisma.formDocument.count({
        where: { status: 'REJECTED' }
      }),
      
      // Drivers nuevos (últimos 7 días)
      prisma.formDriver.count({
        where: {
          createdAt: {
            gte: subDays(new Date(), 7)
          }
        }
      }),
      
      // Total de drivers
      prisma.formDriver.count(),
      
      // Documentos aprobados esta semana
      prisma.formDocument.count({
        where: {
          status: 'APPROVED',
          reviewedAt: {
            gte: subDays(new Date(), 7)
          }
        }
      }),
      
      // Total procesados esta semana
      prisma.formDocument.count({
        where: {
          reviewedAt: {
            gte: subDays(new Date(), 7)
          },
          status: {
            in: ['APPROVED', 'REJECTED', 'IN_REVIEW']
          }
        }
      })
    ]);
    
    // Calcular tasa de aprobación
    const approvalRate = processedThisWeek > 0 
      ? Math.round((approvedThisWeek / processedThisWeek) * 100) 
      : 0;
    
    return {
      manualReviewDocs,
      pendingDocs,
      rejectedDocs,
      newDrivers,
      totalDrivers,
      approvalRate,
      processedThisWeek,
    };
  }
  
  /**
   * Obtiene drivers con documentos pendientes (para mostrar en tabla)
   */
  async getDriversWithPendingDocs(limit: number = 10) {
    return prisma.formDriver.findMany({
      where: {
        documents: {
          some: {
            status: 'PENDING'
          }
        }
      },
      select: {
        id: true,
        fullName: true,
        cedula: true,
        phoneNumber: true,
        documentsStatus: true,
        createdAt: true,
        documents: {
          where: { status: 'PENDING' },
          select: {
            id: true,
            documentType: true,
            status: true,
            blobUrl: true,
          }
        },
        _count: {
          select: {
            documents: {
              where: { status: 'PENDING' }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
  }
  
  /**
   * Obtiene drivers con documentos en revisión manual
   */
  async getDriversWithManualReviewDocs() {
    return prisma.formDriver.findMany({
      where: {
        documents: {
          some: {
            status: 'IN_REVIEW'
          }
        }
      },
      select: {
        id: true,
        fullName: true,
        cedula: true,
        phoneNumber: true,
        documentsStatus: true,
        updatedAt: true,
        documents: {
          where: { status: 'IN_REVIEW' },
          select: {
            id: true,
            documentType: true,
            status: true,
            blobUrl: true,
            rejectionReason: true,
            adminNotes: true,
          }
        },
        _count: {
          select: {
            documents: {
              where: { status: 'IN_REVIEW' }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
  }
}

export const dashboardStatsService = new DashboardStatsService();