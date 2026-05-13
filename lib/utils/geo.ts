/**
 * Distancia "as the crow flies" entre dos puntos por fórmula de Haversine.
 * No tiene en cuenta el ruteo real por calle — útil como aproximación rápida
 * para mostrar "le falta X" en el panel live. La distancia real será mayor.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000 // radio terrestre en metros
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function formatDistance(meters: number | null): string {
  if (meters === null) return "—"
  if (meters < 1000) return `${Math.round(meters)}m`
  const km = meters / 1000
  if (km < 10) return `${km.toFixed(1)}km`
  return `${Math.round(km)}km`
}

interface LatLng {
  lat: number
  lng: number
}

/**
 * Distancia restante para completar la acción actual del driver según el
 * estado del pedido:
 *   ACCEPTED       → driver → comercio
 *   WAITING_ORDER  → 0 (ya está en el comercio)
 *   DELIVERY       → driver → cliente
 *   OUTSIDE        → driver → cliente (ya cerca)
 *   resto / falta de coords → null
 *
 * Devuelve un objeto con metros + el "leg" para que el caller pueda mostrar
 * un label tipo "al comercio" / "al cliente".
 */
export function remainingDistanceForRequest(input: {
  state: string | null | undefined
  driverPosition: LatLng | null | undefined
  origin: LatLng | null | undefined
  destination: LatLng | null | undefined
}): { meters: number; leg: "to-commerce" | "to-client" } | null {
  const { state, driverPosition, origin, destination } = input
  if (!driverPosition) return null
  if (state === "ACCEPTED") {
    if (!origin) return null
    return {
      meters: haversineMeters(
        driverPosition.lat,
        driverPosition.lng,
        origin.lat,
        origin.lng,
      ),
      leg: "to-commerce",
    }
  }
  if (state === "DELIVERY" || state === "OUTSIDE") {
    if (!destination) return null
    return {
      meters: haversineMeters(
        driverPosition.lat,
        driverPosition.lng,
        destination.lat,
        destination.lng,
      ),
      leg: "to-client",
    }
  }
  if (state === "WAITING_ORDER") {
    return { meters: 0, leg: "to-client" }
  }
  return null
}
