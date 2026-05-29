// app/admin/gestion/ordenes/page.tsx
//
// Vista OPERATIVA del ciclo de vida de las órdenes: qué hay en curso ahora,
// con estado fresco (mantenido por el lane rápido refresh-recent-orders) y la
// salud de la captura autónoma. Complementa a /admin/gestion/pedidos, que es
// la vista analítica/histórica completa.

import { OrdenesContent } from "@/components/admin/gestion/ordenes-content"
import { getCaptureHealth } from "@/lib/services/live-capture-health.service"
import { searchOrders } from "@/lib/services/pedidos.service"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 100

export default async function OrdenesPage() {
  const [{ rows }, health] = await Promise.all([
    searchOrders({
      status: "in_progress",
      sortBy: "confirmedAt",
      sortOrder: "desc",
      page: 1,
      pageSize: PAGE_SIZE,
    }),
    getCaptureHealth(),
  ])

  return (
    <OrdenesContent
      rows={rows.map((r) => ({
        requestId: r.requestId,
        externalOrderId: r.externalOrderId,
        driverName: r.driverName,
        branchName: r.branchName,
        status: r.status,
        confirmedAt: r.confirmedAt?.toISOString() ?? null,
        refreshedAt: r.refreshedAt.toISOString(),
      }))}
      health={health}
      generatedAt={new Date().toISOString()}
    />
  )
}
