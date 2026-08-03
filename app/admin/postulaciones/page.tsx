// app/admin/postulaciones/page.tsx

import { PostulacionesPageContent } from "@/components/admin/postulaciones-page-content"
import { prisma } from "@/lib/prisma"
import { assignDriverSlug } from "@/lib/services/postulacion.service"
import { Prisma } from "@prisma/client"
import type { PostulacionFilters } from "@/types/postulacion-filters.types"
import { RUC_FILTER_TO_DB, parseRucFilter } from "@/types/postulacion-filters.types"
import { unstable_cache } from 'next/cache'

export const revalidate = 0

interface PageProps {
  searchParams: Promise<PostulacionFilters>
}

// Select explícito: la tabla no necesita los Json pesados (rucApiRawResponse,
// metadata) ni campos de gestión que solo usa el detalle.
// Prisma resuelve cada relación anidada con una query secuencial adicional:
// las relaciones se parten en dos selects que corren en paralelo (merge por id)
// para acortar la cadena de roundtrips. notes/driverContacts solo se usan como
// conteo → _count (se resuelve como JOIN en la query principal, costo cero).
const POSTULACION_SELECT_MAIN: Prisma.FormDriverSelect = {
  id: true,
  slug: true,
  fullName: true,
  firstName: true,
  lastName: true,
  cedula: true,
  phoneNumber: true,
  email: true,
  birthDate: true,
  city: true,
  department: true,
  address: true,
  hasVehicle: true,
  vehicleBrand: true,
  vehicleModel: true,
  vehicleYear: true,
  emergencyName: true,
  emergencyPhone: true,
  workZone: true,
  status: true,
  currentStep: true,
  completedSteps: true,
  assistedCompletion: true,
  onboardingStatus: true,
  rucStatus: true,
  rucName: true,
  rucInactiveWaived: true,
  accessToken: true,
  approvalNotifiedAt: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  archivedAt: true,
  _count: {
    select: {
      notes: true,
      driverContacts: true,
    }
  },
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
      paymentProofUrl: true,
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 1
  },
}

const POSTULACION_SELECT_EXTRA: Prisma.FormDriverSelect = {
  id: true,
  agentRuns: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      mode: true,
      status: true,
      decision: true,
      summary: true,
      reasoning: true,
      model: true,
      inputTokens: true,
      outputTokens: true,
      costMicroUsd: true,
      createdAt: true,
      error: true,
      humanFeedback: true,
      humanFeedbackNote: true,
      humanFeedbackAt: true,
      actions: {
        select: { id: true, tool: true, input: true, reasoning: true, status: true },
        orderBy: { createdAt: 'asc' },
      },
    },
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
}

