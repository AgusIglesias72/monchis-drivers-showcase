// components/admin/postulacion-badge.tsx

"use client"

import { Badge } from "@/components/ui/badge"
import { BADGE_CONFIGS, PostulacionBadgeType } from "@/types/postulacion-badges.types"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface PostulacionBadgeProps {
  type: PostulacionBadgeType
  showTooltip?: boolean
  tooltipContent?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Badge individual para mostrar un estado de postulación
 */
export function PostulacionBadge({ 
  type, 
  showTooltip = false,
  tooltipContent,
  size = 'sm',
  className 
}: PostulacionBadgeProps) {
  const config = BADGE_CONFIGS[type]
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  }
  
  const badge = (
    <Badge 
      variant={config.variant}
      className={cn(
        sizeClasses[size],
        config.className,
        'font-medium border whitespace-nowrap',
        className
      )}
    >
      {config.label}
    </Badge>
  )
  
  if (showTooltip && tooltipContent) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  
  return badge
}

/**
 * Tooltips por defecto para cada tipo de badge
 */
export const BADGE_TOOLTIPS: Record<PostulacionBadgeType, string> = {
  VERIFICAR_SOLICITUD: 'La solicitud aún no ha sido revisada. Este badge desaparece al agendar el onboarding.',
  DOCUMENTOS_PENDIENTES: 'Falta al menos 1 documento aprobado de cédula y 1 de antecedentes penales.',
  DOCUMENTOS_EN_REVISION: 'Los documentos están siendo revisados por el equipo administrativo.',
  DOCUMENTOS_COMPLETOS: 'Todos los documentos requeridos han sido aprobados.',
  FACTURACION_PENDIENTE: 'Falta cargar el certificado de cumplimiento tributario.',
  FACTURACION_COMPLETA: 'El certificado de cumplimiento tributario ha sido cargado.',
  FACTURACION_NA: 'Este conductor no puede facturar según su configuración.',
  PAGO_PENDIENTE: 'No hay un pago de equipamiento registrado.',
  PAGO_EN_VERIFICACION: 'Hay un pago registrado pero está siendo verificado.',
  PAGO_COMPLETO: 'El pago de equipamiento ha sido verificado y completado.',
  VERIFICAR_PAGO: 'Hay un pago registrado pero aún no ha sido verificado.',
  PAGADO: 'El pago de equipamiento ha sido verificado.',
  AGENDADO: 'El postulante tiene una fecha de onboarding confirmada.'
}