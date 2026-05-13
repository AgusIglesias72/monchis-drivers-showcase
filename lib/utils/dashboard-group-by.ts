/**
 * Deriva la agrupación temporal a partir del tamaño del rango seleccionado.
 * - ≤ 21 días → "day"
 * - ≤ 120 días → "week"
 * - > 120 días → "month"
 * - sin rango  → "week" (default)
 *
 * Función pura, sin React. Server-safe — la consume tanto app/admin/page.tsx
 * (server) como onboarding-date-filter (client).
 */
export function inferGroupBy(
  start: Date | undefined,
  end: Date | undefined,
): "day" | "week" | "month" {
  if (!start || !end) return "week"
  const startMs = start.getTime()
  const endMs = end.getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "week"
  const lo = Math.min(startMs, endMs)
  const hi = Math.max(startMs, endMs)
  // Inclusive: rango [d, d] cuenta como 1 día.
  const days = Math.floor((hi - lo) / (24 * 60 * 60 * 1000)) + 1
  if (days <= 21) return "day"
  if (days <= 120) return "week"
  return "month"
}
