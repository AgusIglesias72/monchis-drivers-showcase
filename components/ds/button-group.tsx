import { cn } from "@/lib/utils"

/**
 * Agrupa botones/acciones relacionadas en un contenedor segmentado.
 * Usar con Button variant="ghost" size="sm" adentro.
 */
export function ButtonGroup({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5 shadow-[var(--shadow-soft)]",
        "[&>*]:rounded-full",
        className,
      )}
    >
      {children}
    </div>
  )
}
