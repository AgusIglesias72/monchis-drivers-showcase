// Tipos compartidos entre el service (server-only), las server actions y los
// componentes cliente del módulo de cola de importación de pedidos.

export interface QueueStats {
  pending: number
  done: number
  failed: number
  notFound: number
  total: number
  oldestPendingAt: Date | null
  lastProcessedAt: Date | null
}
