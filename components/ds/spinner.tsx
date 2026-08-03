import { cn } from "@/lib/utils"

export type SpinnerSize = "sm" | "md" | "lg"

const SIZE: Record<SpinnerSize, string> = {
  sm: "size-3.5 border-2",
  md: "size-5 border-2",
  lg: "size-7 border-[3px]",
}

export interface SpinnerProps {
  size?: SpinnerSize
  className?: string
}

/** Loader inline: anillo que gira en el color actual (usar en botones/cards). */
export function Spinner({ size = "sm", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        "inline-block animate-spin rounded-full border-current border-t-transparent text-primary",
        SIZE[size],
        className,
      )}
    />
  )
}

export interface LoadingOverlayProps {
  size?: SpinnerSize
  className?: string
}

/** Capa de carga para cards: cubre el contenedor relativo con un Spinner. */
export function LoadingOverlay({ size = "md", className }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 grid place-items-center rounded-[var(--radius-lg)] bg-card/60 backdrop-blur-sm",
        className,
      )}
    >
      <Spinner size={size} />
    </div>
  )
}
