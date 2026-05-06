// lib/config/live-panel.config.ts

const BASE = "https://api.monchis-drivers.com"

export const LIVE_PANEL_CONFIG = {
  endpoints: {
    pendingRequests:
      process.env.MONCHIS_DRIVERS_API_URL_PENDING_REQUESTS ||
      `${BASE}/dashboard/pending_requests`,
    delayedRequests:
      process.env.MONCHIS_DRIVERS_API_URL_DELAYED_REQUESTS ||
      `${BASE}/dashboard/delayed_requests`,
    driversStatus:
      process.env.MONCHIS_DRIVERS_API_URL_DRIVERS_STATUS ||
      `${BASE}/dashboard/drivers_status`,
    zonesStatus:
      process.env.MONCHIS_DRIVERS_API_URL_ZONES_STATUS ||
      `${BASE}/admin/zones_status`,
  },
  token: process.env.MONCHIS_DRIVERS_API_TOKEN || "",
  // Centro inicial del mapa (Asunción)
  mapCenter: { lat: -25.2867, lng: -57.6477 },
  mapZoom: 11,
  // Polling cliente
  pollIntervalMs: 15_000,
  // Timeout de cada fetch contra la API legacy (la cortamos rápido para no
  // colgar el polling completo si una ruta puntual está caída).
  fetchTimeoutMs: 8_000,
} as const
