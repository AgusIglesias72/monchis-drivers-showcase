"use client"

import { useState } from "react"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

export interface KanbanColumnDef {
  id: string
  label: string
  /** Color del dot y contador (ej: "var(--info)"). */
  color: string
  /** Fondo suave del contador y resumen (ej: "var(--info-soft)"). */
  softColor: string
}

export interface KanbanItemBase {
  id: string
  /** id de la columna donde vive el item. */
  column: string
}

export interface KanbanBoardProps<T extends KanbanItemBase> {
  columns: KanbanColumnDef[]
  items: T[]
  /** El parent actualiza `items`; el board no muta estado propio de datos. */
  onMove: (itemId: string, toColumn: string) => void
  /** Contenido interno de cada tarjeta (el board pone el wrapper draggable). */
  renderItem: (item: T) => React.ReactNode
  /** Caja de resumen bajo el header de columna (total, monto…). */
  columnSummary?: (items: T[], column: KanbanColumnDef) => React.ReactNode
  emptyLabel?: string
  maxColumnHeight?: number
  className?: string
}

/**
 * Board Kanban con drag & drop nativo HTML5 (sin librerías): columnas con
 * contador, highlight del drop target y tarjetas arrastrables.
 */
export function KanbanBoard<T extends KanbanItemBase>({
  columns,
  items,
  onMove,
  renderItem,
  columnSummary,
  emptyLabel = "Arrastrá tarjetas acá",
  maxColumnHeight = 480,
  className,
}: KanbanBoardProps<T>) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  function handleDrop(column: string) {
    if (draggingId) onMove(draggingId, column)
    setDraggingId(null)
    setDropTarget(null)
  }

  return (
    <div className={cn("flex gap-4 overflow-x-auto pb-4", className)}>
      {columns.map((col) => {
        const colItems = items.filter((it) => it.column === col.id)
        const isDropTarget = dropTarget === col.id
        return (
          <div
            key={col.id}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-[var(--r-xl)] border transition-all duration-150",
              isDropTarget
                ? "border-brand-300 bg-brand-50 shadow-[var(--shadow-brand)]"
                : "border-border bg-[var(--surface-3)]",
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDropTarget(col.id)
            }}
            onDrop={(e) => {
              e.preventDefault()
              handleDrop(col.id)
            }}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
                  {col.label}
                </h3>
              </div>
              <span
                className="grid size-6 place-items-center rounded-[var(--r-pill)] text-[11px] font-bold"
                style={{ color: col.color, backgroundColor: col.softColor }}
              >
                {colItems.length}
              </span>
            </div>
            {columnSummary && (
              <div
                className="mx-3 mb-3 rounded-[var(--r-md)] px-3 py-2"
                style={{ backgroundColor: col.softColor }}
              >
                {columnSummary(colItems, col)}
              </div>
            )}
            <div
              className="flex flex-col gap-2.5 overflow-y-auto px-3 pb-4"
              style={{ maxHeight: maxColumnHeight }}
            >
              {colItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--r-lg)] border-2 border-dashed border-border py-8 text-center">
                  <span className="text-xs text-ink-subtle">{emptyLabel}</span>
                </div>
              ) : (
                colItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDraggingId(item.id)}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setDropTarget(null)
                    }}
                    className={cn(
                      "group relative cursor-grab rounded-[var(--r-lg)] border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-1)] active:scale-[0.97] active:cursor-grabbing",
                      draggingId === item.id && "scale-[0.97] opacity-40",
                    )}
                  >
                    <span className="absolute right-3 top-3 text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100">
                      <GripVertical className="size-4" />
                    </span>
                    {renderItem(item)}
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
