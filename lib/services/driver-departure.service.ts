import "server-only"

import { DEPARTURE_DETECTION_CONFIG } from "@/lib/config/departure-detection.config"
import { prisma } from "@/lib/prisma"
import { haversineMeters } from "@/lib/utils/geo"
import type { LiveDriver, LiveRequest } from "@/lib/types/live-panel.types"

// ----------------------------------------------------------------------------
// Detección de "salidas sin acción": driver que llega a un lugar (comercio o
// cliente) y se va sin marcar el cambio de estado esperado.
//
//   * origin (comercio): orden en ACCEPTED/WAITING_ORDER → la acción pendiente
//     es marcar DELIVERY. Si llega y se va sin marcarla → evento
//     LEFT_ORIGIN_WITHOUT_DELIVERY.
//   * destination (cliente): orden en DELIVERY/OUTSIDE → la acción pendiente
//     es marcar FINALIZED. Si llega y se va → LEFT_DESTINATION_WITHOUT_FINALIZE.
//
// La máquina de estados (advanceTracking) es pura — sin Prisma ni fetch — para
// poder testearla con fixtures (la API externa está bloqueada en red local).
// El IO vive en detectDriverDepartures(), llamada desde captureLiveOrders()
// una vez por minuto. Histéresis: llegar exige arriveStreak muestras dentro de
// arriveRadiusM; irse exige leaveStreak muestras fuera de leaveRadiusM. La
// banda muerta entre ambos radios evita oscilación por jitter de GPS.
// ----------------------------------------------------------------------------

const CFG = DEPARTURE_DETECTION_CONFIG

export type DepartureEventType =
  | "LEFT_ORIGIN_WITHOUT_DELIVERY"
  | "LEFT_DESTINATION_WITHOUT_FINALIZE"

// Espejo en memoria de LiveOrderTracking (sin tipos Prisma para el FSM puro).
export interface TrackingState {
  requestId: string
  driverId: string
  externalOrderId: string | null
  driverName: string | null
  branchName: string | null
  destAddress: string | null
  zoneName: string | null
  lastState: string
  lastSeenAt: Date
  lastDriverLat: number | null
  lastDriverLng: number | null
  originNearStreak: number
  originFarStreak: number
  originArrivedAt: Date | null
  originLeftCandidateAt: Date | null
  originEventEmitted: boolean
  originResolved: boolean
  destNearStreak: number
  destFarStreak: number
  destArrivedAt: Date | null
  destLeftCandidateAt: Date | null
  destEventEmitted: boolean
  createdAt: Date
}

export interface OrderSampleInput {
  requestId: string
  driverId: string
  externalOrderId: string | null
  driverName: string | null
  branchName: string | null
  destAddress: string | null
  zoneName: string | null
  state: string
  driverPos: { lat: number; lng: number } | null
  origin: { lat: number; lng: number } | null
  destination: { lat: number; lng: number } | null
}

export interface DepartureEventDraft {
  type: DepartureEventType
  requestId: string
  externalOrderId: string | null
  driverId: string
  driverName: string | null
  branchName: string | null
  placeName: string | null
  zoneName: string | null
  stateAtEvent: string
  arrivedAt: Date
  leftAt: Date
  dwellSeconds: number
  distanceAtDetectionM: number
  otherPlaceDistanceM: number | null
}

export interface AdvanceResult {
  next: TrackingState
  events: DepartureEventDraft[]
  // Para la fila de sample (debug/tuning):
  distOriginM: number | null
  distDestM: number | null
  positionStale: boolean
}

const ORIGIN_STATES: readonly string[] = CFG.originStates
const DEST_STATES: readonly string[] = CFG.destStates

// Cadencia nominal del cron; se usa solo para aproximar el primer sample
// "near" al confirmar una llegada (now - (arriveStreak-1) * cadencia).
const SAMPLE_INTERVAL_MS = 60_000

function freshTracking(input: OrderSampleInput, now: Date): TrackingState {
  return {
    requestId: input.requestId,
    driverId: input.driverId,
    externalOrderId: input.externalOrderId,
    driverName: input.driverName,
    branchName: input.branchName,
    destAddress: input.destAddress,
    zoneName: input.zoneName,
    lastState: input.state,
    lastSeenAt: now,
    lastDriverLat: null,
    lastDriverLng: null,
    originNearStreak: 0,
    originFarStreak: 0,
    originArrivedAt: null,
    originLeftCandidateAt: null,
    originEventEmitted: false,
    originResolved: false,
    destNearStreak: 0,
    destFarStreak: 0,
    destArrivedAt: null,
    destLeftCandidateAt: null,
    destEventEmitted: false,
    createdAt: now,
  }
}

