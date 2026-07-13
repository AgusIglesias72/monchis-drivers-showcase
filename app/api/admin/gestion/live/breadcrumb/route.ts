// app/api/admin/gestion/live/breadcrumb/route.ts
//
// Devuelve el rastro fino ("breadcrumb") de un pedido: las posiciones GPS del
// driver minuto a minuto, leídas de LiveOrderSample (capturadas por el cron
// collect-live-orders). A diferencia de route-detail (hitos de cambio de
// estado de la API externa), esto muestra por dónde se movió realmente el
// repartidor. Sólo existe mientras el pedido estuvo activo y con la retención
// de LiveOrderSample (DEPARTURE_DETECTION_CONFIG.sampleRetentionDays).

import { NextRequest, NextResponse } from "next/server"

import { requireAdminApi } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { LiveBreadcrumb } from "@/lib/types/live-panel.types"
import { haversineMeters } from "@/lib/utils/geo"

export const dynamic = "force-dynamic"
export const maxDuration = 15

// Descartamos puntos a menos de esto del último punto conservado: absorbe el
// jitter de GPS (~1-5m) cuando el driver está quieto, sin perder el trazo real.
const MIN_MOVE_M = 8
// Tope de vértices para no saturar el mapa en pedidos muy largos. Casi nunca se
// alcanza (un pedido normal son decenas de puntos); es un seguro barato.
const MAX_POINTS = 250

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const requestId = req.nextUrl.searchParams.get("requestId")?.trim()
  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 })
  }

  const samples = await prisma.liveOrderSample.findMany({
    where: { requestId },
    orderBy: { fetchedAt: "asc" },
    select: {
      fetchedAt: true,
      state: true,
      driverLat: true,
      driverLng: true,
      distOriginM: true,
      distDestM: true,
      positionStale: true,
    },
  })

  // Sólo muestras con GPS válido. Descartamos posiciones congeladas/null
  // (positionStale) y los puntos que están a menos de MIN_MOVE_M del último
  // conservado, para que la polilínea no acumule vértices por jitter cuando el
  // driver está quieto (comparar floats exactos no alcanza: el GPS jitea ~1-5m).
  const kept: LiveBreadcrumb["points"] = []
  let prevLat: number | null = null
  let prevLng: number | null = null
  for (const s of samples) {
    if (s.positionStale) continue
    if (s.driverLat === null || s.driverLng === null) continue
    if (
      prevLat !== null &&
      prevLng !== null &&
      haversineMeters(prevLat, prevLng, s.driverLat, s.driverLng) < MIN_MOVE_M
    )
      continue
    kept.push({
      lat: s.driverLat,
      lng: s.driverLng,
      at: s.fetchedAt.toISOString(),
      state: s.state,
      distOriginM: s.distOriginM,
      distDestM: s.distDestM,
    })
    prevLat = s.driverLat
    prevLng = s.driverLng
  }

  // Downsample si excede el tope, preservando siempre el último punto (posición
  // más reciente del driver).
  let points = kept
  if (kept.length > MAX_POINTS) {
    const step = Math.ceil(kept.length / MAX_POINTS)
    points = kept.filter((_, i) => i % step === 0)
    const last = kept[kept.length - 1]
    if (points[points.length - 1] !== last) points.push(last)
  }

  const route: LiveBreadcrumb = {
    requestId,
    points,
    fetchedAt: new Date().toISOString(),
  }

  return NextResponse.json(route, {
    headers: { "Cache-Control": "no-store" },
  })
}
