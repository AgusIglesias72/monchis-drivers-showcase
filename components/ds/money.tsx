import { cn } from "@/lib/utils"

export interface MoneyProps {
  value: number
  currency?: string
  className?: string
}

/** Monto en formato local (Gs 145.000), en mono tabular. */
export function Money({ value, currency = "Gs", className }: MoneyProps) {
  const formatted = new Intl.NumberFormat("es-PY", {
    maximumFractionDigits: 0,
  }).format(value)
  return (
    <span
      className={cn(
        "font-[family-name:var(--font-mono)] tabular-nums",
        className,
      )}
    >
      {currency} {formatted}
    </span>
  )
}
