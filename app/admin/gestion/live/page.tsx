// app/admin/gestion/live/page.tsx

import { LivePanelContent } from "@/components/admin/gestion/live/live-panel-content"
import { fetchLivePanel } from "@/lib/services/live-panel.service"

export const dynamic = "force-dynamic"

export default async function LivePanelPage() {
  // SSR inicial — el cliente seguirá poll-eando contra /api/admin/gestion/live.
  // No enqueue en SSR para no duplicar inserts (el primer poll cliente lo hace).
  const initial = await fetchLivePanel({ enqueue: false })
  return <LivePanelContent initial={initial} />
}
