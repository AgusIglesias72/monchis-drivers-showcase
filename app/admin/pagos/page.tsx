// app/admin/pagos/page.tsx

import { PagosPageContent } from "@/components/admin/pagos-page-content"
import { prisma } from "@/lib/prisma"

export const revalidate = 30

export default async function PagosPage() {
  // Obtener todos los pagos con información del conductor
  const pagos = await prisma.equipmentPayment.findMany({
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
  })

  // Calcular estadísticas
  const stats = {
    total: pagos.length,
    verified: pagos.filter(p => p.status === 'VERIFIED').length,
    pending: pagos.filter(p => p.status === 'PENDING').length,
    rejected: pagos.filter(p => p.status === 'REJECTED').length,
    partial: pagos.filter(p => p.status === 'PARTIAL').length,
    totalAmount: pagos.reduce((sum, p) => sum + (p.amount || 0), 0),
    averageAmount: pagos.length > 0
      ? pagos.reduce((sum, p) => sum + (p.amount || 0), 0) / pagos.length
      : 0,
  }

  return (
    <PagosPageContent
      pagos={pagos}
      stats={stats}
    />
  )
}
