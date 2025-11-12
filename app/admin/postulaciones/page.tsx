// app/admin/postulaciones/page.tsx

import { PostulacionesPageContent } from "@/components/admin/postulaciones-page-content"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import type { PostulacionFilters } from "@/types/postulacion-filters.types"

export const revalidate = 30

interface PageProps {
  searchParams: Promise<PostulacionFilters>
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
  if (sortBy === 'fullName' || sortBy === 'city' || sortBy === 'createdAt' || sortBy === 'currentStep') {    orderBy[sortBy] = sortOrder
  } else {
    orderBy.createdAt = 'desc'
  }

  // ==================== WHERE CLAUSE ====================
  const where: Prisma.FormDriverWhereInput = {}

  // Filtro de status general (incluye ASISTIDA)
  if (params.status && params.status !== 'all') {
    if (params.status === 'ASISTIDA') {
      // Filtrar por postulaciones asistidas
      where.assistedCompletion = true
      where.status = 'IN_PROGRESS'
    } else {
      where.status = params.status as any
    }
  }

  // ✅ Filtro de PASO ACTUAL
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
    // Crear fecha al inicio del día en zona horaria local (00:00:00)
    const startDate = new Date(params.startDate)
    startDate.setHours(0, 0, 0, 0)
    where.createdAt = { ...where.createdAt as any, gte: startDate }
  }

  if (params.endDate) {
    // Crear fecha al final del día en zona horaria local (23:59:59.999)
    const endDate = new Date(params.endDate)
    endDate.setHours(23, 59, 59, 999)
    where.createdAt = { ...where.createdAt as any, lte: endDate }
  }

  // ==================== QUERIES PARALELAS ====================
  const treintaDiasAtras = new Date()
  treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30)

  // Verificar si hay filtros POST-PROCESSING que requieren traer todos los datos
  const hasPostProcessingFilters = 
    (params.contactStatus && params.contactStatus !== 'all') ||
    (params.documentStatus && params.documentStatus !== 'all') ||
    (params.paymentStatus && params.paymentStatus !== 'all') ||
    (params.invoiceStatus && params.invoiceStatus !== 'all')

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
    // Si hay filtros POST-PROCESSING, traer todos los datos; si no, solo la página actual
    hasPostProcessingFilters
      ? prisma.formDriver.findMany({
          where,
          include: POSTULACION_INCLUDE,
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

  // ==================== POST-PROCESSING FILTERS ====================
  // Filtros que requieren cálculo después de traer los datos
  
  let postulaciones = postulacionesRaw

  // ✅ Filtro de CONTACTO
  if (params.contactStatus && params.contactStatus !== 'all') {
    postulaciones = postulaciones.filter(p => {
      const hasBeenContacted = (p.driverContacts?.length ?? 0) > 0
      const isRejected = p.status === 'REJECTED'
      const completedSteps = p.completedSteps?.length ?? 0
      
      // Calcular contactStatus
      let contactStatus = 'not-applicable'
      if (isRejected) {
        contactStatus = 'not-applicable'
      } else if (hasBeenContacted) {
        contactStatus = 'contacted'
      } else if (completedSteps > 0) {
        // Pendiente engloba tanto los casos urgentes (>=3 pasos) como los pendientes normales (>0 pasos)
        contactStatus = 'pending'
      }
      
      return contactStatus === params.contactStatus
    })
  }

  // ✅ Filtro de DOCUMENTOS
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

  // ✅ Filtro de PAGO
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

  // ✅ Filtro de FACTURACIÓN
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

  const stats = {
    totalPostulaciones: total,
    completadas,
    enProgreso,
    abandonadas,
    nuevasUltimos30Dias,
    tasaCompletado,
  }

  // Calcular total y paginación correctamente
  let finalTotal = totalFiltered
  let totalPages = 1
  let hasMore = false
  let postulacionesToShow = postulaciones

  if (hasPostProcessingFilters) {
    // Si hay filtros POST-PROCESSING, ya trajimos todos los datos
    // El total real es el número de resultados después del filtrado POST-PROCESSING
    finalTotal = postulaciones.length
    totalPages = Math.ceil(finalTotal / limit)
    
    // Aplicar paginación en memoria
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    postulacionesToShow = postulaciones.slice(startIndex, endIndex)
    
    hasMore = endIndex < postulaciones.length
  } else {
    // Si no hay filtros POST-PROCESSING, usamos el totalFiltered de la BD
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