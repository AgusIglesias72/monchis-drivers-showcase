// scripts/replay-departures.ts
//
// Verificación del FSM de detección de salidas sin acción (advanceTracking,
// función pura) con escenarios sintéticos. No toca la DB salvo con --apply.
//
//   npx tsx --require ./scripts/_disable-server-only.cjs scripts/replay-departures.ts
//   npx tsx --require ./scripts/_disable-server-only.cjs scripts/replay-departures.ts --apply
//     → además siembra eventos de prueba en driver_departure_event (requestId
//       con prefijo "testanomalia") para revisar la UI en /admin/gestion/anomalias.
//   npx tsx --require ./scripts/_disable-server-only.cjs scripts/replay-departures.ts --clean
//     → borra los eventos de prueba sembrados.

import {
  advanceTracking,
  type DepartureEventDraft,
  type OrderSampleInput,
  type TrackingState,
} from "../lib/services/driver-departure.service"

// Punto base (Asunción) y helper: posición a `meters` al norte de un punto.
const ORIGIN = { lat: -25.2967, lng: -57.6359 }
const M_PER_DEG_LAT = 111_320
function posAt(base: { lat: number; lng: number }, meters: number) {
  return { lat: base.lat + meters / M_PER_DEG_LAT, lng: base.lng }
}

interface Step {
  state: string
  // Distancia del driver al ORIGIN en metros (la posición se genera al norte).
  // null = sin GPS. "repeat" = misma posición exacta que la muestra anterior.
  dist: number | null | "repeat"
  destination?: { lat: number; lng: number } | null
}

interface Scenario {
  name: string
  destination: { lat: number; lng: number } | null
  steps: Step[]
  expectEvents: string[] // types esperados, en orden
}

// Cliente a 2km del comercio salvo que el escenario lo pise.
const FAR_DEST = posAt(ORIGIN, 2000)

const SCENARIOS: Scenario[] = [
  {
    name: "(a) flujo sano: comercio → DELIVERY → cliente, sin eventos",
    destination: FAR_DEST,
    steps: [
      { state: "ACCEPTED", dist: 800 },
      { state: "WAITING_ORDER", dist: 50 },
      { state: "WAITING_ORDER", dist: 60 }, // arrival origin
      { state: "DELIVERY", dist: 500 }, // marcó DELIVERY antes de irse → sano
      { state: "DELIVERY", dist: 1900 }, // cerca del cliente (a 100m)
      { state: "OUTSIDE", dist: 1950 }, // arrival dest
      { state: "OUTSIDE", dist: 1980 },
    ],
    expectEvents: [],
  },
  {
    name: "(b) se va del comercio en WAITING_ORDER sin marcar DELIVERY",
    destination: FAR_DEST,
    steps: [
      { state: "WAITING_ORDER", dist: 40 },
      { state: "WAITING_ORDER", dist: 80 }, // arrival
      { state: "WAITING_ORDER", dist: 400 }, // far 1
      { state: "WAITING_ORDER", dist: 600 }, // far 2 → evento
    ],
    expectEvents: ["LEFT_ORIGIN_WITHOUT_DELIVERY"],
  },
  {
    name: "(c) se va del cliente en OUTSIDE sin marcar FINALIZED",
    destination: posAt(ORIGIN, 1000),
    steps: [
      { state: "DELIVERY", dist: 950 }, // a 50m del cliente
      { state: "OUTSIDE", dist: 990 }, // arrival dest
      { state: "OUTSIDE", dist: 1500 }, // far 1 (a 500m del cliente)
      { state: "OUTSIDE", dist: 1600 }, // far 2 → evento
    ],
    expectEvents: ["LEFT_DESTINATION_WITHOUT_FINALIZE"],
  },
  {
    name: "(d) jitter GPS en banda muerta (150-350m) tras llegar: sin evento",
    destination: FAR_DEST,
    steps: [
      { state: "WAITING_ORDER", dist: 100 },
      { state: "WAITING_ORDER", dist: 100 }, // arrival
      { state: "WAITING_ORDER", dist: 250 },
      { state: "WAITING_ORDER", dist: 300 },
      { state: "WAITING_ORDER", dist: 250 },
      { state: "WAITING_ORDER", dist: 340 },
    ],
    expectEvents: [],
  },
  {
    name: "(e) GPS congelado/null no genera evidencia",
    destination: FAR_DEST,
    steps: [
      { state: "WAITING_ORDER", dist: 50 },
      { state: "WAITING_ORDER", dist: 70 }, // arrival
      { state: "WAITING_ORDER", dist: 400 }, // far 1
      { state: "WAITING_ORDER", dist: "repeat" }, // congelado → no avanza
      { state: "WAITING_ORDER", dist: null }, // sin GPS → no avanza
      { state: "WAITING_ORDER", dist: "repeat" }, // sigue igual → no avanza
    ],
    expectEvents: [], // far quedó en 1, nunca llegó a 2
  },
  {
    name: "(f) se aleja 1 muestra y vuelve: reset, sin evento",
    destination: FAR_DEST,
    steps: [
      { state: "WAITING_ORDER", dist: 60 },
      { state: "WAITING_ORDER", dist: 90 }, // arrival
      { state: "WAITING_ORDER", dist: 400 }, // far 1
      { state: "WAITING_ORDER", dist: 100 }, // volvió → reset
      { state: "WAITING_ORDER", dist: 120 },
      { state: "DELIVERY", dist: 500 }, // después marcó bien
    ],
    expectEvents: [],
  },
  {
    name: "(g) capturada ya en DELIVERY: lado origin inerte",
    destination: FAR_DEST,
    steps: [
      { state: "DELIVERY", dist: 500 },
      { state: "DELIVERY", dist: 900 },
      { state: "DELIVERY", dist: 1200 },
    ],
    expectEvents: [],
  },
  {
    name: "(h) comercio y cliente a 200m: evento origin con contexto",
    destination: posAt(ORIGIN, 200),
    steps: [
      { state: "WAITING_ORDER", dist: 30 },
      { state: "WAITING_ORDER", dist: 50 }, // arrival origin
      { state: "WAITING_ORDER", dist: 400 }, // far 1 (cliente a ~200m)
      { state: "WAITING_ORDER", dist: 450 }, // far 2 → evento
    ],
    expectEvents: ["LEFT_ORIGIN_WITHOUT_DELIVERY"],
  },
]

