// lib/config/departure-detection.config.ts
//
// Umbrales de la detección de "salidas sin acción": driver que llega a un
// lugar (comercio o cliente) y se va sin marcar el cambio de estado esperado.
// Corre dentro del cron collect-live-orders (cadencia 1 muestra/min).

export const DEPARTURE_DETECTION_CONFIG = {
  // "Llegó" = dist <= arriveRadiusM por >= arriveStreak muestras consecutivas.
  // 50m exige que el driver realmente haya estado EN el comercio (no solo pasar
  // cerca / a media cuadra). Trade-off: con geocoding impreciso del comercio o
  // GPS ruidoso (>50m) puede no registrar la llegada → no flaguea (falso
  // negativo). Decisión de producto: preferimos no avisar de más.
  arriveRadiusM: 50,
  // "Se fue" = dist >= leaveRadiusM por >= leaveStreak muestras consecutivas.
  // La banda muerta 50→300m evita oscilación por jitter de GPS estacionado.
  // Solo se evalúa después de confirmar la llegada (≤50m), así que cruzar 300m
  // es una salida inequívoca del lugar donde el driver estuvo.
  leaveRadiusM: 300,
  // Con cadencia 1/min, streak 2 ≈ 1 min de permanencia / evidencia de salida.
  // "Permaneció al menos un minuto y luego se fue."
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
