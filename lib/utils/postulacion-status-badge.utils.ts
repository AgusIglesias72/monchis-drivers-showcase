// lib/utils/postulacion-status-badge.utils.ts

import { Badge } from '@/components/ui/badge'

/**
 * Retorna el badge apropiado para el estado de postulación
 */
export function getPostulacionStatusBadge(status: string, currentStep?: number, isAssisted?: boolean) {
  // ✅ NUEVO: Si es asistida y está en progreso, mostrar badge especial
  if (isAssisted && status === 'IN_PROGRESS') {
    return {
      label: 'Asistida', // Solo "Asistida", sin el X/6
      variant: 'default' as const,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
    }
  }

  const statusConfig: Record<string, { 
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    className?: string 
  }> = {
    'REJECTED': {
      label: 'Rechazada',
      variant: 'destructive',
      className: 'bg-red-100 text-red-800 border-red-200'
    },
    'IN_PROGRESS': {
      label: 'En Progreso',
      variant: 'outline',
      className: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    'COMPLETED': {
      label: 'Completada',
      variant: 'outline',
      className: 'bg-green-50 text-green-700 border-green-200'
    },
    'SUBMITTED': {
      label: 'Enviada',
      variant: 'outline',
      className: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    'UNDER_REVIEW': {
      label: 'En Revisión',
      variant: 'outline',
      className: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    'APPROVED': {
      label: 'Aprobada',
      variant: 'outline',
      className: 'bg-green-50 text-green-700 border-green-200'
    },
    'READY_ONBOARDING': {
      label: 'Lista para OB',
      variant: 'outline',
      className: 'bg-cyan-50 text-cyan-700 border-cyan-200'
    },
    'ONBOARDING': {
      label: 'En Onboarding',
      variant: 'outline',
      className: 'bg-teal-50 text-teal-700 border-teal-200'
    },
    'ACTIVE': {
      label: 'Activa',
      variant: 'outline',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    'ABANDONED': {
      label: 'Abandonada',
      variant: 'secondary',
      className: 'bg-gray-100 text-gray-600 border-gray-200'
    },
    'DOCS_PENDING': {
      label: 'Docs Pendientes',
      variant: 'outline',
      className: 'bg-orange-50 text-orange-700 border-orange-200'
    }
  }

  return statusConfig[status] || {
    label: status,
    variant: 'outline' as const,
    className: 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

/**
 * Determina si una postulación está rechazada
 */
export function isPostulacionRejected(status: string): boolean {
  return status === 'REJECTED'
}