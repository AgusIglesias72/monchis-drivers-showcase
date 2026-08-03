import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type KpiTone = "neutral" | "brand" | "success" | "warning" | "info" | "danger"

const SURFACE: Record<KpiTone, string> = {
  neutral: "border-border bg-card",
  brand: "border-brand-300/50 bg-brand-soft",
  success: "border-success/40 bg-success-soft",
  warning: "border-warning/40 bg-warning-soft",
  info: "border-info/40 bg-info-soft",
  danger: "border-destructive/40 bg-danger-soft",
}

const VALUE_TONE: Record<KpiTone, string> = {
  neutral: "text-foreground",
  brand: "text-primary",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  danger: "text-destructive",
}

export interface KpiCardProps {
  label: React.ReactNode
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: LucideIcon
  tone?: KpiTone
  className?: string
}

/** Tarjeta de métrica: label + número grande (mono) + sub opcional. */
export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border p-3 shadow-[var(--shadow-soft)]",
        SURFACE[tone],
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
        {Icon && <Icon className="size-3" />}
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 font-[family-name:var(--font-display)] text-2xl font-bold",
          VALUE_TONE[tone],
        )}
      >
        {value}
      </div>
      {sub && (
        <div className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground">
          {sub}
        </div>
      )}
    </div>
  )
}
