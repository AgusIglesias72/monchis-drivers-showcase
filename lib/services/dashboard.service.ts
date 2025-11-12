// lib/services/dashboard.service.ts

import { prisma } from '@/lib/prisma'
import { subDays, startOfDay, endOfDay, format, differenceInYears, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'

export class DashboardService {
  
  /**
   * Obtiene estadísticas principales del dashboard
   */
  async getMainStats() {
    const [
      approvedDocs, // Cambiado de manualReviewDocs a approvedDocs
      pendingDocs,
      rejectedDocs,
      newDrivers,
      totalDrivers,
      approvedThisWeek,
      processedThisWeek,
    ] = await Promise.all([
      // Documentos aprobados
      prisma.formDocument.count({
        where: { status: 'APPROVED' }
      }),
      
      // Documentos pendientes
      prisma.formDocument.count({
        where: { status: 'PENDING' }
      }),
      
      // Documentos rechazados
      prisma.formDocument.count({
        where: { status: 'REJECTED' }
      }),
      
      // Nuevos drivers (7 días)
      prisma.formDriver.count({
        where: {
          createdAt: {
            gte: subDays(new Date(), 7)
          }
        }
      }),
      
      // Total drivers
      prisma.formDriver.count(),
      
      // Aprobados esta semana
      prisma.formDocument.count({
        where: {
          status: 'APPROVED',
          reviewedAt: {
            gte: subDays(new Date(), 7)
          }
        }
      }),
      
      // Procesados esta semana
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
    ])
    
    const approvalRate = processedThisWeek > 0 
      ? Math.round((approvedThisWeek / processedThisWeek) * 100)
      : 0
    
    return {
      manualReviewDocs: approvedDocs, // Retornar como manualReviewDocs para compatibilidad
      approvedDocs, // También agregar el campo nuevo
      pendingDocs,
      rejectedDocs,
      newDrivers,
      totalDrivers,
      approvalRate,
      processedThisWeek,
      approvedThisWeek, // Documentos aprobados esta semana
    }
  }
  
  /**
   * Obtiene estadísticas de postulaciones
   */
  async getPostulacionesStats(startDate?: Date, endDate?: Date) {
    const end = endDate || new Date()
    const start = startDate || subDays(end, 7)
    const sietedasAtras = subDays(end, 7)
    
    // Si hay filtros de fecha, aplicarlos a totalPostulaciones y completadas
    const totalWhere = startDate && endDate ? {
      createdAt: {
        gte: startOfDay(start),
        lte: endOfDay(end)
      }
    } : {}
    
    const completedWhere = startDate && endDate ? {
      status: 'COMPLETED' as const,
      completedAt: {
        gte: startOfDay(start),
        lte: endOfDay(end)
      }
    } : {
      status: 'COMPLETED' as const
    }
    
    // Contar asistencias según fecha del evento
    const attendedWhere = startDate && endDate ? {
      status: 'ATTENDED' as const,
      event: {
        scheduledDate: {
          gte: startOfDay(start),
          lte: endOfDay(end)
        }
      }
    } : {
      status: 'ATTENDED' as const
    }
    
    const [
      totalPostulaciones,
      completadas,
      enProgreso,
      abandonadas,
      nuevasUltimaSemana,
      completadasUltimaSemana,
    ] = await Promise.all([
      prisma.formDriver.count({ where: totalWhere }),
      prisma.formDriver.count({ where: completedWhere }),
      prisma.formDriver.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.formDriver.count({ where: { status: 'ABANDONED' } }),
      prisma.formDriver.count({
        where: {
          createdAt: {
            gte: sietedasAtras,
            lte: end
          }
        }
      }),
      prisma.formDriver.count({
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: sietedasAtras,
            lte: end
          }
        }
      }),
    ])
    
    // Completadas incluye tanto las postulaciones completadas como las asistencias
    // Pero no duplicamos si una postulación completada también asistió
    // Necesitamos contar drivers que asistieron pero no tienen status COMPLETED
    const attendeesGrouped = await prisma.onboardingAttendee.groupBy({
      by: ['formDriverId'],
      where: attendedWhere,
    })
    
    // Obtener los status de los drivers que asistieron
    const driverIds = attendeesGrouped.map(a => a.formDriverId)
    const driversStatus = await prisma.formDriver.findMany({
      where: {
        id: { in: driverIds }
      },
      select: {
        id: true,
        status: true
      }
    })
    
    // Contar solo los que asistieron pero no tienen status COMPLETED
    const driversQueAsistieronPeroNoCompletaron = driversStatus.filter(
      d => d.status !== 'COMPLETED'
    ).length
    
    // Total completadas = completadas + asistencias que no están en completadas
    const totalCompletadas = completadas + driversQueAsistieronPeroNoCompletaron
    
    const tasaCompletado = totalPostulaciones > 0 
      ? Math.round((totalCompletadas / totalPostulaciones) * 100) 
      : 0
    
    return {
      totalPostulaciones,
      completadas: totalCompletadas,
      completadasSoloPostulaciones: completadas,
      asistenciasIncluidas: driversQueAsistieronPeroNoCompletaron,
      enProgreso,
      abandonadas,
      nuevasUltimaSemana,
      completadasUltimaSemana,
      tasaCompletado,
    }
  }
  
  /**
   * Obtiene datos del funnel de conversión
   */
  async getFunnelData(startDate?: Date, endDate?: Date) {
    // Si hay filtros de fecha, aplicarlos a las postulaciones
    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate)
      }
    } : {}
    
    const funnelData = await Promise.all(
      [1, 2, 3, 4, 5, 6].map(async (step) => {
        const count = await prisma.formDriver.count({
          where: {
            completedSteps: {
              has: step
            },
            ...dateFilter
          }
        })
        
        const labels = [
          'Contacto Básico',
          'Datos Personales',
          'Trabajo y Vehículo',
          'Documentos',
          'Info Adicional',
          'Pago de Equipamiento'
        ]
        
        return { 
          step, 
          count,
          label: labels[step - 1]
        }
      })
    )
    
    return funnelData
  }
  
  /**
   * Obtiene visitas por semana
   */
  async getVisitasPorSemana(startDate?: Date, endDate?: Date) {
    const end = endDate || new Date()
    const start = startDate || subDays(end, 30)
    
    // Obtener todas las semanas en el rango
    const weeks = eachWeekOfInterval(
      { start, end },
      { weekStartsOn: 1 } // Lunes
    )
    
    const semanas = await Promise.all(
      weeks.map(async (weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
        const actualWeekEnd = weekEnd > end ? end : weekEnd
        
        const count = await prisma.formDriver.count({
          where: {
            createdAt: {
              gte: startOfDay(weekStart),
              lte: endOfDay(actualWeekEnd)
            }
          }
        })
        
        // Formatear rango de fechas: "3-09 Nov" o "3 Nov" si es la misma semana
        const startDay = format(weekStart, 'd', { locale: es })
        const endDay = format(actualWeekEnd, 'd', { locale: es })
        const month = format(weekStart, 'MMM', { locale: es })
        const semanaLabel = startDay === endDay 
          ? `${startDay} ${month}`
          : `${startDay}-${endDay} ${month}`
        
        return {
          semana: semanaLabel,
          visitas: count
        }
      })
    )
    
    return semanas
  }
  
  /**
   * Obtiene completados por semana
   */
  async getCompletadosPorSemana(startDate?: Date, endDate?: Date) {
    const end = endDate || new Date()
    const start = startDate || subDays(end, 30)
    
    // Obtener todas las semanas en el rango
    const weeks = eachWeekOfInterval(
      { start, end },
      { weekStartsOn: 1 } // Lunes
    )
    
    const semanas = await Promise.all(
      weeks.map(async (weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
        const actualWeekEnd = weekEnd > end ? end : weekEnd
        
        const count = await prisma.formDriver.count({
          where: {
            completedAt: {
              gte: startOfDay(weekStart),
              lte: endOfDay(actualWeekEnd)
            },
            status: 'COMPLETED'
          }
        })
        
        // Formatear rango de fechas: "3-09 Nov" o "3 Nov" si es la misma semana
        const startDay = format(weekStart, 'd', { locale: es })
        const endDay = format(actualWeekEnd, 'd', { locale: es })
        const month = format(weekStart, 'MMM', { locale: es })
        const semanaLabel = startDay === endDay 
          ? `${startDay} ${month}`
          : `${startDay}-${endDay} ${month}`
        
        return {
          semana: semanaLabel,
          completados: count
        }
      })
    )
    
    return semanas
  }
  
  /**
   * Obtiene abandonos por step
   */
  async getAbandonoPorStep() {
    const abandonos = await prisma.formDriver.groupBy({
      by: ['currentStep'],
      where: {
        status: 'ABANDONED'
      },
      _count: {
        id: true
      }
    })
    
    const labels = [
      'Contacto Básico',
      'Datos Personales',
      'Trabajo y Vehículo',
      'Documentos',
      'Info Adicional',
      'Pago de Equipamiento'
    ]
    
    return abandonos.map(item => ({
      step: item.currentStep || 0,
      abandonos: item._count.id,
      label: labels[(item.currentStep || 1) - 1] || 'Desconocido'
    }))
  }
  
  /**
   * Obtiene distribución por rangos de edad
   */
  async getEdadesPorRango() {
    const formDrivers = await prisma.formDriver.findMany({
      where: {
        birthDate: { not: null }
      },
      select: {
        birthDate: true
      }
    })
  
    const rangos = {
      '18-24': 0,
      '25-34': 0,
      '35-44': 0,
      '45-54': 0,
      '55+': 0
    }
  
    formDrivers.forEach(driver => {
      if (!driver.birthDate) return
      
      try {
        const birthDate = new Date(driver.birthDate)
        // Verificar que la fecha es válida
        if (isNaN(birthDate.getTime())) return
        
        const edad = differenceInYears(new Date(), birthDate)
        
        if (edad >= 18 && edad <= 24) {
          rangos['18-24']++
        } else if (edad >= 25 && edad <= 34) {
          rangos['25-34']++
        } else if (edad >= 35 && edad <= 44) {
          rangos['35-44']++
        } else if (edad >= 45 && edad <= 54) {
          rangos['45-54']++
        } else if (edad >= 55) {
          rangos['55+']++
        }
      } catch (error) {
        // Si hay error al procesar la fecha, simplemente saltar este driver
        console.warn('Error procesando fecha de nacimiento:', error)
        return
      }
    })
  
    const total = formDrivers.length
    const colores = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe']
  
    return Object.entries(rangos).map(([rango, cantidad], index) => ({
      rango,
      cantidad,
      porcentaje: total > 0 ? (cantidad / total) * 100 : 0,
      fill: colores[index]
    }))
  }
  
  /**
   * Obtiene estadísticas de onboarding
   */
  async getOnboardingStats(startDate?: Date, endDate?: Date) {
    const end = endDate || new Date()
    const start = startDate || subDays(end, 30)
    const treintaDiasAtras = subDays(end, 30)
    
    const [
      upcomingEvents,
      pendingDrivers,
      inProgressDrivers,
      completedThisMonth,
      noShowsThisMonth,
      pendingAttendance,
    ] = await Promise.all([
      // Eventos próximos
      prisma.onboardingEvent.count({
        where: {
          scheduledDate: {
            gte: new Date()
          },
          status: {
            in: ['SCHEDULED', 'IN_PROGRESS']
          }
        }
      }),
      
      // Drivers pendientes de agendar
      prisma.formDriver.count({
        where: {
          status: 'COMPLETED',
          onboardingStatus: {
            in: ['NOT_READY', 'READY']
          }
        }
      }),
      
      // Drivers en proceso de onboarding
      prisma.formDriver.count({
        where: {
          onboardingStatus: {
            in: ['SCHEDULED', 'IN_PROGRESS']
          }
        }
      }),
      
      // Completados según fecha del evento
      prisma.onboardingAttendee.count({
        where: {
          status: 'ATTENDED',
          event: {
            scheduledDate: {
              gte: startOfDay(start),
              lte: endOfDay(end)
            }
          }
        }
      }),
      
      // No Shows según fecha del evento
      prisma.onboardingAttendee.count({
        where: {
          status: 'NO_SHOW',
          event: {
            scheduledDate: {
              gte: startOfDay(start),
              lte: endOfDay(end)
            }
          }
        }
      }),
      
      // Drivers pendientes de asistencia (agendados pero aún no asistieron ni fueron marcados como no show)
      // Basado en eventos dentro del rango de fechas
      prisma.onboardingAttendee.count({
        where: {
          status: {
            in: ['INVITED', 'CONFIRMED', 'SCHEDULED']
          },
          event: {
            scheduledDate: {
              gte: startOfDay(start),
              lte: endOfDay(end)
            }
          }
        }
      }),
    ])
    
    const attendanceRate = (completedThisMonth + noShowsThisMonth) > 0
      ? Math.round((completedThisMonth / (completedThisMonth + noShowsThisMonth)) * 100)
      : 0
    
    return {
      upcomingEvents,
      pendingDrivers,
      inProgressDrivers,
      completedThisMonth,
      noShowsThisMonth,
      attendanceRate,
      pendingAttendance,
    }
  }
  
  /**
   * Obtiene todas las estadísticas del dashboard de una vez
   */
  async getAllStats(options?: { startDate?: Date; endDate?: Date }) {
    const { startDate, endDate } = options || {}
    
    const [
      mainStats,
      postulacionesStats,
      funnelData,
      visitasPorSemana,
      completadosPorSemana,
      abandonoPorStep,
      edadesPorRango,
      onboardingStats,
    ] = await Promise.all([
      this.getMainStats(),
      this.getPostulacionesStats(startDate, endDate),
      this.getFunnelData(startDate, endDate),
      this.getVisitasPorSemana(startDate, endDate),
      this.getCompletadosPorSemana(startDate, endDate),
      this.getAbandonoPorStep(),
      this.getEdadesPorRango(),
      this.getOnboardingStats(startDate, endDate),
    ])
    
    return {
      mainStats,
      postulacionesStats,
      funnelData,
      visitasPorSemana,
      completadosPorSemana,
      abandonoPorStep,
      edadesPorRango,
      onboardingStats,
    }
  }
}

export const dashboardService = new DashboardService()