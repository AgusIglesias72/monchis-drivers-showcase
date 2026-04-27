// types/postulacion-badges.types.ts

import { FormDriver, FormDocument, EquipmentPayment, FinancialService, OnboardingAttendee } from '@prisma/client'

/**
 * Estados posibles de badges para una postulación
 */
export type PostulacionBadgeType =
  | 'VERIFICAR_SOLICITUD'
  | 'DOCUMENTOS_PENDIENTES'
  | 'DOCUMENTOS_EN_REVISION'
  | 'DOCUMENTOS_COMPLETOS'
  | 'FACTURACION_PENDIENTE'
  | 'FACTURACION_COMPLETA'
  | 'FACTURACION_NA'
  | 'PAGO_PENDIENTE'
  | 'PAGO_EN_VERIFICACION'
  | 'PAGO_COMPLETO'
  | 'VERIFICAR_PAGO'
  | 'PAGADO'
  | 'AGENDADO'
  | 'ASISTIDA'

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
 * Paleta semántica unificada:
 * - success: APROBADO / VERIFICADO / COMPLETO
 * - warning: PENDIENTE (requiere acción de postulante o admin)
 * - info:    EN PROCESO / AGENDADO / EN REVISIÓN
 * - danger:  CRÍTICO / RECHAZADO / BLOQUEANTE
 * - neutral: NO APLICA
 */
const STYLE_SUCCESS = 'bg-success-soft text-success border-success/25'
const STYLE_WARNING = 'bg-warning-soft text-warning border-warning/30'
const STYLE_INFO = 'bg-info-soft text-info border-info/25'
const STYLE_DANGER = 'bg-danger-soft text-danger border-danger/25'
const STYLE_NEUTRAL = 'bg-muted text-muted-foreground border-border'

/**
 * Configuraciones visuales de los badges
 */
export const BADGE_CONFIGS: Record<PostulacionBadgeType, BadgeConfig> = {
  VERIFICAR_SOLICITUD: {
    type: 'VERIFICAR_SOLICITUD',
    label: 'Verificar Solicitud',
    variant: 'outline',
    className: STYLE_INFO,
  },
  DOCUMENTOS_PENDIENTES: {
    type: 'DOCUMENTOS_PENDIENTES',
    label: 'Documentos Pendientes',
    variant: 'outline',
    className: STYLE_WARNING,
  },
  DOCUMENTOS_EN_REVISION: {
    type: 'DOCUMENTOS_EN_REVISION',
    label: 'Documentos en Revisión',
    variant: 'outline',
    className: STYLE_INFO,
  },
  DOCUMENTOS_COMPLETOS: {
    type: 'DOCUMENTOS_COMPLETOS',
    label: 'Documentos Completos',
    variant: 'outline',
    className: STYLE_SUCCESS,
  },
  FACTURACION_PENDIENTE: {
    type: 'FACTURACION_PENDIENTE',
    label: 'Facturación Pendiente',
    variant: 'outline',
    className: STYLE_WARNING,
  },
  FACTURACION_COMPLETA: {
    type: 'FACTURACION_COMPLETA',
    label: 'Facturación Completa',
    variant: 'outline',
    className: STYLE_SUCCESS,
  },
  FACTURACION_NA: {
    type: 'FACTURACION_NA',
    label: 'No Aplica',
    variant: 'outline',
    className: STYLE_NEUTRAL,
  },
  PAGO_PENDIENTE: {
    type: 'PAGO_PENDIENTE',
    label: 'Pago Pendiente',
    variant: 'outline',
    className: STYLE_DANGER,
  },
  PAGO_EN_VERIFICACION: {
    type: 'PAGO_EN_VERIFICACION',
    label: 'Pago en Verificación',
    variant: 'outline',
    className: STYLE_INFO,
  },
  PAGO_COMPLETO: {
    type: 'PAGO_COMPLETO',
    label: 'Pago Completo',
    variant: 'outline',
    className: STYLE_SUCCESS,
  },
  VERIFICAR_PAGO: {
    type: 'VERIFICAR_PAGO',
    label: 'Verificar Pago',
    variant: 'outline',
    className: STYLE_WARNING,
  },
  PAGADO: {
    type: 'PAGADO',
    label: 'Pagado',
    variant: 'outline',
    className: STYLE_SUCCESS,
  },
  AGENDADO: {
    type: 'AGENDADO',
    label: 'Agendado',
    variant: 'outline',
    className: STYLE_INFO,
  },
  ASISTIDA: {
    type: 'ASISTIDA',
    label: 'Asistida',
    variant: 'outline',
    className: `${STYLE_SUCCESS} font-semibold`,
  },
}
