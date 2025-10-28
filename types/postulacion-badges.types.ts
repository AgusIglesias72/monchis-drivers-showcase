// types/postulacion-badges.types.ts

import { FormDriver, FormDocument, EquipmentPayment, FinancialService, OnboardingAttendee } from '@prisma/client'

/**
 * Estados posibles de badges para una postulación
 */
export type PostulacionBadgeType =
  | 'VERIFICAR_SOLICITUD'      // 🔵 Solicitud sin revisar
  | 'DOCUMENTOS_PENDIENTES'    // 🟡 Faltan documentos requeridos
  | 'DOCUMENTOS_EN_REVISION'   // 🟡 Documentos en revisión
  | 'DOCUMENTOS_COMPLETOS'     // 🟢 Documentos completos
  | 'FACTURACION_PENDIENTE'    // 🟠 Falta certificado tributario
  | 'FACTURACION_COMPLETA'     // 🟢 Facturación completa
  | 'FACTURACION_NA'           // ⚪ No aplica facturación
  | 'PAGO_PENDIENTE'           // 🔴 No hay pago registrado
  | 'PAGO_EN_VERIFICACION'     // 🟣 Pago en verificación
  | 'PAGO_COMPLETO'            // 🟢 Pago completo
  | 'VERIFICAR_PAGO'           // 🟣 Pago existe pero no verificado
  | 'PAGADO'                   // 🟢 Pago verificado
  | 'AGENDADO'                 // 🟢 Tiene onboarding agendado

/**
 * Configuración de estilo y texto para cada badge
 */
export interface BadgeConfig {
  type: PostulacionBadgeType
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className?: string
  icon?: string
}

/**
 * Postulación completa con todas las relaciones necesarias para calcular badges
 */
export type PostulacionConRelaciones = FormDriver & {
  documents: FormDocument[]
  equipmentPayments: EquipmentPayment[]
  financialService: FinancialService | null
  onboardingAttendances: OnboardingAttendee[]
}

/**
 * Resultado del cálculo de badges para una postulación
 */
export interface PostulacionBadgesResult {
  badges: PostulacionBadgeType[]
  details: {
    hasCedulaApproved: boolean
    hasCriminalRecordApproved: boolean
    hasPayment: boolean
    paymentStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | null
    hasTaxCompliance: boolean
    hasScheduledOnboarding: boolean
    isScheduledOnboarding: boolean
  }
}

/**
 * Configuraciones visuales de los badges
 */
export const BADGE_CONFIGS: Record<PostulacionBadgeType, BadgeConfig> = {
  VERIFICAR_SOLICITUD: {
    type: 'VERIFICAR_SOLICITUD',
    label: 'Verificar Solicitud',
    variant: 'outline',
    className: 'border-blue-500 text-blue-700 bg-blue-50'
  },
  DOCUMENTOS_PENDIENTES: {
    type: 'DOCUMENTOS_PENDIENTES',
    label: 'Documentos Pendientes',
    variant: 'outline',
    className: 'border-yellow-500 text-yellow-700 bg-yellow-50'
  },
  DOCUMENTOS_EN_REVISION: {
    type: 'DOCUMENTOS_EN_REVISION',
    label: 'Documentos en Revisión',
    variant: 'outline',
    className: 'border-amber-500 text-amber-700 bg-amber-50'
  },
  DOCUMENTOS_COMPLETOS: {
    type: 'DOCUMENTOS_COMPLETOS',
    label: 'Documentos Completos',
    variant: 'default',
    className: 'border-green-500 text-green-700 bg-green-50'
  },
  FACTURACION_PENDIENTE: {
    type: 'FACTURACION_PENDIENTE',
    label: 'Facturación Pendiente',
    variant: 'outline',
    className: 'border-orange-500 text-orange-700 bg-orange-50'
  },
  FACTURACION_COMPLETA: {
    type: 'FACTURACION_COMPLETA',
    label: 'Facturación Completa',
    variant: 'default',
    className: 'border-green-500 text-green-700 bg-green-50'
  },
  FACTURACION_NA: {
    type: 'FACTURACION_NA',
    label: 'No Aplica',
    variant: 'secondary',
    className: 'border-gray-500 text-gray-700 bg-gray-50'
  },
  PAGO_PENDIENTE: {
    type: 'PAGO_PENDIENTE',
    label: 'Pago Pendiente',
    variant: 'destructive',
    className: 'border-red-500 text-red-700 bg-red-50'
  },
  PAGO_EN_VERIFICACION: {
    type: 'PAGO_EN_VERIFICACION',
    label: 'Pago en Verificación',
    variant: 'outline',
    className: 'border-purple-500 text-purple-700 bg-purple-50'
  },
  PAGO_COMPLETO: {
    type: 'PAGO_COMPLETO',
    label: 'Pago Completo',
    variant: 'default',
    className: 'border-green-500 text-green-700 bg-green-50'
  },
  VERIFICAR_PAGO: {
    type: 'VERIFICAR_PAGO',
    label: 'Verificar Pago',
    variant: 'outline',
    className: 'border-purple-500 text-purple-700 bg-purple-50'
  },
  PAGADO: {
    type: 'PAGADO',
    label: 'Pagado',
    variant: 'default',
    className: 'border-green-500 text-green-700 bg-green-50'
  },
  AGENDADO: {
    type: 'AGENDADO',
    label: 'Agendado',
    variant: 'default',
    className: 'border-emerald-500 text-emerald-700 bg-emerald-50'
  }
}