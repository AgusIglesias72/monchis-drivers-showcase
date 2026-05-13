// app/api/admin/gestion/live/route.ts
//
// Endpoint de polling del panel "Live". Agrega los 4 endpoints de api.monchis-drivers.com
// y dispara enqueue de requestIds (cola monchisOrderImportQueue) para análisis post-mortem.

import { NextResponse } from "next/server"

import { requireAdminApi } from "@/lib/auth"
import { fetchLivePanel } from "@/lib/services/live-panel.service"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET() {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const payload = await fetchLivePanel()
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
