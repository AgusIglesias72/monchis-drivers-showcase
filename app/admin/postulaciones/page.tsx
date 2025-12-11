// app/admin/postulaciones/page.tsx

import { PostulacionesPageContent } from "@/components/admin/postulaciones-page-content"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import type { PostulacionFilters } from "@/types/postulacion-filters.types"

export const revalidate = 30

interface PageProps {
  searchParams: Promise<PostulacionFilters>
}

// ✅ HELPER: Calcular color de documentos
type DocColorStatus = 'green' | 'blue' | 'yellow' | 'red' | 'gray'

function calculateDocumentColorStatus(postulacion: any): DocColorStatus {
  const documents = postulacion.documents || []

  // Documentos de cédula
  const cedulaDocs = documents.filter((doc: any) =>
    doc.documentType === 'CEDULA' ||
    doc.documentType === 'CEDULA_FRONT' ||
    doc.documentType === 'CEDULA_BACK'
  )
  
  // Documentos de antecedentes
  const antecedentesDocs = documents.filter((doc: any) =>
    doc.documentType === 'CRIMINAL_RECORD' ||
    doc.documentType === 'ANTECEDENTES'
  )

  // Certificado tributario
  const taxDoc = documents.find((doc: any) => doc.documentType === 'TAX_COMPLIANCE')

  // Verificar si existen
  const hasCedulaDocs = cedulaDocs.length > 0
  const hasAntecedentesDocs = antecedentesDocs.length > 0

  // ⚪ GRIS: Documentos faltantes
  if (!hasCedulaDocs || !hasAntecedentesDocs) {
    return 'gray'
  }

  // Verificar si hay AL MENOS UNO aprobado en cada categoría
  const hasCedulaApproved = cedulaDocs.some((doc: any) => doc.status === 'APPROVED')
  const hasAntecedentesApproved = antecedentesDocs.some((doc: any) => doc.status === 'APPROVED')

  // Si no hay aprobados en alguna categoría
  if (!hasCedulaApproved || !hasAntecedentesApproved) {
    // Verificar si hay rechazados SIN aprobados
    const hasRejectedCedula = cedulaDocs.some((doc: any) => doc.status === 'REJECTED')
    const hasRejectedAntecedentes = antecedentesDocs.some((doc: any) => doc.status === 'REJECTED')
    
    // 🔴 ROJO: Hay rechazados pero NO hay aprobados
    if ((hasRejectedCedula && !hasCedulaApproved) || (hasRejectedAntecedentes && !hasAntecedentesApproved)) {
      return 'red'
    }
    
    // 🟡 AMARILLO: En revisión
    return 'yellow'
  }

  // En este punto: Cédula + Antecedentes tienen AL MENOS uno APROBADO
  
  // 🟢 VERDE: Cert. Tributario también aprobado
  if (taxDoc && taxDoc.status === 'APPROVED') {
    return 'green'
  }

  // 🔵 AZUL: Falta Cert. Tributario
  return 'blue'
}

