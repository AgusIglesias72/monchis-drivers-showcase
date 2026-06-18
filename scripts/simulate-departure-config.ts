// scripts/simulate-departure-config.ts
// READ-ONLY: simula cuántos eventos LEFT_ORIGIN dispararía la FSM de origen
// sobre los samples históricos reales (distOriginM), bajo umbrales arbitrarios.
// Replica advancePlace (que solo consume `dist` + positionStale + estado).
//   npx tsx scripts/simulate-departure-config.ts [dias] [arriveM] [leaveM] [arriveStreak] [leaveStreak]
//   default: 7 50 300 2 2  (config nueva)

import { prisma } from "../lib/prisma"

const DAYS = parseInt(process.argv[2] || "7", 10)
const ARRIVE = parseInt(process.argv[3] || "50", 10)
const LEAVE = parseInt(process.argv[4] || "300", 10)
const ARRIVE_STREAK = parseInt(process.argv[5] || "2", 10)
const LEAVE_STREAK = parseInt(process.argv[6] || "2", 10)

const ORIGIN_STATES = new Set(["ACCEPTED", "WAITING_ORDER"])

// Replica advancePlace para el lado origin sobre una serie de samples de un
// requestId (en orden temporal). Devuelve true si dispararía LEFT_ORIGIN.
function wouldFire(
  samples: { state: string; distOriginM: number | null; positionStale: boolean }[],
): boolean {
  let near = 0
  let far = 0
  let arrived = false
  for (const s of samples) {
    if (!ORIGIN_STATES.has(s.state)) break // transicionó (resolved) → para
    if (s.positionStale || s.distOriginM === null) continue // sin evidencia
    const dist = s.distOriginM
    if (!arrived) {
      near = dist <= ARRIVE ? near + 1 : 0
      if (near >= ARRIVE_STREAK) arrived = true
      continue
    }
    if (dist < LEAVE) {
      far = 0
      continue
    }
    far += 1
    if (far >= LEAVE_STREAK) return true
  }
  return false
}

async function main() {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000)

  // Eventos reales disparados (config vieja) en la ventana, para comparar.
  const actual = await prisma.driverDepartureEvent.count({
    where: { detectedAt: { gte: since }, type: "LEFT_ORIGIN_WITHOUT_DELIVERY" },
  })

  // Una sola query: todos los samples de la ventana, ordenados por requestId y
  // tiempo. Agrupamos en memoria (evita N+1 sobre cientos de pedidos).
  const all = await prisma.liveOrderSample.findMany({
    where: { fetchedAt: { gte: since } },
    orderBy: [{ requestId: "asc" }, { fetchedAt: "asc" }],
    select: { requestId: true, state: true, distOriginM: true, positionStale: true },
  })
  const byReq = new Map<string, typeof all>()
  for (const s of all) {
    const arr = byReq.get(s.requestId)
    if (arr) arr.push(s)
    else byReq.set(s.requestId, [s])
  }

  let fired = 0
  let candidates = 0
  for (const samples of byReq.values()) {
    if (!samples.some((s) => ORIGIN_STATES.has(s.state))) continue
    candidates++
    if (wouldFire(samples)) fired++
  }
  const reqIds = { length: candidates }

  console.log(
    `\n===== SIMULACIÓN LEFT_ORIGIN — ${DAYS}d =====\n` +
      `umbrales: arrive<=${ARRIVE}m x${ARRIVE_STREAK}, leave>=${LEAVE}m x${LEAVE_STREAK}\n` +
      `requestIds con samples en estado origin: ${reqIds.length}\n` +
      `eventos REALES disparados (config vieja 150/350): ${actual}\n` +
      `eventos que dispararía esta config: ${fired}\n` +
      `cambio: ${fired - actual} (${actual ? (((fired - actual) / actual) * 100).toFixed(0) : "—"}%)\n`,
  )
}

main()
  .catch((e) => { console.error("❌", e instanceof Error ? e.message : e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
