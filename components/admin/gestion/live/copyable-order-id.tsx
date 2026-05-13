"use client"

import { toast } from "sonner"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Props {
  externalOrderId: string | null
  requestId: string
  // Tamaño visual. Las filas inline van con "sm"; las cards grandes con "md".
  size?: "sm" | "md"
  className?: string
}

const SIZE_CLASS: Record<"sm" | "md", string> = {
  sm: "h-auto px-1.5 text-[10px]",
  md: "h-5 px-1.5 text-[11px]",
}

/**
 * Chip con #externalOrderId. Click copia el externalOrderId al clipboard.
 * Si no hay externalOrderId, se muestra "#—" sin acción.
 *
 * El click hace stopPropagation para no disparar el onClick del contenedor
 * (que típicamente abre el drawer del pedido).
 */
export function CopyableOrderId({
  externalOrderId,
  requestId,
  size = "md",
  className = "",
}: Props) {
  const sizeClass = SIZE_CLASS[size]
  if (!externalOrderId) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`shrink-0 inline-flex items-center rounded bg-muted/50 font-mono font-bold italic tabular-nums text-muted-foreground ${sizeClass} ${className}`}
          >
            #—
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-0.5 text-xs">
            <div>Pedido sin ID externo todavía</div>
            <div className="font-mono text-[10px] text-muted-foreground">
              {requestId}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }
  const copy = () => {
    navigator.clipboard.writeText(externalOrderId).then(
      () => toast.success(`ID copiado: ${externalOrderId}`),
      () => toast.error("No se pudo copiar"),
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            copy()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              e.stopPropagation()
              copy()
            }
          }}
          className={`shrink-0 inline-flex items-center cursor-copy rounded bg-muted font-mono font-bold tabular-nums hover:bg-muted/60 ${sizeClass} ${className}`}
        >
          #{externalOrderId}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">Click para copiar #{externalOrderId}</div>
      </TooltipContent>
    </Tooltip>
  )
}
