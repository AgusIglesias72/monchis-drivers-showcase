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
   * Obtiene todas las postulaciones con filtros opcionales y paginación
   */
  async getPostulaciones(filters?: {
    status?: string;
    searchTerm?: string;
    onboardingStatus?: string;
    hasVehicle?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const where: any = {};
    
    // Filtro de estado general
    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }
    
    // Filtro de búsqueda
    if (filters?.searchTerm) {
      where.OR = [
        { firstName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { lastName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { fullName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { cedula: { contains: filters.searchTerm } },
        { phoneNumber: { contains: filters.searchTerm } },
        { email: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }
    
    // Filtro de estado de onboarding (simplificado)
    if (filters?.onboardingStatus && filters.onboardingStatus !== 'all') {
      if (filters.onboardingStatus === 'pending') {
        // Pendiente: NOT_READY, READY, o null
        where.OR = [
          { onboardingStatus: 'NOT_READY' },
          { onboardingStatus: 'READY' },
          { onboardingStatus: null },
        ];
      } else if (filters.onboardingStatus === 'scheduled') {
        // Agendado: SCHEDULED
        where.onboardingStatus = 'SCHEDULED';
      } else if (filters.onboardingStatus === 'completed') {
        // Realizado: COMPLETED
        where.onboardingStatus = 'COMPLETED';
      }
    }
    
    // Filtro de tiene vehículo
    if (filters?.hasVehicle && filters.hasVehicle !== 'all') {
      where.hasVehicle = filters.hasVehicle === 'yes';
    }
    
    // Filtro de rango de fechas
    if (filters?.startDate || filters?.endDate) {
      where.startedAt = {};
      if (filters.startDate) {
        where.startedAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        // Agregar 1 día para incluir todo el día final
        const endDate = new Date(filters.endDate);
        endDate.setDate(endDate.getDate() + 1);
        where.startedAt.lt = endDate;
      }
    }
    
    // Paginación
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;
    
    // Ordenamiento
    const sortBy = filters?.sortBy || 'startedAt';
    const sortOrder = filters?.sortOrder || 'desc';
    
    // Mapeo de campos de ordenamiento
    const orderByField: any = {};
    if (sortBy === 'name') {
      orderByField.fullName = sortOrder;
    } else if (sortBy === 'status') {
      // Ordenar por progreso (currentStep) en lugar de status textual
      orderByField.currentStep = sortOrder;
    } else if (sortBy === 'startedAt') {
      orderByField.startedAt = sortOrder;
    } else if (sortBy === 'progress') {
      orderByField.currentStep = sortOrder;
    } else {
      orderByField.startedAt = sortOrder;
    }
    
    const [formDrivers, total] = await Promise.all([
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
          birthDate: true,
          department: true,
          city: true,
          neighborhood: true,
          address: true,
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
          emergencyName: true,
          emergencyPhone: true,
          emergencyRelationship: true,
          onboardingStatus: true,
          onboardingScheduledAt: true,
          onboardingAttendances: {
            include: {
              event: {
                select: {
                  scheduledDate: true,
                  startTime: true,
                  endTime: true,
                  location: true,
                  status: true,
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          equipmentPayments: {
            select: {
              id: true,
              paymentMethod: true,
              amount: true,
              status: true,
              paymentNumber: true,
              invoiceNumber: true,
              paymentProofUrl: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: orderByField,
        skip,
        take: limit,
      }),
      prisma.formDriver.count({ where }),
    ]);
    
    const postulaciones = formDrivers.map((driver: any) => ({
      ...driver,
      timeline: this.generateTimeline(
        driver.completedSteps,
        driver.startedAt,
        driver.completedAt
      )
    }));
    
    return {
      postulaciones,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
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
        },
        equipmentPayments: {
          orderBy: { createdAt: 'desc' }
        },
        financialService: true,
        onboardingAttendances: {
          include: {
            event: true
          },
          orderBy: { createdAt: 'desc' }
        },
        documents: {
          orderBy: { uploadedAt: 'desc' }
        },
        notes: {
          include: {
            createdByUser: {
              select: {
                fullName: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }
  
  /**
   * Genera el timeline de una postulación basado en sus steps completados
   */
  private generateTimeline(completedSteps: number[], startedAt: Date, completedAt: Date | null) {
    const stepNames = [
      'Contacto Básico',
      'Datos Personales',
      'Trabajo y Vehículo',
      'Documentos',
      'Información Adicional',
      'Pago de Equipamiento'
    ];

    return stepNames.map((name, index) => {
      const step = index + 1;
      const isCompleted = completedSteps.includes(step);
      
      let completedAtEstimate = null;
      if (isCompleted) {
        if (step === completedSteps.length && completedAt) {
          completedAtEstimate = completedAt;
        } else {
          const progressRatio = step / completedSteps.length;
          const totalTime = completedAt 
            ? completedAt.getTime() - startedAt.getTime()
            : Date.now() - startedAt.getTime();
          completedAtEstimate = new Date(startedAt.getTime() + (totalTime * progressRatio));
        }
      }

      return {
        step,
        name,
        completedAt: completedAtEstimate
      };
    });
  }
}

export const postulacionesStatsService = new PostulacionesStatsService();