import { cn } from "@/lib/utils"

export interface ChartLegendItem {
  label: string
  color: string
}

export interface ChartLegendProps {
  items: ChartLegendItem[]
  className?: string
}

/** Leyenda horizontal para los gráficos DS (punto de color + label). */
export function ChartLegend({ items, className }: ChartLegendProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {items.map((it) => (
        <span
          key={it.label}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            className="size-2.5 rounded-full"
            style={{ background: it.color }}
          />
          {it.label}
        </span>
      ))}
    </div>
  )
}
