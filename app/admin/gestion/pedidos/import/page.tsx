// app/admin/gestion/pedidos/import/page.tsx

import { PedidosImportContent } from "@/components/admin/gestion/pedidos-import-content"
import { getOrderImportQueueStats } from "@/lib/services/pedidos-import-queue.service"

export const dynamic = "force-dynamic"

export default async function PedidosImportPage() {
  const stats = await getOrderImportQueueStats()
  return <PedidosImportContent initialQueueStats={stats} />
}
