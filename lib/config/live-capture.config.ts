// lib/config/live-capture.config.ts
//
// Constantes de la captura autónoma de órdenes y del lane rápido de refresh.
// Centralizadas para no hardcodear umbrales en los crons/servicios.

export const LIVE_CAPTURE_CONFIG = {
  // Ventana del lane rápido: pedidos no-terminales con < 2h de antigüedad se
  // refrescan seguido. DEBE coincidir con REFRESH_MIN_AGE_MS del barrido lento
  // (>2h) para que no quede hueco ni solape entre lanes.
  recentWindowMs: 2 * 60 * 60 * 1000,
  // Tope de pedidos recientes a refrescar por corrida del lane rápido. Si hay
  // más, se procesan los más viejos del rango primero y se loguea el overflow.
  recentRefreshMax: 200,
  // Paralelismo de llamadas a la API en el lane rápido. Con cap 200 → ~25
  // rondas; holgado bajo maxDuration=120 del cron aunque la API esté lenta.
  recentRefreshParallel: 8,
  // Reintento de IDs marcados not_found recientemente (carrera: visto en live
  // pero todavía no consultable en request_histories).
  notFoundRetryWindowMs: 30 * 60 * 1000,
  notFoundMaxAttempts: 4,
  // Observabilidad: si la última captura exitosa fue hace más de esto, alerta.
  captureLagAlertMs: 5 * 60 * 1000,
  // Retención de LiveCaptureRun (poda corridas viejas).
  retentionDays: 30,
} as const
