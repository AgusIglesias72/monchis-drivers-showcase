// components/admin/postulacion-badges-list.tsx

"use client"

import { PostulacionConRelaciones, PostulacionBadgeType } from "@/types/postulacion-badges.types"
import { calculatePostulacionBadges } from "@/lib/utils/postulacion-badges.utils"
import { PostulacionBadge, BADGE_TOOLTIPS } from "./postulacion-badge"
import { cn } from "@/lib/utils"

interface PostulacionBadgesListProps {
  postulacion: PostulacionConRelaciones
  showTooltips?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  maxBadges?: number
}

/**
 * Componente que muestra todos los badges activos de una postulación
 * Los badges se calculan dinámicamente según el estado de documentos, pagos y onboarding
 */
export function PostulacionBadgesList({ 
  postulacion,
  showTooltips = true,
  size = 'sm',
  className,
  maxBadges
}: PostulacionBadgesListProps) {
  const { badges } = calculatePostulacionBadges(postulacion)
  
  if (badges.length === 0) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <PostulacionBadge 
          type="PAGADO" 
          size={size}
          showTooltip={showTooltips}
          tooltipContent="Todos los requisitos están completos"
        />
      </div>
    )
  }
  
  const displayBadges = maxBadges ? badges.slice(0, maxBadges) : badges
  const remainingCount = maxBadges && badges.length > maxBadges ? badges.length - maxBadges : 0
  
  return (
    <div className={cn("flex items-center flex-wrap gap-1.5", className)}>
      {displayBadges.map((badgeType) => (
        <PostulacionBadge
          key={badgeType}
          type={badgeType}
          size={size}
          showTooltip={showTooltips}
          tooltipContent={BADGE_TOOLTIPS[badgeType]}
        />
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-muted-foreground font-medium px-1">
          +{remainingCount}
        </span>
      )}
    </div>
  )
}

/**
 * Versión SUPER compacta para tabla - Solo muestra badges críticos
 * Prioridad: PAGO_PENDIENTE > DOCUMENTOS_PENDIENTES > VERIFICAR_PAGO > otros
 */
export function PostulacionBadgesCritical({ 
  postulacion 
}: { 
  postulacion: PostulacionConRelaciones 
}) {
  const { badges } = calculatePostulacionBadges(postulacion)
  
  // Definir prioridad de badges (de mayor a menor urgencia)
  const priorityOrder: PostulacionBadgeType[] = [
    'PAGO_PENDIENTE',
    'DOCUMENTOS_PENDIENTES',
    'VERIFICAR_PAGO',
    'FACTURACION_PENDIENTE',
    'VERIFICAR_SOLICITUD',
  ]
  
  // Filtrar solo badges críticos (excluir los positivos)
  const criticalBadges = badges.filter(b => 
    b !== 'PAGADO' && b !== 'AGENDADO'
  )
  
  // Si no hay badges críticos, mostrar los positivos
  if (criticalBadges.length === 0) {
    const positiveBadges = badges.filter(b => b === 'PAGADO' || b === 'AGENDADO')
    return (
      <div className="flex items-center gap-1.5">
        {positiveBadges.slice(0, 2).map((badgeType) => (
          <PostulacionBadge
            key={badgeType}
            type={badgeType}
            size="sm"
            showTooltip={true}
            tooltipContent={BADGE_TOOLTIPS[badgeType]}
          />
        ))}
      </div>
    )
  }
  
  // Ordenar por prioridad
  const sortedBadges = criticalBadges.sort((a, b) => {
    const indexA = priorityOrder.indexOf(a)
    const indexB = priorityOrder.indexOf(b)
    return indexA - indexB
  })
  
  // Mostrar solo los 2 más importantes
  const displayBadges = sortedBadges.slice(0, 2)
  const remainingCount = sortedBadges.length - 2
  
  return (
    <div className="flex items-center gap-1.5">
      {displayBadges.map((badgeType) => (
        <PostulacionBadge
          key={badgeType}
          type={badgeType}
          size="sm"
          showTooltip={true}
          tooltipContent={BADGE_TOOLTIPS[badgeType]}
        />
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">
          +{remainingCount}
        </span>
      )}
    </div>
  )
}

/**
 * Versión compacta para uso en tablas
 * Muestra máximo 2 badges + contador
 */
export function PostulacionBadgesCompact({ 
  postulacion 
}: { 
  postulacion: PostulacionConRelaciones 
}) {
  return (
    <PostulacionBadgesList 
      postulacion={postulacion}
      size="sm"
      maxBadges={2}
      showTooltips={true}
    />
  )
}

/**
 * Versión expandida para vistas de detalle
 * Muestra todos los badges sin límite
 */
export function PostulacionBadgesExpanded({ 
  postulacion 
}: { 
  postulacion: PostulacionConRelaciones 
}) {
  return (
    <PostulacionBadgesList 
      postulacion={postulacion}
      size="md"
      showTooltips={true}
    />
  )
}