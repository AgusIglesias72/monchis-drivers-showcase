// lib/services/postulaciones-stats.service.ts

import { prisma } from '@/lib/prisma';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';

export class PostulacionesStatsService {
  
  /**
   * Obtiene estadísticas generales de postulaciones
   */
  async getStats() {
    const [
      totalPostulaciones,
      completadas,
      enProgreso,
      abandonadas,
      nuevasUltimaSemana,
      completadasUltimaSemana,
    ] = await Promise.all([
      prisma.formDriver.count(),
      prisma.formDriver.count({ where: { status: 'COMPLETED' } }),
      prisma.formDriver.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.formDriver.count({ where: { status: 'ABANDONED' } }),
      prisma.formDriver.count({
        where: {
          startedAt: {
            gte: subDays(new Date(), 7)
          }
        }
      }),
      prisma.formDriver.count({
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: subDays(new Date(), 7)
          }
        }
      }),
    ]);
    
    const tasaCompletado = totalPostulaciones > 0 
      ? Math.round((completadas / totalPostulaciones) * 100) 
      : 0;
    
    return {
      totalPostulaciones,
      completadas,
      enProgreso,
      abandonadas,
      nuevasUltimaSemana,
      completadasUltimaSemana,
      tasaCompletado,
    };
  }
  
  /**
   * Obtiene datos del funnel de conversión por step
   */
  async getFunnelData() {
    const funnelData = await Promise.all(
      [1, 2, 3, 4, 5, 6, 7].map(async (step) => {
        const count = await prisma.formDriver.count({
          where: {
            completedSteps: {
              has: step
            }
          }
        });
        return { step, count };
      })
    );
    
    return funnelData;
  }
  
  /**
   * Obtiene visitas al formulario por día (últimos 7 días)
   */
  async getVisitasPorDia() {
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const fecha = subDays(new Date(), i);
      const count = await prisma.formSubmission.count({
        where: {
          startedAt: {
            gte: startOfDay(fecha),
            lte: endOfDay(fecha)
          }
        }
      });
      
      dias.push({
        fecha: format(fecha, 'dd/MM'),
        visitas: count
      });
    }
    
    return dias;
  }
  
  /**
   * Obtiene completados por día (últimos 7 días)
   */
  async getCompletadosPorDia() {
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const fecha = subDays(new Date(), i);
      const count = await prisma.formDriver.count({
        where: {
          completedAt: {
            gte: startOfDay(fecha),
            lte: endOfDay(fecha)
          },
          status: 'COMPLETED'
        }
      });
      
      dias.push({
        fecha: format(fecha, 'dd/MM'),
        completados: count
      });
    }
    
    return dias;
  }
  
  /**
   * Obtiene tasa de abandono por step
   */
  async getAbandonoPorStep() {
    const abandonos = await prisma.formSubmission.groupBy({
      by: ['abandonedAtStep'],
      where: {
        isAbandoned: true,
        abandonedAtStep: { not: null }
      },
      _count: {
        id: true
      }
    });
    
    return abandonos.map(item => ({
      step: item.abandonedAtStep || 0,
      abandonos: item._count.id
    }));
  }
  
  /**
   * Obtiene todas las postulaciones con filtros opcionales
   */
  async getPostulaciones(filters?: {
    status?: string;
    searchTerm?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    
    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }
    
    if (filters?.searchTerm) {
      where.OR = [
        { firstName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { lastName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { cedula: { contains: filters.searchTerm } },
        { phoneNumber: { contains: filters.searchTerm } },
        { email: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }
    
    const [postulaciones, total] = await Promise.all([
      prisma.formDriver.findMany({
        where,
        select: {
          id: true,
          cedula: true,
          firstName: true,
          lastName: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          department: true,
          city: true,
          neighborhood: true,
          hasVehicle: true,
          vehicleBrand: true,
          vehicleModel: true,
          vehicleYear: true,
          vehiclePlate: true,
          workZone: true,
          status: true,
          currentStep: true,
          completedSteps: true,
          startedAt: true,
          completedAt: true,
          lastActivityAt: true,
        },
        orderBy: {
          lastActivityAt: 'desc'
        },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      prisma.formDriver.count({ where })
    ]);
    
    return {
      postulaciones,
      total,
      hasMore: (filters?.offset || 0) + (filters?.limit || 50) < total
    };
  }
  
  /**
   * Obtiene una postulación por ID con todos los detalles
   */
  async getPostulacionById(id: string) {
    return prisma.formDriver.findUnique({
      where: { id },
      include: {
        submissions: {
          include: {
            stepCompletions: {
              orderBy: { step: 'asc' }
            }
          }
        }
      }
    });
  }
}

export const postulacionesStatsService = new PostulacionesStatsService();