function runScenario(s: Scenario): {
  ok: boolean
  events: DepartureEventDraft[]
} {
  const t0 = Date.parse("2026-06-10T15:00:00Z")
  let track: TrackingState | null = null
  let lastPos: { lat: number; lng: number } | null = null
  const events: DepartureEventDraft[] = []

  s.steps.forEach((step, i) => {
    let driverPos: { lat: number; lng: number } | null
    if (step.dist === "repeat") driverPos = lastPos
    else if (step.dist === null) driverPos = null
    else driverPos = posAt(ORIGIN, step.dist)
    lastPos = driverPos ?? lastPos

    const input: OrderSampleInput = {
      requestId: `replay-${s.name.slice(1, 2)}`,
      driverId: "driver-test",
      externalOrderId: "999999",
      driverName: "Driver Prueba",
      branchName: "Comercio Prueba",
      destAddress: "Cliente Prueba 123",
      zoneName: "Zona Test",
      state: step.state,
      driverPos,
      origin: ORIGIN,
      destination: step.destination !== undefined ? step.destination : s.destination,
    }
    const res = advanceTracking(track, input, new Date(t0 + i * 60_000))
    track = res.next
    events.push(...res.events)
    console.log(
      `   t+${i}m state=${step.state.padEnd(13)} distOrigin=${String(res.distOriginM).padStart(5)} ` +
        `distDest=${String(res.distDestM).padStart(5)} stale=${res.positionStale ? "Y" : "n"} ` +
        `oNear=${track.originNearStreak} oFar=${track.originFarStreak} oArr=${track.originArrivedAt ? "Y" : "-"} ` +
        `dNear=${track.destNearStreak} dFar=${track.destFarStreak} dArr=${track.destArrivedAt ? "Y" : "-"}` +
        (res.events.length ? `  🚩 ${res.events.map((e) => e.type).join(",")}` : ""),
    )
  })

  const got = events.map((e) => e.type)
  const ok = JSON.stringify(got) === JSON.stringify(s.expectEvents)
  return { ok, events }
}

async function applyToDb(allEvents: DepartureEventDraft[]) {
  const { prisma } = await import("../lib/prisma")
  // Prefijo identificable para poder limpiar después.
  const rows = allEvents.map((e, i) => ({
    ...e,
    requestId: `testanomalia${String(i).padStart(4, "0")}`,
  }))
  const res = await prisma.driverDepartureEvent.createMany({
    data: rows,
    skipDuplicates: true,
  })
  console.log(`\n💾 Sembrados ${res.count} eventos de prueba (requestId testanomalia*)`)
  console.log("   Limpiar con: --clean")
  await prisma.$disconnect()
}

async function cleanDb() {
  const { prisma } = await import("../lib/prisma")
  const res = await prisma.driverDepartureEvent.deleteMany({
    where: { requestId: { startsWith: "testanomalia" } },
  })
  console.log(`🧹 Borrados ${res.count} eventos de prueba`)
  await prisma.$disconnect()
}

async function main() {
  if (process.argv.includes("--clean")) {
    await cleanDb()
    return
  }

  let failures = 0
  const allEvents: DepartureEventDraft[] = []
  for (const s of SCENARIOS) {
    console.log(`\n▶ ${s.name}`)
    const { ok, events } = runScenario(s)
    allEvents.push(...events)
    for (const e of events) {
      console.log(
        `   evento: ${e.type} dwell=${e.dwellSeconds}s distDeteccion=${e.distanceAtDetectionM}m ` +
          `otroLugar=${e.otherPlaceDistanceM ?? "—"}m arrived=${e.arrivedAt.toISOString()} left=${e.leftAt.toISOString()}`,
      )
    }
    console.log(ok ? "   ✅ PASS" : `   ❌ FAIL — esperado [${s.expectEvents.join(",")}], obtenido [${events.map((e) => e.type).join(",")}]`)
    if (!ok) failures++
  }

  console.log(`\n========= ${SCENARIOS.length - failures}/${SCENARIOS.length} escenarios OK =========`)

  if (process.argv.includes("--apply")) {
    await applyToDb(allEvents)
  }
  if (failures > 0) process.exit(1)
}

main()
