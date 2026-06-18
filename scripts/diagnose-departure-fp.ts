// scripts/diagnose-departure-fp.ts
// READ-ONLY: diagnostica falsos positivos de "salida sin acción".
// Para cada DriverDepartureEvent reciente reconstruye el rastro de distancias
// (LiveOrderSample) y verifica si el driver REALMENTE llegó al lugar antes de
// que se emitiera el evento. No escribe nada.
//   npx tsx scripts/diagnose-departure-fp.ts [diasVentana] [TYPE]
//   TYPE = ORIGIN | DEST | ALL (default ORIGIN)

import { prisma } from "../lib/prisma"
import { DEPARTURE_DETECTION_CONFIG as CFG } from "../lib/config/departure-detection.config"

const DAYS = parseInt(process.argv[2] || "5", 10)
const TYPE_ARG = (process.argv[3] || "ORIGIN").toUpperCase()

const TYPE_FILTER =
  TYPE_ARG === "ALL"
    ? undefined
    : TYPE_ARG === "DEST"
      ? "LEFT_DESTINATION_WITHOUT_FINALIZE"
      : "LEFT_ORIGIN_WITHOUT_DELIVERY"

function fmt(d: Date) {
  return d.toISOString().slice(5, 19).replace("T", " ")
}

async function main() {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000)
  console.log(
    `\n===== DIAGNÓSTICO FALSOS POSITIVOS — ${TYPE_ARG} — últimos ${DAYS}d (desde ${fmt(since)}) =====`,
  )
  console.log(
    `Umbrales: arrive<=${CFG.arriveRadiusM}m x${CFG.arriveStreak}, leave>=${CFG.leaveRadiusM}m x${CFG.leaveStreak}\n`,
  )

  const events = await prisma.driverDepartureEvent.findMany({
    where: {
      detectedAt: { gte: since },
      ...(TYPE_FILTER ? { type: TYPE_FILTER } : {}),
    },
    orderBy: { detectedAt: "desc" },
  })

  console.log(`Eventos en ventana: ${events.length}\n`)

  let fpNeverNear = 0 // nunca estuvo <= arriveRadius (llegada falsa)
  let fpMarginal = 0 // estuvo cerca pero pocas muestras o lejos del radio
  let legit = 0
  let noSamples = 0

  const isOrigin = (t: string) => t === "LEFT_ORIGIN_WITHOUT_DELIVERY"

  for (const e of events) {
    // Todo el rastro de la orden (no solo hasta el evento), ordenado en tiempo.
    const samples = await prisma.liveOrderSample.findMany({
      where: { requestId: e.requestId },
      orderBy: { fetchedAt: "asc" },
      select: {
        fetchedAt: true,
        state: true,
        distOriginM: true,
        distDestM: true,
        driverLat: true,
        driverLng: true,
        positionStale: true,
      },
    })

    const distOf = (s: (typeof samples)[number]) =>
      isOrigin(e.type) ? s.distOriginM : s.distDestM

    // Solo muestras antes/igual a la detección, con distancia válida.
    const preDetect = samples.filter(
      (s) => s.fetchedAt <= e.detectedAt && distOf(s) !== null,
    )
    const dists = preDetect.map((s) => distOf(s) as number)

    if (samples.length === 0) {
      noSamples++
    }

    const minDist = dists.length ? Math.min(...dists) : null
    const nearCount = dists.filter((d) => d <= CFG.arriveRadiusM).length
    const everNear = nearCount > 0

    let verdict: string
    if (minDist === null) {
      verdict = "❓ SIN MUESTRAS PRE-DETECCIÓN"
    } else if (!everNear) {
      verdict = `🔴 FP: NUNCA estuvo cerca (min=${minDist}m)`
      fpNeverNear++
    } else if (nearCount < CFG.arriveStreak) {
      verdict = `🟠 MARGINAL: solo ${nearCount} muestra(s) <=${CFG.arriveRadiusM}m (min=${minDist}m)`
      fpMarginal++
    } else {
      verdict = `🟢 OK: ${nearCount} muestras <=${CFG.arriveRadiusM}m (min=${minDist}m)`
      legit++
    }

    const trail = dists.length
      ? `[${dists.join(",")}]`
      : "(sin dist)"

    console.log(
      `${verdict}\n` +
        `   ${e.type === "LEFT_ORIGIN_WITHOUT_DELIVERY" ? "ORIGIN" : "DEST"} | ${e.driverName ?? e.driverId} | ${e.placeName ?? e.branchName ?? "?"} | ${e.zoneName ?? "?"}\n` +
        `   req=${e.requestId} ext=${e.externalOrderId ?? "—"} estadoEvento=${e.stateAtEvent}\n` +
        `   arrivedAt=${fmt(e.arrivedAt)} leftAt=${fmt(e.leftAt)} detectedAt=${fmt(e.detectedAt)} dwell=${e.dwellSeconds}s distDeteccion=${e.distanceAtDetectionM}m\n` +
        `   muestras=${samples.length} preDetect=${preDetect.length} minDist=${minDist ?? "—"}m nearCount=${nearCount}\n` +
        `   trail dist${isOrigin(e.type) ? "Origin" : "Dest"}M = ${trail}\n`,
    )
  }

  console.log(`\n===== RESUMEN =====`)
  console.log(`  🔴 FP (nunca estuvo cerca): ${fpNeverNear}`)
  console.log(`  🟠 Marginal (<arriveStreak muestras cerca): ${fpMarginal}`)
  console.log(`  🟢 Legítimos (llegada clara): ${legit}`)
  console.log(`  ❓ Sin muestras: ${noSamples}`)
  console.log(`  TOTAL: ${events.length}\n`)
}

main()
  .catch((e) => {
    console.error("❌", e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
