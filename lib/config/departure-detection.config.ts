// lib/config/departure-detection.config.ts
//
// Umbrales de la detección de "salidas sin acción": driver que llega a un
// lugar (comercio o cliente) y se va sin marcar el cambio de estado esperado.
// Corre dentro del cron collect-live-orders (cadencia 1 muestra/min).

export const DEPARTURE_DETECTION_CONFIG = {
  // "Llegó" = dist <= arriveRadiusM por >= arriveStreak muestras consecutivas.
  // 150m absorbe ruido GPS urbano (10-50m) + geocoding impreciso del comercio.
  arriveRadiusM: 150,
  // "Se fue" = dist >= leaveRadiusM por >= leaveStreak muestras consecutivas.
  // La banda muerta 150→350m evita oscilación por jitter de GPS estacionado.
  // A ~20 km/h de moto, 350m ≈ 1 min de viaje: salida inequívoca.
  leaveRadiusM: 350,
  // Con cadencia 1/min, streak 2 ≈ 2 min de evidencia. Mata falsos positivos
  // de pasadas por la puerta a costa de ~2 min de latencia de detección.
  arriveStreak: 2,
  leaveStreak: 2,
  // Estados en los que se evalúa cada lugar. origin = comercio (la acción
  // pendiente es marcar DELIVERY); dest = cliente (marcar FINALIZED).
  originStates: ["ACCEPTED", "WAITING_ORDER"] as const,
  destStates: ["DELIVERY", "OUTSIDE"] as const,
  // Retenciones (poda horaria al minuto 0, mismo patrón que LiveCaptureRun).
  sampleRetentionDays: 7,
  eventRetentionDays: 90,
  // Tracking huérfano: la orden dejó de aparecer en el feed activo hace más
  // de esto (FINALIZED o cancelada) → borrar la fila sin emitir evento.
  trackingStaleMs: 2 * 60 * 60 * 1000,
} as const
