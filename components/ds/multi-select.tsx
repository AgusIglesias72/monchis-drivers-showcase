"use client"

import { useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { type SelectOption } from "./select-field"

export interface MultiSelectProps {
  values: string[]
  onChange: (values: string[]) => void
  options: SelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  id?: string
  className?: string
}

/**
 * Multiselect con búsqueda: checkboxes que acumulan (no cierra al elegir),
 * trigger "N seleccionados" y auto-flip arriba/abajo según espacio.
 */
export function MultiSelect({
  values,
  onChange,
  options,
  placeholder = "Elegí…",
  searchPlaceholder = "Buscar…",
  emptyText = "Sin resultados",
  id,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const [q, setQ] = useState("")
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selectedSet = useMemo(() => new Set(values), [values])
  const filtered = useMemo(
    () =>
      q
        ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
        : options,
    [options, q],
  )

  function toggle() {
    setOpen((o) => {
      const next = !o
      if (next && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setDropUp(window.innerHeight - rect.bottom < 300 && rect.top > 300)
      }
      return next
    })
  }

  function toggleValue(v: string) {
    onChange(
      selectedSet.has(v) ? values.filter((x) => x !== v) : [...values, v],
    )
  }

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-[var(--r-md)] border border-input bg-card px-3 text-left text-sm shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] focus:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
      >
        <span
          className={cn(
            "truncate",
            values.length ? "text-foreground" : "text-ink-subtle",
          )}
        >
          {values.length
            ? `${values.length} seleccionado${values.length === 1 ? "" : "s"}`
            : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar lista"
            onClick={() => {
              setOpen(false)
              setQ("")
            }}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            className={cn(
              "absolute z-50 w-full overflow-hidden rounded-[var(--r-lg)] border border-border bg-popover shadow-[var(--shadow-2)]",
              dropUp ? "bottom-full mb-2" : "top-full mt-2",
            )}
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder}
                className="min-h-[40px] w-full bg-transparent text-sm text-foreground placeholder:text-ink-subtle focus:outline-none"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto p-1.5">
              {filtered.length === 0 && (
                <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {emptyText}
                </li>
              )}
              {filtered.map((o) => {
                const on = selectedSet.has(o.value)
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={on}
                      onClick={() => toggleValue(o.value)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-[var(--r-sm)] px-3 py-2 text-left text-sm transition-colors",
                        on
                          ? "bg-brand-50 font-semibold text-primary"
                          : "font-medium text-foreground hover:bg-[var(--surface-2)]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-4 shrink-0 place-items-center rounded-[4px] border-2",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input",
                        )}
                      >
                        {on && <Check className="size-3" aria-hidden />}
                      </span>
                      {o.icon && (
                        <o.icon className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{o.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
