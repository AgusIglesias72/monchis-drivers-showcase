"use client"

import { cn } from "@/lib/utils"

export interface AddonInputProps {
  value: string
  onChange: (v: string) => void
  /** Addon a la izquierda (ej: "+595", "Gs."). */
  prefix?: React.ReactNode
  /** Addon a la derecha (ej: "km", "/mes"). */
  suffix?: React.ReactNode
  invalid?: boolean
  placeholder?: string
  inputMode?: "numeric" | "decimal" | "text" | "tel"
  id?: string
  /** Valor en fuente mono (montos, códigos). */
  mono?: boolean
  disabled?: boolean
  className?: string
}

/** Input con addon de prefijo/sufijo compartiendo borde y focus ring. */
export function AddonInput({
  value,
  onChange,
  prefix,
  suffix,
  invalid,
  placeholder,
  inputMode,
  id,
  mono,
  disabled,
  className,
}: AddonInputProps) {
  return (
    <div
      className={cn(
        "flex h-9 items-stretch overflow-hidden rounded-[var(--r-md)] border bg-card shadow-[var(--shadow-soft)] transition-[border-color,box-shadow]",
        invalid
          ? "border-destructive ring-[3px] ring-destructive/20"
          : "border-input focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      {prefix != null && (
        <span className="flex items-center gap-1.5 border-r border-border bg-muted px-3 text-xs font-semibold text-muted-foreground">
          {prefix}
        </span>
      )}
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
        className={cn(
          "min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground placeholder:text-ink-subtle focus:outline-none disabled:cursor-not-allowed",
          mono && "font-[family-name:var(--font-mono)]",
        )}
      />
      {suffix != null && (
        <span className="flex min-w-[44px] items-center justify-center gap-1.5 border-l border-border bg-muted px-3 text-xs font-semibold text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  )
}
