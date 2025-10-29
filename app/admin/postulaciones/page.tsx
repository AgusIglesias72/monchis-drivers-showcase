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
  }>
}

// ✅ INCLUDE CORRECTO CON CAMPOS REALES DEL SCHEMA
const POSTULACION_INCLUDE = {
  documents: {
    select: {
      id: true,
      documentType: true,
      status: true, // ✅ (no verificationStatus)
      blobUrl: true,
      fileName: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc' as const
    }
  },
  equipmentPayments: {
    select: {
      id: true,
      amount: true,
      paymentMethod: true,
      status: true, // ✅ (no verificationStatus)
      paymentNumber: true, // ✅ existe
      invoiceNumber: true, // ✅ existe
      paymentProofUrl: true, // ✅ (no receiptUrl)
      paymentDate: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc' as const
    },
    take: 1
  },
  financialService: {
    select: {
      id: true,
      hasInvoice: true,
      taxComplianceUrl: true,
      interestedInConto: true,
      contoStatus: true,
      createdAt: true,
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
          location: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc' as const
    },
    take: 1
  }
} satisfies Prisma.FormDriverInclude

export default async function PostulacionesPage({ searchParams }: PageProps) {
  const params = await searchParams
  
  const page = params.page ? parseInt(params.page) : 1
  const limit = 20

  // ==================== WHERE CLAUSE ====================
  const where: Prisma.FormDriverWhereInput = {}

  if (params.status && params.status !== 'all') {
    where.status = params.status as any
  }

  if (params.onboardingStatus && params.onboardingStatus !== 'all') {
    where.onboardingStatus = params.onboardingStatus as any
  }

  if (params.hasVehicle === 'yes') {
    where.hasVehicle = true
  } else if (params.hasVehicle === 'no') {
    where.hasVehicle = false
  }

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

  if (params.startDate) {
    where.createdAt = { ...where.createdAt as any, gte: new Date(params.startDate) }
  }

  if (params.endDate) {
    where.createdAt = { ...where.createdAt as any, lte: new Date(params.endDate) }
  }

  // ==================== STATS ====================
  const treintaDiasAtras = new Date()
  treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30)

  const [total, completadas, enProgreso, abandonadas, nuevasUltimos30Dias] = await Promise.all([
    prisma.formDriver.count(),
    prisma.formDriver.count({ where: { status: 'COMPLETED' } }),
    prisma.formDriver.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.formDriver.count({ where: { status: 'ABANDONED' } }),
    prisma.formDriver.count({ where: { createdAt: { gte: treintaDiasAtras } } }),
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

  // ==================== DATA ====================
  const [totalFiltered, postulaciones] = await Promise.all([
    prisma.formDriver.count({ where }),
    prisma.formDriver.findMany({
      where,
      include: POSTULACION_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

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
      }}
    />
  )
}