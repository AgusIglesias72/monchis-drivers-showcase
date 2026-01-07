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

        // Ajustar weekStart y weekEnd para que estén dentro del rango del filtro
        const actualWeekStart = weekStart < start ? start : weekStart
        const actualWeekEnd = weekEnd > end ? end : weekEnd

        const [iniciadas, completadas] = await Promise.all([
          // Iniciadas en este período
          prisma.formDriver.count({
            where: {
              createdAt: {
                gte: startOfDay(actualWeekStart),
                lte: endOfDay(actualWeekEnd)
              }
            }
          }),
          // Completadas en este período
          prisma.formDriver.count({
            where: {
              completedAt: {
                gte: startOfDay(actualWeekStart),
                lte: endOfDay(actualWeekEnd)
              },
              status: 'COMPLETED'
            }
          })
        ])

        // Formatear rango de fechas con las fechas reales (no las de la semana completa)
        const startDay = format(actualWeekStart, 'd', { locale: es })
        const endDay = format(actualWeekEnd, 'd', { locale: es })
        const month = format(actualWeekStart, 'MMM', { locale: es })
        const semanaLabel = startDay === endDay
          ? `${startDay} ${month}`
          : `${startDay}-${endDay} ${month}`

        return {
          semana: semanaLabel,
          visitas: iniciadas,
          completados: completadas
        }
      })
    )

    return semanas
  }

  /**
   * Obtiene completados por semana
   * @deprecated Usar getVisitasPorSemana que ahora incluye ambos datos
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
   * Obtiene evolución temporal de asistencias (por día, semana o mes)
   */
  async getAsistenciasPorPeriodo(startDate?: Date, endDate?: Date, groupBy: 'day' | 'week' | 'month' = 'week') {
    const end = endDate || new Date()
    const start = startDate || subDays(end, 30)

    // Obtener todos los attendees en el rango de fechas
    const attendees = await prisma.onboardingAttendee.findMany({
      where: {
        event: {
          scheduledDate: {
            gte: startOfDay(start),
            lte: endOfDay(end)
          }
        }
      },
      include: {
        event: {
          select: {
            scheduledDate: true
          }
        }
      }
    })

    // Agrupar según el período
    const grouped = new Map<string, { attended: number; noShow: number; scheduled: number; total: number }>()

    attendees.forEach(attendee => {
      let key: string
      const eventDate = attendee.event.scheduledDate

      if (groupBy === 'day') {
        key = format(eventDate, 'dd MMM', { locale: es })
      } else if (groupBy === 'week') {
        const weekStart = startOfWeek(eventDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(eventDate, { weekStartsOn: 1 })
        const startDay = format(weekStart, 'd', { locale: es })
        const endDay = format(weekEnd, 'd', { locale: es })
        const month = format(weekStart, 'MMM', { locale: es })
        key = `${startDay}-${endDay} ${month}`
      } else {
        key = format(eventDate, 'MMM yyyy', { locale: es })
      }

      if (!grouped.has(key)) {
        grouped.set(key, { attended: 0, noShow: 0, scheduled: 0, total: 0 })
      }

      const data = grouped.get(key)!
      data.total++

      if (attendee.status === 'ATTENDED') {
        data.attended++
      } else if (attendee.status === 'NO_SHOW') {
        data.noShow++
      } else if (['INVITED', 'CONFIRMED', 'SCHEDULED'].includes(attendee.status)) {
        data.scheduled++
      }
    })

    return Array.from(grouped.entries()).map(([periodo, data]) => ({
      periodo,
      asistieron: data.attended,
      noAsistieron: data.noShow,
      programados: data.scheduled,
      total: data.total,
      tasaPresentismo: data.attended + data.noShow > 0
        ? Math.round((data.attended / (data.attended + data.noShow)) * 100)
        : 0
    }))
  }

  /**
   * Obtiene distribución de estados de asistencias
   */
  async getDistribucionEstadosAsistencias(startDate?: Date, endDate?: Date) {
    const end = endDate || new Date()
    const start = startDate || subDays(end, 30)

    // Obtener eventos en el rango de fechas
    const events = await prisma.onboardingEvent.findMany({
      where: {
        scheduledDate: {
          gte: startOfDay(start),
          lte: endOfDay(end)
        }
      },
      select: {
        id: true
      }
    })

    const eventIds = events.map(e => e.id)

    // Agrupar attendees por status
    const statusGroups = await prisma.onboardingAttendee.groupBy({
      by: ['status'],
      where: {
        eventId: {
          in: eventIds
        }
      },
      _count: {
        _all: true
      }
    })

    const statusLabels: Record<string, string> = {
      'INVITED': 'Invitados',
      'CONFIRMED': 'Confirmados',
      'SCHEDULED': 'Agendados',
      'ATTENDED': 'Asistieron',
      'NO_SHOW': 'No Asistieron',
      'CANCELLED': 'Cancelados',
      'RESCHEDULED': 'Reagendados'
    }

    const statusColors: Record<string, string> = {
      'INVITED': '#94a3b8',
      'CONFIRMED': '#3b82f6',
      'SCHEDULED': '#f59e0b',
      'ATTENDED': '#10b981',
      'NO_SHOW': '#ef4444',
      'CANCELLED': '#6b7280',
      'RESCHEDULED': '#8b5cf6'
    }

    const total = statusGroups.reduce((sum, item) => sum + item._count._all, 0)

    return statusGroups.map(item => ({
      status: item.status,
      label: statusLabels[item.status] || item.status,
      cantidad: item._count._all,
      porcentaje: total > 0 ? Math.round((item._count._all / total) * 100) : 0,
      fill: statusColors[item.status] || '#64748b'
    }))
  }

  /**
   * Obtiene métricas de asistencias programadas vs realizadas
   */
  async getAsistenciasProgramadasVsRealizadas(startDate?: Date, endDate?: Date) {
    const end = endDate || new Date()
    const start = startDate || subDays(end, 30)

    const [
      totalProgramadas,
      asistieron,
      noAsistieron,
      canceladas,
      pendientes
    ] = await Promise.all([
      // Total programadas (todos los attendees)
      prisma.onboardingAttendee.count({
        where: {
          event: {
            scheduledDate: {
              gte: startOfDay(start),
              lte: endOfDay(end)
            }
          }
        }
      }),

      // Asistieron
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

      // No asistieron
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

      // Canceladas
      prisma.onboardingAttendee.count({
        where: {
          status: 'CANCELLED',
          event: {
            scheduledDate: {
              gte: startOfDay(start),
              lte: endOfDay(end)
            }
          }
        }
      }),

      // Pendientes
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
      })
    ])

    const tasaPresentismo = (asistieron + noAsistieron) > 0
      ? Math.round((asistieron / (asistieron + noAsistieron)) * 100)
      : 0

    return {
      totalProgramadas,
      asistieron,
      noAsistieron,
      canceladas,
      pendientes,
      tasaPresentismo,
      resueltas: asistieron + noAsistieron,
      porResolver: pendientes
    }
  }
  
  /**
   * Obtiene evolución diaria de postulaciones
   */
  async getEvolucionDiariaPostulaciones(startDate?: Date, endDate?: Date) {
    const end = endDate || new Date()
    const start = startDate || subDays(end, 30)

    // Obtener todas las postulaciones en el rango
    const postulaciones = await prisma.formDriver.findMany({
      where: {
        createdAt: {
          gte: startOfDay(start),
          lte: endOfDay(end)
        }
      },
      select: {
        createdAt: true,
        completedAt: true,
        status: true,
      }
    })

    // Agrupar por día
    const grouped = new Map<string, { iniciadas: number; completadas: number }>()

    postulaciones.forEach(postulacion => {
      const diaInicio = format(postulacion.createdAt, 'dd MMM', { locale: es })

      if (!grouped.has(diaInicio)) {
        grouped.set(diaInicio, { iniciadas: 0, completadas: 0 })
      }

      grouped.get(diaInicio)!.iniciadas++

      if (postulacion.completedAt && postulacion.status === 'COMPLETED') {
        const diaCompletado = format(postulacion.completedAt, 'dd MMM', { locale: es })
        if (!grouped.has(diaCompletado)) {
          grouped.set(diaCompletado, { iniciadas: 0, completadas: 0 })
        }
        grouped.get(diaCompletado)!.completadas++
      }
    })

    // Generar todos los días en el rango (para tener continuidad)
    const allDays: Array<{ dia: string; date: Date; iniciadas: number; completadas: number }> = []
    const currentDate = new Date(start)

    while (currentDate <= end) {
      const diaLabel = format(currentDate, 'dd MMM', { locale: es })
      const data = grouped.get(diaLabel) || { iniciadas: 0, completadas: 0 }

      allDays.push({
        dia: diaLabel,
        date: new Date(currentDate),
        iniciadas: data.iniciadas,
        completadas: data.completadas,
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return allDays.map(({ dia, iniciadas, completadas }) => ({
      dia,
      iniciadas,
      completadas,
    }))
  }

  /**
   * Obtiene evolución diaria de postulaciones por etapa
   */
  async getEvolucionPorEtapa(startDate?: Date, endDate?: Date) {
    const end = endDate || new Date()
    const start = startDate || subDays(end, 30)

    // Obtener todas las postulaciones en el rango con sus steps completados
    const postulaciones = await prisma.formDriver.findMany({
      where: {
        createdAt: {
          gte: startOfDay(start),
          lte: endOfDay(end)
        }
      },
      select: {
        createdAt: true,
        completedSteps: true,
        currentStep: true,
        status: true,
      }
    })

    // Agrupar por día y calcular cuántas están en cada etapa
    const grouped = new Map<string, {
      total: number
      step1: number
      step2: number
      step3: number
      step4: number
      step5: number
      step6: number
      completadas: number
    }>()

    postulaciones.forEach(postulacion => {
      const dia = format(postulacion.createdAt, 'dd MMM', { locale: es })

      if (!grouped.has(dia)) {
        grouped.set(dia, {
          total: 0,
          step1: 0,
          step2: 0,
          step3: 0,
          step4: 0,
          step5: 0,
          step6: 0,
          completadas: 0,
        })
      }

      const data = grouped.get(dia)!
      data.total++

      // Contar TODAS las etapas que completó (no solo donde se quedó)
      if (postulacion.completedSteps && postulacion.completedSteps.length > 0) {
        postulacion.completedSteps.forEach(step => {
          if (step === 1) data.step1++
          else if (step === 2) data.step2++
          else if (step === 3) data.step3++
          else if (step === 4) data.step4++
          else if (step === 5) data.step5++
          else if (step === 6) data.step6++
        })
      }

      if (postulacion.status === 'COMPLETED') {
        data.completadas++
      }
    })

    // Generar todos los días en el rango (para tener continuidad)
    const allDays: Array<{
      dia: string
      date: Date
      total: number
      step1: number
      step2: number
      step3: number
      step4: number
      step5: number
      step6: number
      completadas: number
    }> = []
    const currentDate = new Date(start)

    while (currentDate <= end) {
      const diaLabel = format(currentDate, 'dd MMM', { locale: es })
      const data = grouped.get(diaLabel) || {
        total: 0,
        step1: 0,
        step2: 0,
        step3: 0,
        step4: 0,
        step5: 0,
        step6: 0,
        completadas: 0,
      }

      allDays.push({
        dia: diaLabel,
        date: new Date(currentDate),
        ...data,
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return allDays.map(({ dia, total, step1, step2, step3, step4, step5, step6, completadas }) => ({
      dia,
      total,
      '1. Contacto Básico': step1,
      '2. Datos Personales': step2,
      '3. Trabajo y Vehículo': step3,
      '4. Documentos': step4,
      '5. Info Adicional': step5,
      '6. Pago de Equipamiento': step6,
      'Completadas': completadas,
    }))
  }

  /**
   * Obtiene todas las estadísticas del dashboard de una vez
   */
  async getAllStats(options?: { startDate?: Date; endDate?: Date; groupBy?: 'day' | 'week' | 'month' }) {
    const { startDate, endDate, groupBy = 'week' } = options || {}

    const [
      mainStats,
      postulacionesStats,
      funnelData,
      visitasPorSemana,
      completadosPorSemana,
      abandonoPorStep,
      edadesPorRango,
      onboardingStats,
      asistenciasPorPeriodo,
      distribucionEstadosAsistencias,
      asistenciasProgramadasVsRealizadas,
      evolucionDiariaPostulaciones,
      evolucionPorEtapa,
    ] = await Promise.all([
      this.getMainStats(),
      this.getPostulacionesStats(startDate, endDate),
      this.getFunnelData(startDate, endDate),
      this.getVisitasPorSemana(startDate, endDate),
      this.getCompletadosPorSemana(startDate, endDate),
      this.getAbandonoPorStep(),
      this.getEdadesPorRango(),
      this.getOnboardingStats(startDate, endDate),
      this.getAsistenciasPorPeriodo(startDate, endDate, groupBy),
      this.getDistribucionEstadosAsistencias(startDate, endDate),
      this.getAsistenciasProgramadasVsRealizadas(startDate, endDate),
      this.getEvolucionDiariaPostulaciones(startDate, endDate),
      this.getEvolucionPorEtapa(startDate, endDate),
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
      asistenciasPorPeriodo,
      distribucionEstadosAsistencias,
      asistenciasProgramadasVsRealizadas,
      evolucionDiariaPostulaciones,
      evolucionPorEtapa,
    }
  }
}

export const dashboardService = new DashboardService()