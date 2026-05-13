import type {
  LiveCommerce,
  LiveRequest,
} from "@/lib/types/live-panel.types"

// La API legacy expone `branch_id` numérico pero NO un nombre de comercio
// confiable. Usamos `origin.name` como mejor proxy (la API legacy lo trae en
// data_origin.name cuando lo tiene). Si está vacío, mostramos "Comercio #ID".
function commerceNameFor(r: LiveRequest): string {
  const raw = r.origin?.name?.trim()
  return raw && raw.length > 0 ? raw : `Comercio #${r.branchId ?? "—"}`
}

function ageSecondsSince(iso: string | null, nowMs: number): number | null {
  if (!iso) return null
  const ms = nowMs - new Date(iso).getTime()
  if (isNaN(ms) || ms < 0) return null
  return Math.floor(ms / 1000)
}

interface AggregateInput {
  pending: LiveRequest[]
  delayed: LiveRequest[]
  active: LiveRequest[]
}

export function aggregateCommerces({
  pending,
  delayed,
  active,
}: AggregateInput): LiveCommerce[] {
  const nowMs = Date.now()
  const delayedSet = new Set(delayed.map((r) => r.requestId))

  // Dedup por requestId. Igual que en LiveSidePanel: la API legacy a veces
  // devuelve el mismo pedido en `pending` y en `active` durante una transición,
  // y `active` está más enriquecido (driver + zona), así que gana.
  const byId = new Map<string, LiveRequest>()
  for (const r of pending) byId.set(r.requestId, r)
  for (const r of active) byId.set(r.requestId, r)

  const groups = new Map<number, LiveRequest[]>()
  for (const r of byId.values()) {
    if (r.branchId == null) continue
    const list = groups.get(r.branchId)
    if (list) list.push(r)
    else groups.set(r.branchId, [r])
  }

  const commerces: LiveCommerce[] = []
  for (const [branchId, requests] of groups) {
    const requestsWithAge = requests.map((r) => ({
      r,
      ageSec: ageSecondsSince(r.currentStateSince, nowMs),
    }))
    requestsWithAge.sort((a, b) => (b.ageSec ?? -1) - (a.ageSec ?? -1))

    const countByState: Record<string, number> = {}
    const driversMap = new Map<string, string>()
    let pendingNoDriverCount = 0
    let delayedCount = 0
    let maxAge: number | null = null
    let firstNamed: LiveRequest | undefined
    let firstWithCoords: LiveRequest | undefined
    let firstWithZone: LiveRequest | undefined

    for (const { r, ageSec } of requestsWithAge) {
      const state = r.state ?? "UNKNOWN"
      countByState[state] = (countByState[state] ?? 0) + 1
      if (r.driverId && r.driverName) {
        if (!driversMap.has(r.driverId)) driversMap.set(r.driverId, r.driverName)
      }
      if (r.state === "PENDING" && !r.driverId) pendingNoDriverCount += 1
      if (r.isDelayed || delayedSet.has(r.requestId)) delayedCount += 1
      if (ageSec !== null) {
        if (maxAge === null || ageSec > maxAge) maxAge = ageSec
      }
      if (!firstNamed && r.origin?.name?.trim()) firstNamed = r
      if (!firstWithCoords && r.origin) firstWithCoords = r
      if (!firstWithZone && r.zoneName) firstWithZone = r
    }

    const display = firstNamed ?? requests[0]
    commerces.push({
      branchId,
      name: commerceNameFor(display),
      location: firstWithCoords?.origin
        ? {
            lat: firstWithCoords.origin.lat,
            lng: firstWithCoords.origin.lng,
          }
        : null,
      zoneName: firstWithZone?.zoneName ?? null,
      zoneColor: firstWithZone?.zoneColor ?? null,
      totalActive: requests.length,
      countByState,
      maxStateAgeSeconds: maxAge,
      requestIds: requestsWithAge.map((x) => x.r.requestId),
      requests: requestsWithAge.map((x) => x.r),
      drivers: [...driversMap.entries()].map(([driverId, driverName]) => ({
        driverId,
        driverName,
      })),
      pendingNoDriverCount,
      delayedCount,
      hasAlert: pendingNoDriverCount > 0 || delayedCount > 0,
    })
  }

  // Orden por defecto (tier-based):
  //   1) Comercios con pedidos críticos (>15min en estado) o delayed primero.
  //   2) Comercios con pedidos buscando driver van segundos.
  //   3) Resto.
  // Dentro de cada tier: por cantidad de pedidos desc, luego demora máxima desc.
  // Cumple "más a menos pedidos, pero priorizando los que tienen tiempos altos".
  const CRITICAL_SEC = 15 * 60
  function tierFor(c: LiveCommerce): number {
    if ((c.maxStateAgeSeconds ?? 0) >= CRITICAL_SEC || c.delayedCount > 0)
      return 0
    if (c.pendingNoDriverCount > 0) return 1
    return 2
  }
  commerces.sort((a, b) => {
    const ta = tierFor(a)
    const tb = tierFor(b)
    if (ta !== tb) return ta - tb
    if (a.totalActive !== b.totalActive) return b.totalActive - a.totalActive
    return (b.maxStateAgeSeconds ?? -1) - (a.maxStateAgeSeconds ?? -1)
  })
  return commerces
}
