import Link from "next/link"
import { ArrowUpRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface InfoTileProps {
  icon?: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  href?: string
  onClick?: () => void
  className?: string
}

/** Tarjeta ícono + título + descripción (para grids de navegación / features). */
export function InfoTile({
  icon: Icon,
  title,
  description,
  href,
  onClick,
  className,
}: InfoTileProps) {
  const inner = (
    <div
      className={cn(
        "group flex h-full items-start gap-4 rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-[box-shadow,border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-1)]",
        className,
      )}
    >
      {Icon && (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-brand-soft text-primary">
          <Icon className="size-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold tracking-[var(--ls-tight)]">
            {title}
          </h3>
          {href && (
            <ArrowUpRight className="size-4 text-ink-subtle transition-colors group-hover:text-primary" />
          )}
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )

  if (href) return <Link href={href}>{inner}</Link>
  if (onClick)
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {inner}
      </button>
    )
  return inner
}