// FSM de un lugar (origin o dest). Muta `t` y devuelve el evento si la salida
// se confirmó. `dist` ya viene validada como number (no stale, no null).
function advancePlace(
  t: TrackingState,
  side: "origin" | "dest",
  dist: number,
  otherDist: number | null,
  input: OrderSampleInput,
  now: Date,
): DepartureEventDraft | null {
  const k = side === "origin" ? ("origin" as const) : ("dest" as const)
  const arrivedKey = `${k}ArrivedAt` as const
  const nearKey = `${k}NearStreak` as const
  const farKey = `${k}FarStreak` as const
  const leftKey = `${k}LeftCandidateAt` as const

  if (t[arrivedKey] === null) {
    // Fase llegada: acumular muestras consecutivas dentro del radio.
    t[nearKey] = dist <= CFG.arriveRadiusM ? t[nearKey] + 1 : 0
    if (t[nearKey] >= CFG.arriveStreak) {
      // Aproximamos la llegada al primer sample del streak.
      t[arrivedKey] = new Date(
        now.getTime() - (CFG.arriveStreak - 1) * SAMPLE_INTERVAL_MS,
      )
    }
    return null
  }

  // Fase salida: ya llegó; acumular muestras consecutivas fuera del radio.
  if (dist < CFG.leaveRadiusM) {
    t[farKey] = 0
    t[leftKey] = null
    return null
  }
  if (t[farKey] === 0) t[leftKey] = now
  t[farKey] += 1
  if (t[farKey] < CFG.leaveStreak) return null

  const arrivedAt = t[arrivedKey]!
  const leftAt = t[leftKey] ?? now
  if (side === "origin") t.originEventEmitted = true
  else t.destEventEmitted = true

  return {
    type:
      side === "origin"
        ? "LEFT_ORIGIN_WITHOUT_DELIVERY"
        : "LEFT_DESTINATION_WITHOUT_FINALIZE",
    requestId: input.requestId,
    externalOrderId: input.externalOrderId,
    driverId: input.driverId,
    driverName: input.driverName,
    branchName: input.branchName,
    placeName: side === "origin" ? input.branchName : input.destAddress,
    zoneName: input.zoneName,
    stateAtEvent: input.state,
    arrivedAt,
    leftAt,
    dwellSeconds: Math.max(
      0,
      Math.round((leftAt.getTime() - arrivedAt.getTime()) / 1000),
    ),
    distanceAtDetectionM: Math.round(dist),
    otherPlaceDistanceM: otherDist !== null ? Math.round(otherDist) : null,
  }
}

// Avanza el tracking de UNA orden con la muestra del minuto. Pura: no toca DB.
export function advanceTracking(
  prev: TrackingState | null,
  input: OrderSampleInput,
  now: Date,
): AdvanceResult {
  const pos = input.driverPos
  // GPS null o posición exactamente repetida = feed congelado: no es evidencia
  // ni de presencia ni de salida → congelar streaks (no avanzar ni resetear).
  const positionStale =
    pos === null ||
    (prev !== null &&
      pos.lat === prev.lastDriverLat &&
      pos.lng === prev.lastDriverLng)

  const distOriginM =
    pos && input.origin
      ? haversineMeters(pos.lat, pos.lng, input.origin.lat, input.origin.lng)
      : null
  const distDestM =
    pos && input.destination
      ? haversineMeters(
          pos.lat,
          pos.lng,
          input.destination.lat,
          input.destination.lng,
        )
      : null

  const t = prev ?? freshTracking(input, now)
  t.lastState = input.state
  t.lastSeenAt = now
  // Identidad denormalizada: puede llegar tarde (ej. driverName) → refrescar.
  t.externalOrderId = input.externalOrderId ?? t.externalOrderId
  t.driverName = input.driverName ?? t.driverName
  t.branchName = input.branchName ?? t.branchName
  t.destAddress = input.destAddress ?? t.destAddress
  t.zoneName = input.zoneName ?? t.zoneName
  if (!positionStale && pos) {
    t.lastDriverLat = pos.lat
    t.lastDriverLng = pos.lng
  }

  const events: DepartureEventDraft[] = []

  // Lado origin: solo mientras la acción pendiente es marcar DELIVERY.
  if (ORIGIN_STATES.includes(input.state)) {
    if (
      !t.originResolved &&
      !t.originEventEmitted &&
      !positionStale &&
      distOriginM !== null
    ) {
      const ev = advancePlace(t, "origin", distOriginM, distDestM, input, now)
      if (ev) events.push(ev)
    }
  } else if (DEST_STATES.includes(input.state) || input.state === "FINALIZED") {
    // Transicionó a DELIVERY+ → el lado origin queda sano (o, si el evento ya
    // se emitió, fue un marcado tardío: el evento queda y la UI muestra el
    // estado actual vía join con MonchisOrderCache).
    t.originResolved = true
  }

  // Lado dest: solo mientras la acción pendiente es marcar FINALIZED. La
  // resolución sana es que la orden desaparezca del feed (FINALIZED/cancelada):
  // la fila huérfana se poda sin evento.
  if (
    DEST_STATES.includes(input.state) &&
    !t.destEventEmitted &&
    !positionStale &&
    distDestM !== null
  ) {
    const ev = advancePlace(t, "dest", distDestM, distOriginM, input, now)
    if (ev) events.push(ev)
  }

  return {
    next: t,
    events,
    distOriginM: distOriginM !== null ? Math.round(distOriginM) : null,
    distDestM: distDestM !== null ? Math.round(distDestM) : null,
    positionStale,
  }
}

