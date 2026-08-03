import { cn } from "@/lib/utils"

/**
 * Set de tabla STUDIO. Partes composicionales, wrappers finos sobre `<table>`.
 * Contenedor con borde redondeado sobre `bg-card`; header `bg-muted/50` con
 * ths tipo label; filas `border-t` con hover suave. `mono` para celdas de
 * métricas / IDs / tiempos.
 */

export type DataTableProps = React.ComponentProps<"table">

/** Contenedor + tabla. Envolvé con esto y usá las partes adentro. */
export function DataTable({ className, children, ...props }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-soft)]">
      <div className="relative w-full overflow-x-auto">
        <table
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        >
          {children}
        </table>
      </div>
    </div>
  )
}

export type DataTableHeaderProps = React.ComponentProps<"thead">

export function DataTableHeader({
  className,
  ...props
}: DataTableHeaderProps) {
  return <thead className={cn("bg-muted/50", className)} {...props} />
}

export type DataTableBodyProps = React.ComponentProps<"tbody">

export function DataTableBody({ className, ...props }: DataTableBodyProps) {
  return <tbody className={className} {...props} />
}

export type DataTableRowProps = React.ComponentProps<"tr">

export function DataTableRow({ className, ...props }: DataTableRowProps) {
  return (
    <tr
      className={cn(
        "border-t border-border transition-colors first:border-t-0 hover:bg-muted/30 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  )
}

export type DataTableHeadProps = React.ComponentProps<"th">

export function DataTableHead({ className, ...props }: DataTableHeadProps) {
  return (
    <th
      className={cn(
        "h-9 px-3 text-left align-middle text-[10px] font-medium uppercase tracking-[var(--ls-label)] whitespace-nowrap text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

export interface DataTableCellProps extends React.ComponentProps<"td"> {
  /** Tipografía mono para métricas, IDs y tiempos. */
  mono?: boolean
}

export function DataTableCell({
  className,
  mono,
  ...props
}: DataTableCellProps) {
  return (
    <td
      className={cn(
        "px-3 py-2 align-middle whitespace-nowrap text-foreground",
        mono && "font-[family-name:var(--font-mono)]",
        className,
      )}
      {...props}
    />
  )
}
