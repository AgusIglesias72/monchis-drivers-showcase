import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export interface SkeletonTextProps {
  lines?: number
  className?: string
}

/** Bloque de líneas de texto (la última más corta). */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5 rounded-[var(--radius-md)]", i === lines - 1 && "w-2/3")}
        />
      ))}
    </div>
  )
}

export interface SkeletonCardProps {
  className?: string
}

/** Silueta de card STUDIO (título + líneas). */
export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <Skeleton className="h-4 w-1/3 rounded-[var(--radius-md)]" />
      <SkeletonText lines={2} />
    </div>
  )
}

export interface SkeletonKpiProps {
  className?: string
}

/** Silueta de celda de métrica (label + valor mono). */
export function SkeletonKpi({ className }: SkeletonKpiProps) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-[var(--radius-md)] border border-border bg-card p-2.5",
        className,
      )}
    >
      <Skeleton className="h-2.5 w-16 rounded-full" />
      <Skeleton className="h-6 w-24 rounded-[var(--radius-md)]" />
    </div>
  )
}

export interface SkeletonListProps {
  rows?: number
  className?: string
}

/** Silueta de lista (avatar + dos líneas por fila). */
export function SkeletonList({ rows = 4, className }: SkeletonListProps) {
  return (
    <div
      className={cn(
        "divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-card",
        className,
      )}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/3 rounded-[var(--radius-md)]" />
            <Skeleton className="h-3 w-1/2 rounded-[var(--radius-md)]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export interface SkeletonTableProps {
  rows?: number
  cols?: number
  className?: string
}

/** Silueta de tabla (header + celdas). */
export function SkeletonTable({ rows = 5, cols = 4, className }: SkeletonTableProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card",
        className,
      )}
    >
      <div
        className="grid gap-3 border-b border-border bg-muted/40 p-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-2/3 rounded-full" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-3 p-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-3.5 rounded-[var(--radius-md)]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
