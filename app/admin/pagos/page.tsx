// app/admin/pagos/page.tsx

import { PagosPageContent } from "@/components/admin/pagos-page-content"
import { prisma } from "@/lib/prisma"

export const revalidate = 30

const PAGE_SIZE = 500

export default async function PagosPage() {
  const [pagos, statusCounts, amountAgg] = await Promise.all([
    prisma.equipmentPayment.findMany({
      take: PAGE_SIZE,
      include: {
        formDriver: {
          select: {
            id: true,
            fullName: true,
            firstName: true,
            lastName: true,
            cedula: true,
            phoneNumber: true,
            email: true,
            status: true,
          },
        },
        verifiedByUser: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.equipmentPayment.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.equipmentPayment.aggregate({
      _sum: { amount: true },
      _avg: { amount: true },
      _count: { id: true },
    }),
  ])

  const countByStatus = Object.fromEntries(
    statusCounts.map(row => [row.status, row._count.id])
  )

  const stats = {
    total: amountAgg._count.id,
    verified: countByStatus['VERIFIED'] ?? 0,
    pending: countByStatus['PENDING'] ?? 0,
    rejected: countByStatus['REJECTED'] ?? 0,
    partial: countByStatus['PARTIAL'] ?? 0,
    totalAmount: amountAgg._sum.amount ?? 0,
    averageAmount: amountAgg._avg.amount ?? 0,
  }

  return (
    <PagosPageContent
      pagos={pagos}
      stats={stats}
    />
  )
}
