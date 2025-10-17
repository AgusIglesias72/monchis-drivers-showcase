// lib/services/postulaciones-stats.service.ts

import { prisma } from '@/lib/prisma';
import { subDays, format, startOfDay, endOfDay, differenceInYears } from 'date-fns';

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
      [1, 2, 3, 4, 5, 6].map(async (step) => {
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
   * Genera el timeline de una postulación basado en sus steps completados
   */
  private generateTimeline(completedSteps: number[], startedAt: Date, completedAt: Date | null) {
    const stepNames = [
      'Contacto Básico',
      'Datos Personales',
      'Trabajo y Vehículo',
      'Documentos',
      'Información Adicional',
      'Pago de Equipamiento' // ✅ NUEVO STEP
    ];

    return stepNames.map((name, index) => {
      const step = index + 1;
      const isCompleted = completedSteps.includes(step);
      
      // Estimación de fechas de completado
      let completedAtEstimate = null;
      if (isCompleted) {
        if (step === completedSteps.length && completedAt) {
          // Último step usa la fecha de completado real
          completedAtEstimate = completedAt;
        } else {
          // Estimar basado en progreso
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
          birthDate: true, // ✅ AGREGADO
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
          experience: true,
          availability: true,
          whenCanStart: true,
          onboardingStatus: true, // ✅ AGREGADO
          
          // ✅ NUEVO: Incluir relaciones
          equipmentPayments: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1, // Solo el más reciente
            select: {
              id: true,
              paymentMethod: true,
              paymentNumber: true,
              invoiceNumber: true,
              amount: true,
              paymentDate: true,
              paymentProofUrl: true,
              status: true,
              createdAt: true,
            }
          },
          onboardingAttendances: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1, // Solo el más reciente
            select: {
              id: true,
              status: true,
              confirmedAt: true,
              checkedInAt: true,
              event: {
                select: {
                  id: true,
                  title: true,
                  scheduledDate: true,
                  startTime: true,
                  location: true,
                  status: true,
                }
              }
            }
          }
        },
        orderBy: {
          lastActivityAt: 'desc'
        },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      prisma.formDriver.count({ where })
    ]);
    
    // ✅ Agregar timeline a cada postulación
    const postulaciones = formDrivers.map(driver => ({
      ...driver,
      timeline: this.generateTimeline(driver.completedSteps, driver.startedAt, driver.completedAt)
    }));
    
    return {
      postulaciones,
      total,
      hasMore: (filters?.offset || 0) + (filters?.limit || 50) < total
    };
  }

  async getEdadesPorRango() {
    const formDrivers = await prisma.formDriver.findMany({
      where: {
        birthDate: { not: null }
      },
      select: {
        birthDate: true
      }
    });
  
    const rangos = {
      '18-24': 0,
      '25-34': 0,
      '35-44': 0,
      '45-54': 0,
      '55+': 0
    };
  
    formDrivers.forEach(driver => {
      if (!driver.birthDate) return;
      
      const edad = differenceInYears(new Date(), driver.birthDate);
      
      if (edad >= 18 && edad <= 24) {
        rangos['18-24']++;
      } else if (edad >= 25 && edad <= 34) {
        rangos['25-34']++;
      } else if (edad >= 35 && edad <= 44) {
        rangos['35-44']++;
      } else if (edad >= 45 && edad <= 54) {
        rangos['45-54']++;
      } else if (edad >= 55) {
        rangos['55+']++;
      }
    });
  
    const total = formDrivers.length;
    const colores = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'];
  
    return Object.entries(rangos).map(([rango, cantidad], index) => ({
      rango,
      cantidad,
      porcentaje: total > 0 ? (cantidad / total) * 100 : 0,
      fill: colores[index]
    }));
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
}

export const postulacionesStatsService = new PostulacionesStatsService();