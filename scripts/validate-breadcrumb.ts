// scripts/validate-breadcrumb.ts
// READ-ONLY: valida la capa de datos del endpoint /breadcrumb replicando su
// query+lógica (dedupe + descarte de stale/null) sobre pedidos reales recientes
// que tuvieron muestras. Verifica invariantes: tiempo monótono, sin null/stale,
// puntos suficientes para dibujar la polilínea.
//   npx tsx scripts/validate-breadcrumb.ts [cuantosPedidos]

import { prisma } from "../lib/prisma"
import { haversineMeters } from "../lib/utils/geo"

const N = parseInt(process.argv[2] || "8", 10)

// Espeja la lógica del endpoint /breadcrumb (dedupe por distancia MIN_MOVE_M).
const MIN_MOVE_M = 8

function buildPoints(
  samples: {
    fetchedAt: Date
    state: string
    driverLat: number | null
    driverLng: number | null
    positionStale: boolean
  }[],
) {
  const points: { lat: number; lng: number; at: Date; state: string }[] = []
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
    points.push({ lat: s.driverLat, lng: s.driverLng, at: s.fetchedAt, state: s.state })
    prevLat = s.driverLat
    prevLng = s.driverLng
  }
  return points
}

async function main() {
  // Pedidos recientes con más muestras (los más interesantes para un rastro).
  const grouped = await prisma.liveOrderSample.groupBy({
    by: ["requestId"],
    _count: { _all: true },
    orderBy: { _count: { requestId: "desc" } },
    take: N,
  })

  console.log(`\n===== VALIDACIÓN BREADCRUMB — top ${N} pedidos por #muestras =====\n`)

  let problems = 0
  for (const g of grouped) {
    const samples = await prisma.liveOrderSample.findMany({
      where: { requestId: g.requestId },
      orderBy: { fetchedAt: "asc" },
      select: {
        fetchedAt: true,
        state: true,
        driverLat: true,
        driverLng: true,
        positionStale: true,
      },
    })
    const points = buildPoints(samples)

    // Invariantes.
    const timeMonotonic = points.every(
      (p, i) => i === 0 || p.at.getTime() >= points[i - 1].at.getTime(),
    )
    const noConsecutiveDupes = points.every(
      (p, i) =>
        i === 0 || p.lat !== points[i - 1].lat || p.lng !== points[i - 1].lng,
    )
    const coordsSane = points.every(
      (p) =>
        p.lat > -30 && p.lat < -20 && p.lng > -62 && p.lng < -54, // Paraguay-ish
    )
    const insane = points.filter(
      (p) => !(p.lat > -30 && p.lat < -20 && p.lng > -62 && p.lng < -54),
    ).length

    const span =
      points.length >= 2
        ? Math.round(
            (points[points.length - 1].at.getTime() - points[0].at.getTime()) /
              60000,
          )
        : 0
    const states = [...new Set(points.map((p) => p.state))].join("→")

    const ok = timeMonotonic && noConsecutiveDupes && points.length >= 2
    if (!ok) problems++

    console.log(
      `${ok ? "🟢" : "🟡"} req=${g.requestId} muestras=${g._count._all} ` +
        `→ puntos=${points.length} span=${span}min estados=[${states}]\n` +
        `   monotónico=${timeMonotonic} sinDupes=${noConsecutiveDupes} coordsSanas=${coordsSane}${insane ? ` (⚠ ${insane} fuera de PY — glitch GPS filtrable)` : ""}\n`,
    )
  }

  console.log(`===== ${grouped.length - problems}/${grouped.length} OK para dibujar (≥2 puntos, tiempo monótono, sin dupes) =====\n`)
}

main()
  .catch((e) => { console.error("❌", e instanceof Error ? e.message : e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
