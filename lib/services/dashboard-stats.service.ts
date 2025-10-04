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
      prisma.document.count({
        where: { status: 'MANUAL_REVIEW' }
      }),
      
      // Documentos pendientes de procesar con IA
      prisma.document.count({
        where: { status: 'PENDING' }
      }),
      
      // Documentos rechazados
      prisma.document.count({
        where: { status: 'REJECTED' }
      }),
      
      // Drivers nuevos (últimos 7 días)
      prisma.driver.count({
        where: {
          registeredAt: {
            gte: subDays(new Date(), 7)
          }
        }
      }),
      
      // Total de drivers
      prisma.driver.count(),
      
      // Documentos aprobados esta semana
      prisma.document.count({
        where: {
          status: 'APPROVED',
          validatedAt: {
            gte: subDays(new Date(), 7)
          }
        }
      }),
      
      // Total procesados esta semana
      prisma.document.count({
        where: {
          validatedAt: {
            gte: subDays(new Date(), 7)
          },
          status: {
            in: ['APPROVED', 'REJECTED', 'MANUAL_REVIEW']
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
    return prisma.driver.findMany({
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
        documentStatus: true,
        createdAt: true,
        documents: {
          where: { status: 'PENDING' },
          select: {
            id: true,
            type: true,
            status: true,
            driveUrl: true,
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
    return prisma.driver.findMany({
      where: {
        documents: {
          some: {
            status: 'MANUAL_REVIEW'
          }
        }
      },
      select: {
        id: true,
        fullName: true,
        cedula: true,
        phoneNumber: true,
        documentStatus: true,
        updatedAt: true,
        documents: {
          where: { status: 'MANUAL_REVIEW' },
          select: {
            id: true,
            type: true,
            status: true,
            driveUrl: true,
            confidenceScore: true,
            rejectionReason: true,
            notes: true,
          }
        },
        _count: {
          select: {
            documents: {
              where: { status: 'MANUAL_REVIEW' }
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