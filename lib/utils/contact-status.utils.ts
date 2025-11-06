// lib/utils/contact-status.utils.ts

/**
 * Tipos de estado de contacto
 */
export type ContactStatus = 
  | 'contacted'      // Verde - Ya se contactó
  | 'urgent'         // Azul - 4+ pasos, recomendar contactar
  | 'pending'        // Amarillo - 1-3 pasos
  | 'disabled'       // Gris - Postulación rechazada

/**
 * Configuración de estilos para cada estado
 * Formato similar a los iconos de "Estados" (círculos con fondo de color)
 */
export const CONTACT_STATUS_CONFIG = {
  contacted: {
    label: 'Contactado',
    bg: 'bg-green-100',
    text: 'text-green-700',
    hoverBg: 'hover:bg-green-200',
    tooltip: 'Contactado'
  },
  urgent: {
    label: 'Urgente',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    hoverBg: 'hover:bg-blue-200',
    tooltip: 'Contactar'
  },
  pending: {
    label: 'Pendiente',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    hoverBg: 'hover:bg-gray-200',
    tooltip: 'Pendiente'
  },
  disabled: {
    label: 'Rechazado',
    bg: 'bg-red-100',
    text: 'text-red-700',
    hoverBg: 'hover:bg-red-200',
    tooltip: 'Rechazado'
  }
} as const

/**
 * Calcula el estado de contacto según los datos del driver
 */
export function getContactStatus(
  isRejected: boolean,
  hasBeenContacted: boolean,
  completedSteps: number
): ContactStatus {
  // Si está rechazado → rojo
  if (isRejected) {
    return 'disabled'
  }
  
  // Si ya fue contactado → verde
  if (hasBeenContacted) {
    return 'contacted'
  }
  
  // Si tiene 4+ pasos completados → azul (urgente)
  if (completedSteps >= 4) {
    return 'urgent'
  }
  
  // Si tiene 1-3 pasos → gris (pendiente)
  return 'pending'
}

/**
 * Obtiene la configuración de estilo para un estado
 */
export function getContactStatusConfig(status: ContactStatus) {
  return CONTACT_STATUS_CONFIG[status]
}

/**
 * Verifica si se puede contactar al driver
 */
export function canContactDriver(status: ContactStatus): boolean {
  return status !== 'disabled'
}