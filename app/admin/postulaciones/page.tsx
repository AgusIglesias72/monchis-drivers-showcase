// app/admin/postulaciones/page.tsx

import { PostulacionesPageContent } from "@/components/admin/postulaciones-page-content"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const revalidate = 30

interface PageProps {
  searchParams: Promise<{
    status?: string
    search?: string
    onboardingStatus?: string
    hasVehicle?: string
    startDate?: string
    endDate?: string
    page?: string
    sortBy?: string
    sortOrder?: string
  }>
}

// ✅ INCLUDE OPTIMIZADO - Solo lo necesario para mostrar badges
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
  }
}

export default async function PostulacionesPage({ searchParams }: PageProps) {
  const params = await searchParams
  
  const page = params.page ? parseInt(params.page) : 1
  const limit = 50 // ✅ AUMENTADO A 50

  // ==================== ORDENAMIENTO ====================
  const sortBy = params.sortBy || 'createdAt'
  const sortOrder = params.sortOrder || 'desc'
  
  // Construir el orderBy dinámico
  const orderBy: any = {}
  if (sortBy === 'fullName' || sortBy === 'city' || sortBy === 'status' || sortBy === 'createdAt') {
    orderBy[sortBy] = sortOrder
  } else {
    orderBy.createdAt = 'desc' // fallback
  }

  // ==================== WHERE CLAUSE ====================
  const where: Prisma.FormDriverWhereInput = {}

  // Filtro de status general
  if (params.status && params.status !== 'all') {
    where.status = params.status as any
  }

  // ✅ FILTRO DE ONBOARDING CORREGIDO
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
    where.createdAt = { ...where.createdAt as any, gte: new Date(params.startDate) }
  }

  if (params.endDate) {
    where.createdAt = { ...where.createdAt as any, lte: new Date(params.endDate) }
  }

  // ==================== QUERIES PARALELAS OPTIMIZADAS ====================
  const treintaDiasAtras = new Date()
  treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30)

  // ✅ EJECUTAR TODAS LAS QUERIES EN PARALELO
  const [
    total,
    completadas,
    enProgreso,
    abandonadas,
    nuevasUltimos30Dias,
    totalFiltered,
    postulaciones
  ] = await Promise.all([
    // Stats globales
    prisma.formDriver.count(),
    prisma.formDriver.count({ where: { status: 'COMPLETED' } }),
    prisma.formDriver.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.formDriver.count({ where: { status: 'ABANDONED' } }),
    prisma.formDriver.count({ where: { createdAt: { gte: treintaDiasAtras } } }),
    
    // Data filtrada
    prisma.formDriver.count({ where }),
    prisma.formDriver.findMany({
      where,
      include: POSTULACION_INCLUDE,
      orderBy: orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  const tasaCompletado = total > 0 ? Math.round((completadas / total) * 100) : 0

  const stats = {
    totalPostulaciones: total,
    completadas,
    enProgreso,
    abandonadas,
    nuevasUltimos30Dias,
    tasaCompletado,
  }

  const totalPages = Math.ceil(totalFiltered / limit)
  const hasMore = page < totalPages

  return (
    <PostulacionesPageContent
      stats={stats}
      postulaciones={postulaciones}
      total={totalFiltered}
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
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      }}
    />
  )
}