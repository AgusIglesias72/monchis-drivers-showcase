// scripts/diagnose-late-marking.ts
// READ-ONLY: para eventos LEFT_ORIGIN flagueados que terminaron FINALIZED,
// mide el gap entre leftAt (cuando se alejó del comercio) y cuándo marcó
// DELIVERY ("En camino"), leyendo el historial de estados de rawData.
// Si el gap es chico → "marcado tardío" benigno (ruido), no abandono real.
//   npx tsx scripts/diagnose-late-marking.ts [diasVentana]

import { prisma } from "../lib/prisma"

const DAYS = parseInt(process.argv[2] || "7", 10)

type History = { request_state?: string; date?: string }

// Los timestamps de la API externa vienen 3h atrasados (UTC mal etiquetado como
// hora local PY = UTC-3). Igual que confirmedAt en cache. Corregimos +3h para
// comparar contra nuestros tiempos reales (leftAt = new Date() en UTC).
const TZ_OFFSET_MS = 3 * 60 * 60 * 1000

function deliveryDate(raw: unknown): Date | null {
  const r = raw as { histories?: History[] } | null
  const hs = r?.histories
  if (!Array.isArray(hs)) return null
  // primer cambio a DELIVERY
  for (const h of hs) {
    if (h.request_state === "DELIVERY" && h.date) {
      const d = new Date(h.date)
      if (!isNaN(d.getTime())) return new Date(d.getTime() + TZ_OFFSET_MS)
    }
  }
  return null
}

async function main() {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000)
  const events = await prisma.driverDepartureEvent.findMany({
    where: { detectedAt: { gte: since }, type: "LEFT_ORIGIN_WITHOUT_DELIVERY" },
    orderBy: { detectedAt: "desc" },
  })
  const cache = await prisma.monchisOrderCache.findMany({
    where: { requestId: { in: events.map((e) => e.requestId) } },
    select: { requestId: true, status: true, rawData: true },
  })
  const cacheBy = new Map(cache.map((c) => [c.requestId, c]))

  const gapBuckets = {
    "marcó ANTES de irse": 0,
    "0-2m después": 0,
    "2-5m después": 0,
    "5-15m después": 0,
    ">15m después": 0,
    "NUNCA marcó DELIVERY": 0,
    "sin historial": 0,
  }
  let withDelivery = 0
  const gaps: number[] = []

  for (const e of events) {
    const c = cacheBy.get(e.requestId)
    if (!c) {
      gapBuckets["sin historial"]++
      continue
    }
    const delAt = deliveryDate(c.rawData)
    if (!delAt) {
      // ¿llegó a FINALIZED sin pasar por DELIVERY en historial? lo marcamos aparte
      if (c.status === "FINALIZED" || c.status === "DELIVERY")
        gapBuckets["NUNCA marcó DELIVERY"]++
      else gapBuckets["sin historial"]++
      continue
    }
    withDelivery++
    const gapMin = (delAt.getTime() - e.leftAt.getTime()) / 60000
    gaps.push(gapMin)
    if (gapMin < 0) gapBuckets["marcó ANTES de irse"]++
    else if (gapMin <= 2) gapBuckets["0-2m después"]++
    else if (gapMin <= 5) gapBuckets["2-5m después"]++
    else if (gapMin <= 15) gapBuckets["5-15m después"]++
    else gapBuckets[">15m después"]++
  }

  const pct = (n: number) => `${((n / events.length) * 100).toFixed(0)}%`
  console.log(`\n===== LATE-MARKING — ${DAYS}d — ${events.length} eventos LEFT_ORIGIN =====\n`)
  console.log("gap entre salir del comercio (leftAt) y marcar DELIVERY:")
  for (const [k, v] of Object.entries(gapBuckets))
    console.log(`   ${k.padEnd(22)} ${String(v).padStart(4)}  ${pct(v)}`)

  if (gaps.length) {
    gaps.sort((a, b) => a - b)
    const median = gaps[Math.floor(gaps.length / 2)]
    const p90 = gaps[Math.floor(gaps.length * 0.9)]
    console.log(
      `\ncon DELIVERY en historial: ${withDelivery}` +
        ` | mediana gap=${median.toFixed(1)}m | p90=${p90.toFixed(1)}m`,
    )
    const within5 = gaps.filter((g) => g >= -1 && g <= 5).length
    console.log(
      `eventos donde marcó DELIVERY dentro de [-1, +5]min de irse: ${within5} (${pct(within5)})` +
        ` → ruido de marcado tardío benigno`,
    )
  }
  // Curva de gracia: si solo emitiéramos el evento cuando, G minutos después de
  // salir del comercio, el driver SIGUE sin marcar DELIVERY, ¿cuántas alertas
  // sobreviven? (gap > G = todavía sin marcar a los G min). Los "nunca marcó"
  // sobreviven siempre; "sin historial" los contamos conservadoramente como vivos.
  const neverOrUnknown = gapBuckets["NUNCA marcó DELIVERY"] + gapBuckets["sin historial"]
  console.log("\nperíodo de gracia → alertas que sobrevivirían (resto = ruido eliminado):")
  for (const G of [5, 10, 15, 20, 30]) {
    const survivors = gaps.filter((g) => g > G).length + neverOrUnknown
    console.log(
      `   gracia ${String(G).padStart(2)}min → ${String(survivors).padStart(4)} alertas  (${pct(survivors)} del total, -${pct(events.length - survivors)} ruido)`,
    )
  }
  console.log()
}

main()
  .catch((e) => { console.error("❌", e instanceof Error ? e.message : e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
