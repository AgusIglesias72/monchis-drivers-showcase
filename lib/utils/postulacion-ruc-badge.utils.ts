import { Landmark, CircleHelp, CircleX, CircleCheck, CircleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface RucBadgeConfig {
  icon: LucideIcon
  bg: string
  text: string
  tooltip: string
}

/**
 * Mapea el rucStatus (string libre recibido de turuc.com.py) a la
 * configuración visual del ícono en la columna ESTADOS de admin.
 *
 * Convención de colores:
 *  - Gris      → NOT_CHECKED / null (aún no consultado)
 *  - Amarillo  → NO_ENCONTRADO (consultado, RUC no existe en SET)
 *  - Verde     → ACTIVO
 *  - Rojo      → cualquier otro estado reportado (INACTIVO, CLAUSURADO, SUSPENDIDO, etc.)
 *  - Gris/red  → ERROR (fallo de API, reintentable)
 */
export function getRucBadgeConfig(
  rucStatus: string | null | undefined,
  rucName?: string | null,
): RucBadgeConfig {
  const status = rucStatus || 'NOT_CHECKED'

  if (status === 'NOT_CHECKED') {
    return {
      icon: CircleHelp,
      bg: 'bg-gray-100',
      text: 'text-gray-500',
      tooltip: 'RUC: aún no consultado',
    }
  }

  if (status === 'ERROR') {
    return {
      icon: CircleAlert,
      bg: 'bg-slate-200',
      text: 'text-slate-600',
      tooltip: 'RUC: error al consultar (reintentable)',
    }
  }

  if (status === 'NO_ENCONTRADO') {
    return {
      icon: CircleX,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      tooltip: 'RUC: no encontrado en SET',
    }
  }

  if (status === 'ACTIVO') {
    return {
      icon: CircleCheck,
      bg: 'bg-green-50',
      text: 'text-green-700',
      tooltip: rucName ? `RUC activo — ${rucName}` : 'RUC activo',
    }
  }

  if (status === 'NOT_APPLICABLE') {
    return {
      icon: CircleHelp,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      tooltip: 'Postulante extranjero — no aplica RUC paraguayo',
    }
  }

  // Cualquier otro estado reportado por SET (INACTIVO, CLAUSURADO, SUSPENDIDO, CANCELADO, etc.)
  return {
    icon: Landmark,
    bg: 'bg-red-50',
    text: 'text-red-700',
    tooltip: rucName ? `RUC ${status} — ${rucName}` : `RUC ${status}`,
  }
}
