/**
 * Timezone helpers para los dos endpoints de pedidos.
 *
 * Endpoint del pedido (request_histories): la API devuelve ISO con sufijo Z
 * pero el wall-clock ya es PY local (mismo truco que en turnos). Por eso
 * mostramos los componentes UTC tal cual, sin shift.
 *
 * Endpoint del driver (driver_attendance_request_history): los timestamps
 * "YYYY-MM-DD HH:MM:SS" sin TZ vienen en UTC real. Para mostrar en PY local
 * hay que restar 3hs.
 */

/**
 * Parsea un timestamp del endpoint del pedido. Devuelve un Date "estampado"
 * en el TZ del browser pero con los componentes UTC originales — así
 * `format()` de date-fns muestra el wall-clock como PY local.
 */
export function parseOrderInstant(
  iso: string | null | undefined,
): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds(),
  )
}

/**
 * Parsea un timestamp del endpoint del driver ("YYYY-MM-DD HH:MM:SS").
 * Los componentes que vienen ya son PY local — no aplicamos shift de TZ;
 * solo extraemos los componentes y armamos un Date "estampado" en TZ del
 * browser con esos mismos números.
 */
export function parseDriverInstant(
  s: string | null | undefined,
): Date | null {
  if (!s) return null
  const trimmed = s.trim()
  if (!trimmed) return null
  // Parseamos como UTC para evitar que el browser-TZ corra los números.
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)
    ? trimmed.replace(" ", "T")
    : trimmed.replace(" ", "T") + "Z"
  const utc = new Date(normalized)
  if (isNaN(utc.getTime())) return null
  // Componentes UTC = wall-clock PY local (la API ya devuelve en PY).
  return new Date(
    utc.getUTCFullYear(),
    utc.getUTCMonth(),
    utc.getUTCDate(),
    utc.getUTCHours(),
    utc.getUTCMinutes(),
    utc.getUTCSeconds(),
  )
}

/**
 * Diferencia en segundos entre dos fechas (en milisegundos absolutos).
 * Se aplica sobre los timestamps RAW (no los "estampados") para preservar
 * el delta correcto. Para el endpoint del pedido tomamos la fecha original.
 */
export function rawTs(s: string | null | undefined): number | null {
  if (!s) return null
  const t = new Date(s).getTime()
  return isNaN(t) ? null : t
}

/**
 * Convierte un timestamp PY mal etiquetado (sufijo Z pero wall-clock es PY
 * local UTC-3) al instante UTC real. Útil cuando necesitamos comparar con
 * `Date.now()` (p.ej. para calcular cuánto tiempo lleva un pedido en el
 * sistema en el panel Live).
 *
 * Asunción es UTC-3 fijo desde 2024 (no usa DST). Si vuelve a aplicar DST,
 * este offset deja de servir y hay que computarlo dinámicamente.
 */
const PY_OFFSET_MS = 3 * 60 * 60 * 1000

export function pyLocalIsoToRealIso(
  iso: string | null | undefined,
): string | null {
  if (!iso) return null
  const ms = new Date(iso).getTime()
  if (isNaN(ms)) return null
  return new Date(ms + PY_OFFSET_MS).toISOString()
}
