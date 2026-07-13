/**
 * Paleta de charts STUDIO — armonizada con el rojo Monchis.
 *
 * Regla dura: NADA de arcoíris frío por defecto (azul/cian/violeta/teal
 * saturados). Las series arrancan del rojo de marca y se abren hacia
 * cálidos (naranja, gris cálido) que conviven bien con el rojo.
 *
 * Los valores son HEX concretos a propósito: recharts pinta SVG y necesita
 * colores resueltos (no tokens CSS) para `fill`/`stroke` de las series.
 */

// --- Marca -----------------------------------------------------------------
export const BRAND = "#E52050"
export const BRAND_50 = "#FDE8EE"
export const BRAND_100 = "#FBD0DA"
export const BRAND_300 = "#F49DB0"
export const BRAND_500 = "#EC4B6C"
export const BRAND_600 = "#D11C49"
export const BRAND_700 = "#C41B48"

// Cálido de apoyo (no compite con el rojo, lo acompaña).
export const ACCENT_WARM = "#F5853F"

// --- Semánticos ------------------------------------------------------------
export const SUCCESS = "#16A34A"
export const WARNING = "#D97706"
export const INFO = "#2563EB"
export const DANGER = "#DC2626"
/** Gris cálido — series neutras y comparaciones. */
export const NEUTRAL = "#8B837F"

/**
 * Paleta categórica brand-forward: rojo → cálidos → gris cálido.
 * Sin azul/cian/violeta/teal. Pensada para verse agradable junto al rojo.
 */
export const CATEGORICAL = [
  BRAND,
  ACCENT_WARM,
  "#C41B48",
  NEUTRAL,
  "#F49DB0",
  "#7D6531",
] as const

/** Rampa mono-hue de marca, claro → oscuro (para donut / funnel / heat). */
export const SEQUENTIAL = [
  BRAND_50,
  BRAND_100,
  BRAND_300,
  BRAND,
  BRAND_600,
  BRAND_700,
] as const

/** Color de la serie de comparación (W-N / período previo), en punteado. */
export const COMPARISON = NEUTRAL

/** Color categórico ciclando la paleta de marca por índice de serie. */
export function seriesColor(i: number): string {
  return CATEGORICAL[((i % CATEGORICAL.length) + CATEGORICAL.length) % CATEGORICAL.length]
}
