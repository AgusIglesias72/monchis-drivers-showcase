import { cn } from "@/lib/utils"

export type StatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "info"
  | "danger"

const TONE: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  danger: "bg-danger-soft text-destructive",
}

export interface StatusPillProps extends React.ComponentProps<"span"> {
  tone?: StatusTone
  /** Punto de color a la izquierda. */
  dot?: boolean
}

/**
 * Píldora de estado de negocio. El color de un estado debe ser el MISMO en
 * toda la app: mapeá el estado → tone con `statusToneFrom` y pasalo acá.
 */
export function StatusPill({
  children,
  tone = "neutral",
  dot,
  className,
  ...props
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        TONE[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Diccionario reusable estado-de-dominio → tone. Extendé según necesites. */
const STATUS_TONE_MAP: Record<string, StatusTone> = {
  // Pedidos / delivery
  FINALIZED: "success",
  DELIVERED: "success",
  DELIVERY: "info",
  ACCEPTED: "info",
  WAITING_ORDER: "warning",
  OUTSIDE: "warning",
  PENDING: "warning",
  CANCELED: "danger",
  CANCELLED: "danger",
  CANCELED_BY_CLIENT: "danger",
  NO_SHOW: "danger",
  // Pipeline onboarding
  APPROVED: "success",
  VERIFIED: "success",
  ACTIVE: "success",
  IN_REVIEW: "info",
  SUBMITTED: "info",
  SCHEDULED: "info",
  DOCS_PENDING: "warning",
  REJECTED: "danger",
  // Genéricos
  ENABLED: "success",
  DISABLED: "neutral",
  DRAFT: "neutral",
}

export function statusToneFrom(key: string | null | undefined): StatusTone {
  if (!key) return "neutral"
  return STATUS_TONE_MAP[key] ?? "neutral"
}
