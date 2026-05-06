// app/api/admin/gestion/live/route.ts
//
// Endpoint de polling del panel "Live". Agrega los 4 endpoints de api.monchis-drivers.com
// y dispara enqueue de requestIds (cola monchisOrderImportQueue) para análisis post-mortem.

import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { fetchLivePanel } from "@/lib/services/live-panel.service"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payload = await fetchLivePanel()
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
