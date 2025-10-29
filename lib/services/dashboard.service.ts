// lib/services/dashboard.service.ts

import { prisma } from '@/lib/prisma'
import { subDays, startOfDay, endOfDay, format, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'

export class DashboardService {
  
  /**
   * Obtiene estadísticas principales del dashboard
   */
  async getMainStats() {
    const [
      manualReviewDocs,
      pendingDocs,
      rejectedDocs,
      newDrivers,
      totalDrivers,
      approvedThisWeek,
      processedThisWeek,
    ] = await Promise.all([
      // Documentos en revisión manual
      prisma.formDocument.count({
        where: { status: 'IN_REVIEW' }
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
      manualReviewDocs,
      pendingDocs,
      rejectedDocs,
      newDrivers,
      totalDrivers,
      approvalRate,
      processedThisWeek,
    }
  }
  
  /**
   * Obtiene estadísticas de postulaciones
   */
  async getPostulacionesStats() {
    const sietedasAtras = subDays(new Date(), 7)
    
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
          createdAt: {
            gte: sietedasAtras
          }
        }
      }),
      prisma.formDriver.count({
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: sietedasAtras
          }
        }
      }),
    ])
    
    const tasaCompletado = totalPostulaciones > 0 
      ? Math.round((completadas / totalPostulaciones) * 100) 
      : 0
    
    return {
      totalPostulaciones,
      completadas,
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
  async getFunnelData() {
    const funnelData = await Promise.all(
      [1, 2, 3, 4, 5, 6].map(async (step) => {
        const count = await prisma.formDriver.count({
          where: {
            completedSteps: {
              has: step
            }
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
   * Obtiene visitas por día (últimos 30 días)
   */
  async getVisitasPorDia() {
    const dias = []
    for (let i = 29; i >= 0; i--) {
      const fecha = subDays(new Date(), i)
      const count = await prisma.formDriver.count({
        where: {
          createdAt: {
            gte: startOfDay(fecha),
            lte: endOfDay(fecha)
          }
        }
      })
      
      dias.push({
        fecha: format(fecha, 'd MMM', { locale: es }),
        visitas: count
      })
    }
    
    return dias
  }
  
  /**
   * Obtiene completados por día (últimos 30 días)
   */
  async getCompletadosPorDia() {
    const dias = []
    for (let i = 29; i >= 0; i--) {
      const fecha = subDays(new Date(), i)
      const count = await prisma.formDriver.count({
        where: {
          completedAt: {
            gte: startOfDay(fecha),
            lte: endOfDay(fecha)
          },
          status: 'COMPLETED'
        }
      })
      
      dias.push({
        fecha: format(fecha, 'd MMM', { locale: es }),
        completados: count
      })
    }
    
    return dias
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
  async getOnboardingStats() {
    const treintaDiasAtras = subDays(new Date(), 30)
    
    const [
      upcomingEvents,
      pendingDrivers,
      inProgressDrivers,
      completedThisMonth,
      noShowsThisMonth,
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
      
      // Completados este mes
      prisma.onboardingAttendee.count({
        where: {
          status: 'ATTENDED',
          checkedInAt: {
            gte: startOfDay(treintaDiasAtras)
          }
        }
      }),
      
      // No Shows este mes
      prisma.onboardingAttendee.count({
        where: {
          status: 'NO_SHOW',
          markedNoShowAt: {
            gte: startOfDay(treintaDiasAtras)
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
    }
  }
  
  /**
   * Obtiene todas las estadísticas del dashboard de una vez
   */
  async getAllStats() {
    const [
      mainStats,
      postulacionesStats,
      funnelData,
      visitasPorDia,
      completadosPorDia,
      abandonoPorStep,
      edadesPorRango,
      onboardingStats,
    ] = await Promise.all([
      this.getMainStats(),
      this.getPostulacionesStats(),
      this.getFunnelData(),
      this.getVisitasPorDia(),
      this.getCompletadosPorDia(),
      this.getAbandonoPorStep(),
      this.getEdadesPorRango(),
      this.getOnboardingStats(),
    ])
    
    return {
      mainStats,
      postulacionesStats,
      funnelData,
      visitasPorDia,
      completadosPorDia,
      abandonoPorStep,
      edadesPorRango,
      onboardingStats,
    }
  }
}

export const dashboardService = new DashboardService()