// ✅ INCLUDE OPTIMIZADO
const POSTULACION_INCLUDE: Prisma.FormDriverInclude = {
  documents: {
    select: {
      id: true,
      documentType: true,
      status: true,
    }
  },
  equipmentPayments: {
    select: {
      id: true,
      status: true,
      paymentDate: true,
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 1
  },
  financialService: {
    select: {
      id: true,
      hasInvoice: true,
    }
  },
  onboardingAttendances: {
    select: {
      id: true,
      status: true,
      createdAt: true,
      event: {
        select: {
          id: true,
          scheduledDate: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 1
  },
  driverContacts: {
    select: {
      id: true,
      contactedAt: true,
      contactMethod: true,
      contactedBy: true,
    },
    orderBy: {
      contactedAt: 'desc'
    },
    take: 1
  }
}

export default async function PostulacionesPage({ searchParams }: PageProps) {
  const params = await searchParams
  
  const page = params.page ? parseInt(params.page) : 1
  const limit = 50

  // ==================== ORDENAMIENTO ====================
  const sortBy = params.sortBy || 'createdAt'
  const sortOrder = params.sortOrder || 'desc'
  
  const orderBy: any = {}
  if (sortBy === 'fullName' || sortBy === 'city' || sortBy === 'createdAt' || sortBy === 'currentStep') {
    orderBy[sortBy] = sortOrder
  } else {
    orderBy.createdAt = 'desc'
  }

  // ==================== WHERE CLAUSE ====================
  const where: Prisma.FormDriverWhereInput = {}

  // Filtro de status general (incluye ASISTIDA)
  if (params.status && params.status !== 'all') {
    if (params.status === 'ASISTIDA') {
      where.assistedCompletion = true
      where.status = 'IN_PROGRESS'
    } else {
      where.status = params.status as any
    }
  }

  // Filtro de PASO ACTUAL
  if (params.currentStep && params.currentStep !== 'all') {
    where.currentStep = parseInt(params.currentStep)
  }

  // Filtro de onboarding
  if (params.onboardingStatus && params.onboardingStatus !== 'all') {
    if (params.onboardingStatus === 'pending') {
      where.OR = [
        { onboardingStatus: 'NOT_READY' },
        { onboardingStatus: 'READY' },
        { onboardingStatus: null },
      ]
    } else if (params.onboardingStatus === 'scheduled') {
      where.onboardingStatus = 'SCHEDULED'
    } else if (params.onboardingStatus === 'scheduled-no-show') {
      // Para "No Asistieron", traemos todas las completadas y filtramos en post-processing
      // porque necesitamos verificar también el status de attendance
      // No agregamos filtro aquí, se filtra en post-processing
    } else if (params.onboardingStatus === 'scheduled-pending') {
      // Postulaciones agendadas pero pendientes (SCHEDULED o IN_PROGRESS, pero no NO_SHOW ni COMPLETED)
      where.OR = [
        { onboardingStatus: 'SCHEDULED' },
        { onboardingStatus: 'IN_PROGRESS' },
      ]
    } else if (params.onboardingStatus === 'completed') {
      where.onboardingStatus = 'COMPLETED'
    }
  }

  // Filtro de vehículo
  if (params.hasVehicle === 'yes') {
    where.hasVehicle = true
  } else if (params.hasVehicle === 'no') {
    where.hasVehicle = false
  }

  // Filtro de búsqueda
  if (params.search) {
    where.OR = [
      { fullName: { contains: params.search, mode: 'insensitive' } },
      { firstName: { contains: params.search, mode: 'insensitive' } },
      { lastName: { contains: params.search, mode: 'insensitive' } },
      { cedula: { contains: params.search } },
      { phoneNumber: { contains: params.search } },
      { email: { contains: params.search, mode: 'insensitive' } },
    ]
  }

  // Filtro de fechas
  if (params.startDate) {
    const startDate = new Date(params.startDate)
    startDate.setHours(0, 0, 0, 0)
    where.createdAt = { ...where.createdAt as any, gte: startDate }
  }

  if (params.endDate) {
    const endDate = new Date(params.endDate)
    endDate.setHours(23, 59, 59, 999)
    where.createdAt = { ...where.createdAt as any, lte: endDate }
  }

  // ==================== QUERIES PARALELAS ====================
  const treintaDiasAtras = new Date()
  treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30)

  // ✅ Detectar quick filters que necesitan filtrado por color de documentos o attendance
  const isPendingScheduleFilter = 
    params.onboardingStatus === 'pending' && 
    params.status === 'COMPLETED' &&
    !params.documentStatus // Para asegurar que viene del quick filter

  const isScheduledNoShowFilter = 
    params.onboardingStatus === 'scheduled-no-show' && 
    params.status === 'COMPLETED'

  const isScheduledPendingFilter = 
    params.onboardingStatus === 'scheduled-pending' && 
    params.status === 'COMPLETED'

  const isReviewFilter = 
    params.status === 'COMPLETED' && 
    !params.onboardingStatus &&
    !params.documentStatus // Para asegurar que es el quick filter "Revisar Postulación"

  const isRejectedFilter = params.status === 'REJECTED'

  // Verificar si hay filtros POST-PROCESSING que requieren traer todos los datos
  const hasPostProcessingFilters = 
    isPendingScheduleFilter ||
    isScheduledNoShowFilter ||
    isScheduledPendingFilter ||
    isReviewFilter ||
    isRejectedFilter ||
    (params.contactStatus && params.contactStatus !== 'all') ||
    (params.documentStatus && params.documentStatus !== 'all') ||
    (params.paymentStatus && params.paymentStatus !== 'all') ||
    (params.invoiceStatus && params.invoiceStatus !== 'all')

  // ✅ Calcular conteos de filtros rápidos
  // Necesitamos traer todas las postulaciones completadas y rechazadas para calcular conteos basados en documentos
  const [completadasForCounts, rechazadasForCounts] = await Promise.all([
    prisma.formDriver.findMany({
      where: { status: 'COMPLETED' },
      include: {
        ...POSTULACION_INCLUDE,
        onboardingAttendances: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            event: {
              select: {
                id: true,
                scheduledDate: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          // Traemos todas las asistencias para calcular correctamente NO_SHOW
        }
      },
    }),
    prisma.formDriver.findMany({
      where: { status: 'REJECTED' },
      include: POSTULACION_INCLUDE,
    }),
  ])

  // Calcular conteos de filtros rápidos
  const quickFilterCounts = {
    'scheduled-no-show': completadasForCounts.filter(p => {
      // Excluir los que ya completaron el onboarding
      if (p.onboardingStatus === 'COMPLETED') return false
      
      // Postulaciones con onboardingStatus = 'NO_SHOW'
      if (p.onboardingStatus === 'NO_SHOW') return true
      // O que tengan alguna asistencia marcada como NO_SHOW
      const attendances = p.onboardingAttendances || []
      return attendances.some((att: any) => att.status === 'NO_SHOW')
    }).length,
    'scheduled-pending': completadasForCounts.filter(p => {
      // Postulaciones agendadas pero que aún no completaron ni son no-show
      const isScheduled = p.onboardingStatus === 'SCHEDULED' || p.onboardingStatus === 'IN_PROGRESS'
      const isNoShow = p.onboardingStatus === 'NO_SHOW'
      const isCompleted = p.onboardingStatus === 'COMPLETED'
      const attendance = p.onboardingAttendances?.[0]
      const attendanceIsNoShow = attendance?.status === 'NO_SHOW'
      
      return isScheduled && !isNoShow && !isCompleted && !attendanceIsNoShow
    }).length,
    trained: completadasForCounts.filter(p => p.onboardingStatus === 'COMPLETED').length,
    'pending-schedule': completadasForCounts.filter(p => {
      const hasPendingOnboarding = !p.onboardingStatus || 
        p.onboardingStatus === 'NOT_READY' || 
        p.onboardingStatus === 'READY'
      if (!hasPendingOnboarding) return false
      const colorStatus = calculateDocumentColorStatus(p)
      return colorStatus === 'green' || colorStatus === 'blue'
    }).length,
    review: completadasForCounts.filter(p => {
      const colorStatus = calculateDocumentColorStatus(p)
      return colorStatus === 'yellow'
    }).length,
    'pending-completion': 0, // Se calcula con count directo
    rejected: rechazadasForCounts.length + completadasForCounts.filter(p => {
      const colorStatus = calculateDocumentColorStatus(p)
      return colorStatus === 'red'
    }).length,
  }

  const [
    total,
    completadas,
    enProgreso,
    abandonadas,
    nuevasUltimos30Dias,
    totalFiltered,
    postulacionesRaw
  ] = await Promise.all([
    prisma.formDriver.count(),
    prisma.formDriver.count({ where: { status: 'COMPLETED' } }),
    prisma.formDriver.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.formDriver.count({ where: { status: 'ABANDONED' } }),
    prisma.formDriver.count({ where: { createdAt: { gte: treintaDiasAtras } } }),
    prisma.formDriver.count({ where }),
    hasPostProcessingFilters
      ? prisma.formDriver.findMany({
          where,
          include: isScheduledNoShowFilter
            ? {
                ...POSTULACION_INCLUDE,
                onboardingAttendances: {
                  select: {
                    id: true,
                    status: true,
                    createdAt: true,
                    event: {
                      select: {
                        id: true,
                        scheduledDate: true,
                      }
                    }
                  },
                  orderBy: {
                    createdAt: 'desc'
                  },
                  // Para NO_SHOW, traemos todas las asistencias para verificar correctamente
                }
              }
            : POSTULACION_INCLUDE,
          orderBy: orderBy,
        })
      : prisma.formDriver.findMany({
          where,
          include: POSTULACION_INCLUDE,
          orderBy: orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
  ])

  quickFilterCounts['pending-completion'] = enProgreso

  // ==================== POST-PROCESSING FILTERS ====================
  
  let postulaciones = postulacionesRaw

  // ✅ Filtro "Pendiente de Agendar" - Docs verde o azul
  if (isPendingScheduleFilter) {
    postulaciones = postulaciones.filter(p => {
      const colorStatus = calculateDocumentColorStatus(p)
      return colorStatus === 'green' || colorStatus === 'blue'
    })
  }

  // ✅ Filtro "Agendados - No Asistieron" - NO_SHOW o attendance con NO_SHOW
  if (isScheduledNoShowFilter) {
    postulaciones = postulaciones.filter(p => {
      // Excluir los que ya completaron el onboarding (ya están capacitados)
      if (p.onboardingStatus === 'COMPLETED') return false
      
      // Postulaciones con onboardingStatus = 'NO_SHOW'
      if (p.onboardingStatus === 'NO_SHOW') return true
      
      // O que tengan alguna asistencia marcada como NO_SHOW
      const attendances = p.onboardingAttendances || []
      const hasNoShowAttendance = attendances.some((att: any) => att.status === 'NO_SHOW')
      if (hasNoShowAttendance) return true
      
      return false
    })
  }

  // ✅ Filtro "Agendados - Pendiente Capacitación" - SCHEDULED/IN_PROGRESS pero no NO_SHOW ni COMPLETED
  if (isScheduledPendingFilter) {
    postulaciones = postulaciones.filter(p => {
      const isScheduled = p.onboardingStatus === 'SCHEDULED' || p.onboardingStatus === 'IN_PROGRESS'
      const isNoShow = p.onboardingStatus === 'NO_SHOW'
      const isCompleted = p.onboardingStatus === 'COMPLETED'
      const attendance = p.onboardingAttendances?.[0]
      const attendanceIsNoShow = attendance?.status === 'NO_SHOW'
      
      return isScheduled && !isNoShow && !isCompleted && !attendanceIsNoShow
    })
  }

  // ✅ Filtro "Revisar Postulación" - Docs amarillo
  if (isReviewFilter) {
    postulaciones = postulaciones.filter(p => {
      const colorStatus = calculateDocumentColorStatus(p)
      return colorStatus === 'yellow'
    })
  }

  // ✅ Filtro "Rechazados" - Status REJECTED O docs rojos
  if (isRejectedFilter) {
    postulaciones = postulaciones.filter(p => {
      const colorStatus = calculateDocumentColorStatus(p)
      return p.status === 'REJECTED' || colorStatus === 'red'
    })
  }

  // Filtro de CONTACTO
  if (params.contactStatus && params.contactStatus !== 'all') {
    postulaciones = postulaciones.filter(p => {
      const hasBeenContacted = (p.driverContacts?.length ?? 0) > 0
      const isRejected = p.status === 'REJECTED'
      const completedSteps = p.completedSteps?.length ?? 0
      
      let contactStatus = 'not-applicable'
      if (isRejected) {
        contactStatus = 'not-applicable'
      } else if (hasBeenContacted) {
        contactStatus = 'contacted'
      } else if (completedSteps > 0) {
        contactStatus = 'pending'
      }
      
      return contactStatus === params.contactStatus
    })
  }

  // Filtro de DOCUMENTOS
  if (params.documentStatus && params.documentStatus !== 'all') {
    postulaciones = postulaciones.filter(p => {
      const documents = p.documents || []
      
      const criminalRecords = documents.filter(d => d.documentType === 'CRIMINAL_RECORD')
      const cedulaFront = documents.filter(d => d.documentType === 'CEDULA_FRONT')
      const cedulaBack = documents.filter(d => d.documentType === 'CEDULA_BACK')
      
      const hasCriminalRecord = criminalRecords.length > 0
      const hasCedula = cedulaFront.length > 0 || cedulaBack.length > 0
      
      if (!hasCriminalRecord || !hasCedula) {
        return params.documentStatus === 'pendientes'
      }
      
      const mainDocuments = [...criminalRecords, ...cedulaFront, ...cedulaBack]
      const hasRejected = mainDocuments.some(d => d.status === 'REJECTED')
      
      if (hasRejected) {
        return params.documentStatus === 'pendientes'
      }
      
      const hasPending = mainDocuments.some(d => d.status === 'PENDING' || d.status === 'IN_REVIEW')
      
      if (hasPending) {
        return params.documentStatus === 'en-revision'
      }
      
      const allApproved = mainDocuments.every(d => d.status === 'APPROVED')
      
      if (allApproved) {
        return params.documentStatus === 'completos'
      }
      
      return params.documentStatus === 'pendientes'
    })
  }

  // Filtro de PAGO
  if (params.paymentStatus && params.paymentStatus !== 'all') {
    postulaciones = postulaciones.filter(p => {
      const payment = p.equipmentPayments?.[0]
      
      if (!payment) {
        return params.paymentStatus === 'pendiente'
      }
      
      if (payment.status === 'VERIFIED') {
        return params.paymentStatus === 'verificado'
      }
      
      if (payment.status === 'PENDING' || payment.status === 'PARTIAL') {
        return params.paymentStatus === 'en-verificacion'
      }
      
      return params.paymentStatus === 'pendiente'
    })
  }

  // Filtro de FACTURACIÓN
  if (params.invoiceStatus && params.invoiceStatus !== 'all') {
    postulaciones = postulaciones.filter(p => {
      const financial = p.financialService
      const documents = p.documents || []
      
      const taxDoc = documents.find(d => d.documentType === 'TAX_COMPLIANCE')
      
      if (taxDoc && taxDoc.status === 'APPROVED') {
        return params.invoiceStatus === 'completa'
      }
      
      if (!financial) {
        return params.invoiceStatus === 'pendiente'
      }
      
      if (!financial.hasInvoice) {
        return params.invoiceStatus === 'na'
      }
      
      return params.invoiceStatus === 'pendiente'
    })
  }

  const tasaCompletado = total > 0 ? Math.round((completadas / total) * 100) : 0
  const capacitados = quickFilterCounts.trained
  const rechazados = quickFilterCounts.rejected

  const stats = {
    totalPostulaciones: total,
    completadas,
    enProgreso,
    abandonadas,
    nuevasUltimos30Dias,
    tasaCompletado,
    capacitados,
    rechazados,
  }

  // Calcular total y paginación correctamente
  let finalTotal = totalFiltered
  let totalPages = 1
  let hasMore = false
  let postulacionesToShow = postulaciones

  if (hasPostProcessingFilters) {
    finalTotal = postulaciones.length
    totalPages = Math.ceil(finalTotal / limit)
    
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    postulacionesToShow = postulaciones.slice(startIndex, endIndex)
    
    hasMore = endIndex < postulaciones.length
  } else {
    finalTotal = totalFiltered
    totalPages = Math.ceil(finalTotal / limit)
    hasMore = page < totalPages
    postulacionesToShow = postulaciones
  }

  return (
    <PostulacionesPageContent
      stats={stats}
      postulaciones={postulacionesToShow}
      total={finalTotal}
      currentPage={page}
      totalPages={totalPages}
      hasMore={hasMore}
      quickFilterCounts={quickFilterCounts}
      currentFilters={{
        status: params.status,
        search: params.search,
        onboardingStatus: params.onboardingStatus,
        hasVehicle: params.hasVehicle,
        startDate: params.startDate,
        endDate: params.endDate,
        currentStep: params.currentStep,
        contactStatus: params.contactStatus,
        documentStatus: params.documentStatus,
        paymentStatus: params.paymentStatus,
        invoiceStatus: params.invoiceStatus,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      }}
    />
  )
}