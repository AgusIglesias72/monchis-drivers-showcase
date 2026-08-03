// scripts/diagnose-departure-stats.ts
// READ-ONLY: estadística agregada de eventos LEFT_ORIGIN_WITHOUT_DELIVERY.
// - distribución de minDist (qué tan "cerca" estuvo realmente el driver)
// - distribución de nearCount (cuántas muestras dentro del radio)
// - cuántos pedidos flagueados terminaron FINALIZED igual (falso positivo ops)
//   npx tsx scripts/diagnose-departure-stats.ts [diasVentana]

import { prisma } from "../lib/prisma"
import { DEPARTURE_DETECTION_CONFIG as CFG } from "../lib/config/departure-detection.config"

const DAYS = parseInt(process.argv[2] || "7", 10)

async function main() {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000)
  const events = await prisma.driverDepartureEvent.findMany({
    where: { detectedAt: { gte: since }, type: "LEFT_ORIGIN_WITHOUT_DELIVERY" },
    orderBy: { detectedAt: "desc" },
  })
  console.log(`\n===== STATS LEFT_ORIGIN — ${DAYS}d — ${events.length} eventos =====\n`)

  const minBuckets = { "<=30": 0, "31-60": 0, "61-100": 0, "101-150": 0, ">150": 0 }
  const nearBuckets = { "2": 0, "3-5": 0, "6-10": 0, ">10": 0 }
  const dwellBuckets = { "<=2m": 0, "2-5m": 0, "5-15m": 0, ">15m": 0 }
  let glitchCount = 0 // órdenes con alguna muestra > 100km (GPS null island)

  const reqIds: string[] = []
  for (const e of events) reqIds.push(e.requestId)

  // Estado final de cada pedido flagueado (cache de detalle).
  const cache = await prisma.monchisOrderCache.findMany({
    where: { requestId: { in: reqIds } },
    select: { requestId: true, status: true, finalizedAt: true },
  })
  const statusBy = new Map(cache.map((c) => [c.requestId, c]))
  const finalStatusCount = new Map<string, number>()

  for (const e of events) {
    const samples = await prisma.liveOrderSample.findMany({
      where: { requestId: e.requestId },
      orderBy: { fetchedAt: "asc" },
      select: { distOriginM: true, fetchedAt: true },
    })
    const pre = samples
      .filter((s) => s.fetchedAt <= e.detectedAt && s.distOriginM !== null)
      .map((s) => s.distOriginM as number)
    if (samples.some((s) => (s.distOriginM ?? 0) > 100_000)) glitchCount++

    const minDist = pre.length ? Math.min(...pre) : Infinity
    const nearCount = pre.filter((d) => d <= CFG.arriveRadiusM).length

    if (minDist <= 30) minBuckets["<=30"]++
    else if (minDist <= 60) minBuckets["31-60"]++
    else if (minDist <= 100) minBuckets["61-100"]++
    else if (minDist <= 150) minBuckets["101-150"]++
    else minBuckets[">150"]++

    if (nearCount === 2) nearBuckets["2"]++
    else if (nearCount <= 5) nearBuckets["3-5"]++
    else if (nearCount <= 10) nearBuckets["6-10"]++
    else nearBuckets[">10"]++

    const dw = e.dwellSeconds
    if (dw <= 120) dwellBuckets["<=2m"]++
    else if (dw <= 300) dwellBuckets["2-5m"]++
    else if (dw <= 900) dwellBuckets["5-15m"]++
    else dwellBuckets[">15m"]++

    const fin = statusBy.get(e.requestId)
    const key = fin?.status ?? "(sin cache)"
    finalStatusCount.set(key, (finalStatusCount.get(key) ?? 0) + 1)
  }

  const pct = (n: number) => `${((n / events.length) * 100).toFixed(0)}%`
  console.log("minDist real al comercio (más bajo = más seguro que estuvo ahí):")
  for (const [k, v] of Object.entries(minBuckets)) console.log(`   ${k.padEnd(8)} ${String(v).padStart(4)}  ${pct(v)}`)
  console.log("\nmuestras dentro de 150m (2 = apenas el mínimo del streak):")
  for (const [k, v] of Object.entries(nearBuckets)) console.log(`   ${k.padEnd(8)} ${String(v).padStart(4)}  ${pct(v)}`)
  console.log("\ndwell (tiempo 'en' el comercio):")
  for (const [k, v] of Object.entries(dwellBuckets)) console.log(`   ${k.padEnd(8)} ${String(v).padStart(4)}  ${pct(v)}`)
  console.log("\nestado FINAL del pedido flagueado (FINALIZED = se entregó igual → ruido para ops):")
  for (const [k, v] of [...finalStatusCount.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`   ${k.padEnd(14)} ${String(v).padStart(4)}  ${pct(v)}`)
  console.log(`\nórdenes con glitch GPS (>100km en algún sample): ${glitchCount}  ${pct(glitchCount)}\n`)
}

main()
  .catch((e) => { console.error("❌", e instanceof Error ? e.message : e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
