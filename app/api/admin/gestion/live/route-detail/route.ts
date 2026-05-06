// app/api/admin/gestion/live/route-detail/route.ts
//
// Devuelve la ruta histórica de un pedido (origen, destino, polyline)
// para overlay en el mapa Live cuando el admin clickea un pedido.
// Reusa getOrderByRequestId, que cachea en monchisOrderCache.

import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"

import {
  PedidoLookupError,
  getOrderByRequestId,
} from "@/lib/services/pedidos.service"
import type { LiveRoute } from "@/lib/types/live-panel.types"

export const dynamic = "force-dynamic"
export const maxDuration = 15

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const requestId = req.nextUrl.searchParams.get("requestId")?.trim()
  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 })
  }

  try {
    const { order, fetchedAt } = await getOrderByRequestId(requestId)
    const o = order.data_origin
    const d = order.data_destination
    const histories = order.histories || []

    const route: LiveRoute = {
      requestId,
      origin:
        o?.latitude != null && o?.longitude != null
          ? { lat: o.latitude, lng: o.longitude, name: o.name || "" }
          : null,
      destination:
        d?.latitude != null && d?.longitude != null
          ? { lat: d.latitude, lng: d.longitude, name: d.name || "" }
          : null,
      history: histories
        .filter(
          (h): h is typeof h & { latitude: number; longitude: number } =>
            h.latitude != null && h.longitude != null,
        )
        .map((h, idx) => ({
          lat: h.latitude,
          lng: h.longitude,
          state: h.request_state,
          date: h.date,
          index: idx + 1,
          hasDriver: (h.drivers_by_id || []).length > 0,
        })),
      fetchedAt: fetchedAt.toISOString(),
    }

    return NextResponse.json(route, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (err) {
    if (err instanceof PedidoLookupError) {
      const status =
        err.code === "NOT_FOUND" || err.code === "INVALID_ID" ? 404 : 502
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      )
    }
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
