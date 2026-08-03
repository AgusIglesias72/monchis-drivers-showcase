import { cn } from "@/lib/utils"

export interface MetricGridProps {
  /** Cantidad de columnas en pantallas medianas+. */
  columns?: 2 | 3 | 4
  children: React.ReactNode
  className?: string
}

const COLUMNS: Record<NonNullable<MetricGridProps["columns"]>, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
}

/** Grilla responsive para envolver `KpiCard` / métricas. */
export function MetricGrid({
  columns = 3,
  children,
  className,
}: MetricGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-3", COLUMNS[columns], className)}>
      {children}
    </div>
  )
}

export interface StatItem {
  label: React.ReactNode
  value: React.ReactNode
}

export interface StatListProps {
  items: StatItem[]
  className?: string
}

/** Lista vertical compacta label → value, con valores en mono. */
export function StatList({ items, className }: StatListProps) {
  return (
    <dl className={cn("flex flex-col", className)}>
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 border-b border-border py-1.5 last:border-b-0"
        >
          <dt className="text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
            {item.label}
          </dt>
          <dd className="font-[family-name:var(--font-mono)] text-sm text-foreground">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
