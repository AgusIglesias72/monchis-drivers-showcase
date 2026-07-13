import { cn } from "@/lib/utils"
import { CopyButton } from "./copy-button"

export interface CopyFieldProps {
  value: string
  label?: React.ReactNode
  mono?: boolean
  className?: string
}

/** Caja read-only para mostrar un ID/token/link con botón de copiar. */
export function CopyField({ value, label, mono = true, className }: CopyFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
          {label}
        </div>
      )}
      <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-border bg-surface-3 py-1 pl-3 pr-1">
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm",
            mono && "font-[family-name:var(--font-mono)]",
          )}
        >
          {value}
        </span>
        <CopyButton value={value} />
      </div>
    </div>
  )
}