export default async function PostulacionesPage({ searchParams }: PageProps) {
  const params = await searchParams

  const page = params.page ? parseInt(params.page) : 1
  const limit = 50

  // ==================== ORDENAMIENTO ====================
  const sortBy = params.sortBy || 'createdAt'
  const sortOrder = params.sortOrder || 'desc'

  const primaryOrder: Prisma.FormDriverOrderByWithRelationInput = {}
  if (sortBy === 'fullName' || sortBy === 'city' || sortBy === 'createdAt' || sortBy === 'currentStep') {
    (primaryOrder as Record<string, string>)[sortBy] = sortOrder
  } else {
    primaryOrder.createdAt = 'desc'
  }
  // Tiebreak determinístico: los dos selects paginados deben devolver
  // exactamente el mismo conjunto de filas para poder mergear por id.
  const orderBy: Prisma.FormDriverOrderByWithRelationInput[] = [primaryOrder, { id: 'desc' }]

  const isPaymentProofFilter = params.paymentStatus === 'payment-proof'

  // ==================== WHERE CLAUSE ====================
  const where: Prisma.FormDriverWhereInput = {}

  // Archivadas: excluidas por defecto de todas las vistas de trabajo
  const showArchived = params.archived === 'true'
  where.archivedAt = showArchived ? { not: null } : null

  if (params.status && params.status !== 'all' && !isPaymentProofFilter) {
    if (params.status === 'ASISTIDA') {
      where.assistedCompletion = true
      where.status = 'IN_PROGRESS'
    } else {
      where.status = params.status as Prisma.EnumFormDriverStatusFilter
    }
  }

  if (params.currentStep && params.currentStep !== 'all') {
    where.currentStep = parseInt(params.currentStep)
  }

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
      // Translated to DB filter below
    } else if (params.onboardingStatus === 'scheduled-pending') {
      // Translated to DB filter below
    } else if (params.onboardingStatus === 'completed') {
      where.onboardingStatus = 'COMPLETED'
    }
  }

  if (params.hasVehicle === 'yes') {
    where.hasVehicle = true
  } else if (params.hasVehicle === 'no') {
    where.hasVehicle = false
  }

  if (params.workZone && params.workZone !== 'all') {
    where.workZone = {
      contains: params.workZone
    }
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

  const rucSlugs = parseRucFilter(params.rucStatus)
  if (rucSlugs.length > 0) {
    const includeNotChecked = rucSlugs.includes('no-consultado')
    const dbValues = rucSlugs
      .filter((slug) => slug !== 'no-consultado')
      .map((slug) => RUC_FILTER_TO_DB[slug as Exclude<typeof slug, 'no-consultado'>])
      .filter(Boolean)

    if (includeNotChecked) {
      const orClauses: Prisma.FormDriverWhereInput[] = [
        { rucStatus: null },
        { rucStatus: 'NOT_CHECKED' },
      ]
      if (dbValues.length > 0) orClauses.push({ rucStatus: { in: dbValues } })
      where.AND = [...((where.AND as Prisma.FormDriverWhereInput[]) || []), { OR: orClauses }]
    } else if (dbValues.length > 0) {
      where.rucStatus = { in: dbValues }
    }
  }

  if (params.startDate) {
    const startDate = new Date(params.startDate)
    startDate.setHours(0, 0, 0, 0)
    where.createdAt = { ...(where.createdAt as Prisma.DateTimeFilter), gte: startDate }
  }

  if (params.endDate) {
    const endDate = new Date(params.endDate)
    endDate.setHours(23, 59, 59, 999)
    where.createdAt = { ...(where.createdAt as Prisma.DateTimeFilter), lte: endDate }
  }

  // ==================== QUICK-FILTER FLAGS ====================
  const isPendingScheduleFilter =
    params.onboardingStatus === 'pending' &&
    params.status === 'COMPLETED' &&
    !params.documentStatus

  const isScheduledNoShowFilter =
    params.onboardingStatus === 'scheduled-no-show' &&
    params.status === 'COMPLETED'

  const isScheduledPendingFilter =
    params.onboardingStatus === 'scheduled-pending' &&
    params.status === 'COMPLETED'

  const isReviewFilter =
    params.status === 'COMPLETED' &&
    !params.onboardingStatus &&
    !params.documentStatus &&
    !params.paymentStatus

  const isRejectedFilter = params.status === 'REJECTED'

  // ==================== TRANSLATE ALL FILTERS TO DB WHERE ====================

  // 1. isPendingScheduleFilter: cedula + criminal_record both APPROVED
  if (isPendingScheduleFilter) {
    where.AND = [
      ...((where.AND as Prisma.FormDriverWhereInput[]) ?? []),
      { documents: { some: { documentType: 'CEDULA', status: 'APPROVED' } } },
      { documents: { some: { documentType: 'CRIMINAL_RECORD', status: 'APPROVED' } } },
    ]
  }

  // 2. isScheduledNoShowFilter: onboardingStatus NO_SHOW or any attendance NO_SHOW
  if (isScheduledNoShowFilter) {
    where.status = 'COMPLETED'
    where.onboardingStatus = { not: 'COMPLETED' }
    where.OR = [
      { onboardingStatus: 'NO_SHOW' },
      { onboardingAttendances: { some: { status: 'NO_SHOW' } } },
    ]
  }

  // 3. isScheduledPendingFilter: SCHEDULED or IN_PROGRESS, no NO_SHOW attendance
  if (isScheduledPendingFilter) {
    where.status = 'COMPLETED'
    where.onboardingStatus = { in: ['SCHEDULED', 'IN_PROGRESS'] }
    where.onboardingAttendances = { none: { status: 'NO_SHOW' } }
  }

  // 4. isReviewFilter: both doc types present, none APPROVED, none REJECTED
  if (isReviewFilter) {
    where.status = 'COMPLETED'
    where.AND = [
      ...((where.AND as Prisma.FormDriverWhereInput[]) ?? []),
      { documents: { some: { documentType: 'CEDULA' } } },
      { documents: { some: { documentType: 'CRIMINAL_RECORD' } } },
      { documents: { none: { documentType: 'CEDULA', status: 'APPROVED' } } },
      { documents: { none: { documentType: 'CRIMINAL_RECORD', status: 'APPROVED' } } },
      { documents: { none: { documentType: 'CEDULA', status: 'REJECTED' } } },
      { documents: { none: { documentType: 'CRIMINAL_RECORD', status: 'REJECTED' } } },
    ]
  }

  // 5. isRejectedFilter: status REJECTED OR red docs (rejected in any main doc type without an approved)
  if (isRejectedFilter) {
    // Remove the simple status filter set earlier; replace with OR
    delete where.status
    where.OR = [
      { status: 'REJECTED' },
      {
        AND: [
          { documents: { some: { documentType: 'CEDULA', status: 'REJECTED' } } },
          { documents: { none: { documentType: 'CEDULA', status: 'APPROVED' } } },
        ],
      },
      {
        AND: [
          { documents: { some: { documentType: 'CRIMINAL_RECORD', status: 'REJECTED' } } },
          { documents: { none: { documentType: 'CRIMINAL_RECORD', status: 'APPROVED' } } },
        ],
      },
    ]
  }

  // 6. isPaymentProofFilter: payment PENDING with a proof URL
  if (isPaymentProofFilter) {
    where.equipmentPayments = {
      some: {
        status: 'PENDING',
        paymentProofUrl: { not: null },
      },
    }
  }

  // 7. contactStatus filter
  if (params.contactStatus && params.contactStatus !== 'all') {
    if (params.contactStatus === 'contacted') {
      where.driverContacts = { some: {} }
    } else if (params.contactStatus === 'pending') {
      where.status = { not: 'REJECTED' } as Prisma.EnumFormDriverStatusFilter
      where.driverContacts = { none: {} }
      where.AND = [
        ...((where.AND as Prisma.FormDriverWhereInput[]) ?? []),
        { completedSteps: { isEmpty: false } },
      ]
    } else if (params.contactStatus === 'not-applicable') {
      where.status = 'REJECTED'
    }
  }

  // 8. documentStatus filter
  if (params.documentStatus && params.documentStatus !== 'all') {
    if (params.documentStatus === 'pendientes') {
      where.OR = [
        { documents: { none: { documentType: 'CRIMINAL_RECORD' } } },
        { documents: { none: { documentType: 'CEDULA' } } },
        { documents: { some: { documentType: { in: ['CRIMINAL_RECORD', 'CEDULA'] }, status: 'REJECTED' } } },
      ]
    } else if (params.documentStatus === 'en-revision') {
      where.AND = [
        ...((where.AND as Prisma.FormDriverWhereInput[]) ?? []),
        { documents: { some: { documentType: 'CEDULA' } } },
        { documents: { some: { documentType: 'CRIMINAL_RECORD' } } },
        { documents: { none: { documentType: { in: ['CRIMINAL_RECORD', 'CEDULA'] }, status: 'REJECTED' } } },
        { documents: { some: { documentType: { in: ['CRIMINAL_RECORD', 'CEDULA'] }, status: { in: ['PENDING', 'IN_REVIEW'] } } } },
      ]
    } else if (params.documentStatus === 'completos') {
      where.AND = [
        ...((where.AND as Prisma.FormDriverWhereInput[]) ?? []),
        { documents: { some: { documentType: 'CEDULA', status: 'APPROVED' } } },
        { documents: { some: { documentType: 'CRIMINAL_RECORD', status: 'APPROVED' } } },
        { documents: { none: { documentType: { in: ['CRIMINAL_RECORD', 'CEDULA'] }, status: { in: ['PENDING', 'IN_REVIEW', 'REJECTED'] } } } },
      ]
    }
  }

  // 9. paymentStatus filter (excluding payment-proof handled above)
  if (params.paymentStatus && params.paymentStatus !== 'all' && params.paymentStatus !== 'payment-proof') {
    if (params.paymentStatus === 'verificado') {
      where.equipmentPayments = { some: { status: 'VERIFIED' } }
    } else if (params.paymentStatus === 'en-verificacion') {
      where.equipmentPayments = { some: { status: { in: ['PENDING', 'PARTIAL'] } } }
    } else if (params.paymentStatus === 'pendiente') {
      where.equipmentPayments = { none: {} }
    }
  }

  // 10. invoiceStatus filter
  if (params.invoiceStatus && params.invoiceStatus !== 'all') {
    if (params.invoiceStatus === 'completa') {
      where.documents = { some: { documentType: 'TAX_COMPLIANCE', status: 'APPROVED' } }
    } else if (params.invoiceStatus === 'na') {
      where.AND = [
        ...((where.AND as Prisma.FormDriverWhereInput[]) ?? []),
        { documents: { none: { documentType: 'TAX_COMPLIANCE', status: 'APPROVED' } } },
        { financialService: { hasInvoice: false } },
      ]
    } else if (params.invoiceStatus === 'pendiente') {
      where.AND = [
        ...((where.AND as Prisma.FormDriverWhereInput[]) ?? []),
        { documents: { none: { documentType: 'TAX_COMPLIANCE', status: 'APPROVED' } } },
        {
          OR: [
            { financialService: null },
            { financialService: { hasInvoice: true } },
          ],
        },
      ]
    }
  }

  // ==================== QUERIES ====================
  // Static queries (don't depend on active filters) → cached 60s
  const getStaticData = unstable_cache(
    async () => {
      const d30ago = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const d60ago = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      const [
        qNoShow, qScheduledPending, qTrained, qPendingSchedule, qReview, qRejected, qPaymentProof,
        qArchived,
        statusGroups,
        nuevasUltimos30Dias,
        nuevasLast30, nuevasPrior30,
        completadasLast30, completadasPrior30,
        agendadosLast30, agendadosPrior30,
        capacitadasLast30, capacitadasPrior30,
      ] = await Promise.all([
        prisma.formDriver.count({
          where: {
            archivedAt: null,
            status: 'COMPLETED',
            onboardingStatus: { not: 'COMPLETED' },
            OR: [
              { onboardingStatus: 'NO_SHOW' },
              { onboardingAttendances: { some: { status: 'NO_SHOW' } } },
            ],
          },
        }),
        prisma.formDriver.count({
          where: {
            archivedAt: null,
            status: 'COMPLETED',
            onboardingStatus: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            onboardingAttendances: { none: { status: 'NO_SHOW' } },
          },
        }),
        prisma.formDriver.count({ where: { archivedAt: null, status: 'COMPLETED', onboardingStatus: 'COMPLETED' } }),
        prisma.formDriver.count({
          where: {
            archivedAt: null,
            status: 'COMPLETED',
            OR: [{ onboardingStatus: 'NOT_READY' }, { onboardingStatus: 'READY' }, { onboardingStatus: null }],
            AND: [
              { documents: { some: { documentType: 'CEDULA', status: 'APPROVED' } } },
              { documents: { some: { documentType: 'CRIMINAL_RECORD', status: 'APPROVED' } } },
            ],
          },
        }),
        prisma.formDriver.count({
          where: {
            archivedAt: null,
            status: 'COMPLETED',
            OR: [{ onboardingStatus: 'NOT_READY' }, { onboardingStatus: 'READY' }, { onboardingStatus: null }],
            AND: [
              { documents: { some: { documentType: 'CEDULA' } } },
              { documents: { some: { documentType: 'CRIMINAL_RECORD' } } },
              { documents: { none: { documentType: 'CEDULA', status: 'APPROVED' } } },
            ],
          },
        }),
        prisma.formDriver.count({ where: { archivedAt: null, status: 'REJECTED' } }),
        prisma.formDriver.count({
          where: { archivedAt: null, equipmentPayments: { some: { status: 'PENDING', paymentProofUrl: { not: null } } } },
        }),
        prisma.formDriver.count({ where: { archivedAt: { not: null } } }),
        prisma.formDriver.groupBy({ by: ['status'], _count: { _all: true }, where: { archivedAt: null } }),
        prisma.formDriver.count({ where: { createdAt: { gte: d30ago } } }),
        prisma.formDriver.count({ where: { createdAt: { gte: d30ago } } }),
        prisma.formDriver.count({ where: { createdAt: { gte: d60ago, lt: d30ago } } }),
        prisma.formDriver.count({ where: { status: 'COMPLETED', createdAt: { gte: d30ago } } }),
        prisma.formDriver.count({ where: { status: 'COMPLETED', createdAt: { gte: d60ago, lt: d30ago } } }),
        prisma.formDriver.count({ where: { onboardingStatus: { in: ['SCHEDULED', 'IN_PROGRESS'] }, onboardingScheduledAt: { gte: d30ago } } }),
        prisma.formDriver.count({ where: { onboardingStatus: { in: ['SCHEDULED', 'IN_PROGRESS'] }, onboardingScheduledAt: { gte: d60ago, lt: d30ago } } }),
        prisma.formDriver.count({ where: { onboardingStatus: 'COMPLETED', onboardingCompletedAt: { gte: d30ago } } }),
        prisma.formDriver.count({ where: { onboardingStatus: 'COMPLETED', onboardingCompletedAt: { gte: d60ago, lt: d30ago } } }),
      ])
      return {
        qNoShow, qScheduledPending, qTrained, qPendingSchedule, qReview, qRejected, qPaymentProof,
        qArchived,
        statusGroups, nuevasUltimos30Dias,
        nuevasLast30, nuevasPrior30,
        completadasLast30, completadasPrior30,
        agendadosLast30, agendadosPrior30,
        capacitadasLast30, capacitadasPrior30,
      }
    },
    ['postulaciones-static-counts-v3'],
    { revalidate: 60 }
  )

  // Filter-dependent queries run fresh on every filter change
  const pagination = { where, orderBy, skip: (page - 1) * limit, take: limit }
  const [staticData, totalFiltered, mainRows, extraRows] = await Promise.all([
    getStaticData(),
    prisma.formDriver.count({ where }),
    prisma.formDriver.findMany({ ...pagination, select: POSTULACION_SELECT_MAIN }),
    prisma.formDriver.findMany({ ...pagination, select: POSTULACION_SELECT_EXTRA }),
  ])

  const extraById = new Map(extraRows.map((r) => [r.id, r]))
  const postulaciones = mainRows.map((row) => ({
    ...row,
    agentRuns: extraById.get(row.id)?.agentRuns ?? [],
    financialService: extraById.get(row.id)?.financialService ?? null,
    onboardingAttendances: extraById.get(row.id)?.onboardingAttendances ?? [],
  }))

  // Auto-curación: postulaciones creadas por código previo al slug limpio
  const sinSlug = postulaciones.filter((p) => !p.slug)
  if (sinSlug.length > 0) {
    await Promise.all(
      sinSlug.map(async (p) => {
        const name = p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ')
        p.slug = await assignDriverSlug(p.id, name)
      })
    )
  }

  const {
    qNoShow, qScheduledPending, qTrained, qPendingSchedule, qReview, qRejected, qPaymentProof,
    qArchived,
    statusGroups, nuevasUltimos30Dias,
    nuevasLast30, nuevasPrior30,
    completadasLast30, completadasPrior30,
    agendadosLast30, agendadosPrior30,
    capacitadasLast30, capacitadasPrior30,
  } = staticData

  // Derive totals from groupBy result
  const countByStatus = Object.fromEntries(
    statusGroups.map((g) => [g.status, g._count._all])
  )
  const total = statusGroups.reduce((sum, g) => sum + g._count._all, 0)
  const completadas = countByStatus['COMPLETED'] ?? 0
  const enProgreso = countByStatus['IN_PROGRESS'] ?? 0
  const abandonadas = countByStatus['ABANDONED'] ?? 0

  const quickFilterCounts = {
    'scheduled-no-show': qNoShow,
    'scheduled-pending': qScheduledPending,
    trained: qTrained,
    'pending-schedule': qPendingSchedule,
    review: qReview,
    'pending-completion': enProgreso,
    rejected: qRejected,
    'payment-proof': qPaymentProof,
    archived: qArchived,
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
    kpis7d: {
      iniciadas:   { current: nuevasLast30,      prior: nuevasPrior30 },
      completadas: { current: completadasLast30, prior: completadasPrior30 },
      agendados:   { current: agendadosLast30,   prior: agendadosPrior30 },
      capacitados: { current: capacitadasLast30, prior: capacitadasPrior30 },
    },
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
        rucStatus: params.rucStatus,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        archived: params.archived,
      }}
    />
  )
}
