"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PillTabItem {
  value: string
  label: React.ReactNode
  icon?: LucideIcon
  count?: number
}

export interface PillTabsProps {
  value: string
  onChange: (value: string) => void
  tabs: PillTabItem[]
  size?: "sm" | "md"
  className?: string
  "aria-label"?: string
}

/**
 * Barra de pestañas en pastillas STUDIO (sin track): activo = `bg-brand-soft
 * text-primary`. NUNCA negro. Badge de conteo opcional.
 */
export function PillTabs({
  value,
  onChange,
  tabs,
  size = "md",
  className,
  ...aria
}: PillTabsProps) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex flex-wrap items-center gap-1", className)}
      {...aria}
    >
      {tabs.map((tab) => {
        const active = value === tab.value
        const Icon = tab.icon
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/30",
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
              active
                ? "bg-brand-soft text-primary shadow-[var(--shadow-soft)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "inline-flex min-w-4 items-center justify-center rounded-full px-1 font-[family-name:var(--font-mono)] text-[10px] leading-none",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export interface LineTabsProps {
  value: string
  onChange: (value: string) => void
  tabs: PillTabItem[]
  className?: string
  "aria-label"?: string
}

/**
 * Variante subrayada STUDIO: activo = subrayado brand + `text-foreground`.
 */
export function LineTabs({
  value,
  onChange,
  tabs,
  className,
  ...aria
}: LineTabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex flex-wrap items-center gap-4 border-b border-border",
        className,
      )}
      {...aria}
    >
      {tabs.map((tab) => {
        const active = value === tab.value
        const Icon = tab.icon
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-0.5 pb-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/30",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="size-4" />}
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "inline-flex min-w-4 items-center justify-center rounded-full px-1 font-[family-name:var(--font-mono)] text-[10px] leading-none",
                  active
                    ? "bg-brand-soft text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