// ----------------------------------------------------------------------------
// Orquestador IO — llamado desde captureLiveOrders() (cron, 1/min). Fail-safe:
// el caller lo envuelve en try/catch para no romper la captura.
// ----------------------------------------------------------------------------

export interface DetectDeparturesResult {
  tracked: number
  samples: number
  eventsCreated: number
}

export async function detectDriverDepartures(
  active: LiveRequest[],
  drivers: LiveDriver[],
  now: Date = new Date(),
): Promise<DetectDeparturesResult> {
  const trackableStates = new Set<string>([...ORIGIN_STATES, ...DEST_STATES])
  const driverPos = new Map(drivers.map((d) => [d.driverId, d.position]))

  const inputs: OrderSampleInput[] = []
  for (const r of active) {
    if (!r.driverId || !r.state || !trackableStates.has(r.state)) continue
    inputs.push({
      requestId: r.requestId,
      driverId: r.driverId,
      externalOrderId: r.externalOrderId,
      driverName: r.driverName,
      branchName: r.origin?.name || null,
      destAddress: r.destination?.address || r.destination?.name || null,
      zoneName: r.zoneName,
      state: r.state,
      driverPos: driverPos.get(r.driverId) ?? null,
      origin: r.origin ? { lat: r.origin.lat, lng: r.origin.lng } : null,
      destination: r.destination
        ? { lat: r.destination.lat, lng: r.destination.lng }
        : null,
    })
  }
  if (inputs.length === 0) return { tracked: 0, samples: 0, eventsCreated: 0 }

  const activeIds = inputs.map((i) => i.requestId)
  const prevRows = await prisma.liveOrderTracking.findMany({
    where: { requestId: { in: activeIds } },
  })
  const prevByid = new Map(prevRows.map((row) => [row.requestId, row]))

  const nextRows: TrackingState[] = []
  const events: DepartureEventDraft[] = []
  const samples: {
    fetchedAt: Date
    requestId: string
    driverId: string
    state: string
    driverLat: number | null
    driverLng: number | null
    distOriginM: number | null
    distDestM: number | null
    positionStale: boolean
  }[] = []

  for (const input of inputs) {
    const result = advanceTracking(prevByid.get(input.requestId) ?? null, input, now)
    nextRows.push(result.next)
    events.push(...result.events)
    samples.push({
      fetchedAt: now,
      requestId: input.requestId,
      driverId: input.driverId,
      state: input.state,
      driverLat: input.driverPos?.lat ?? null,
      driverLng: input.driverPos?.lng ?? null,
      distOriginM: result.distOriginM,
      distDestM: result.distDestM,
      positionStale: result.positionStale,
    })
  }

  // Reescritura del tracking en 2 queries (el cron es el único escritor, no
  // hay carrera). Mucho más barato que N upserts con 200-300 órdenes activas.
  await prisma.$transaction([
    prisma.liveOrderTracking.deleteMany({
      where: { requestId: { in: activeIds } },
    }),
    prisma.liveOrderTracking.createMany({ data: nextRows }),
  ])

  await prisma.liveOrderSample.createMany({ data: samples })

  let eventsCreated = 0
  if (events.length > 0) {
    // @@unique([requestId, type]) + skipDuplicates = backstop de dedup además
    // del flag eventEmitted en tracking.
    const res = await prisma.driverDepartureEvent.createMany({
      data: events,
      skipDuplicates: true,
    })
    eventsCreated = res.count
    if (eventsCreated > 0) {
      console.log(
        `🚩 [departure-detection] ${eventsCreated} evento(s): ` +
          events
            .map((e) => `${e.type} req=${e.requestId} driver=${e.driverName}`)
            .join("; "),
      )
    }
  }

  return { tracked: nextRows.length, samples: samples.length, eventsCreated }
}

// Poda (llamada en el bloque horario del cron, junto a la de LiveCaptureRun).
export async function pruneDepartureData(
  now: Date = new Date(),
): Promise<{ samples: number; events: number; tracking: number }> {
  const sampleCutoff = new Date(
    now.getTime() - CFG.sampleRetentionDays * 24 * 60 * 60 * 1000,
  )
  const eventCutoff = new Date(
    now.getTime() - CFG.eventRetentionDays * 24 * 60 * 60 * 1000,
  )
  const staleCutoff = new Date(now.getTime() - CFG.trackingStaleMs)

  const [samples, events, tracking] = await prisma.$transaction([
    prisma.liveOrderSample.deleteMany({
      where: { fetchedAt: { lt: sampleCutoff } },
    }),
    prisma.driverDepartureEvent.deleteMany({
      where: { detectedAt: { lt: eventCutoff } },
    }),
    prisma.liveOrderTracking.deleteMany({
      where: { lastSeenAt: { lt: staleCutoff } },
    }),
  ])
  return {
    samples: samples.count,
    events: events.count,
    tracking: tracking.count,
  }
}
