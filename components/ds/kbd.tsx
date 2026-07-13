import { cn } from "@/lib/utils"

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-muted px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      {children}
    </kbd>
  )
}

/** Combinación de teclas unidas con "+", ej. <KbdGroup keys={["⌘","K"]} />. */
export function KbdGroup({
  keys,
  className,
}: {
  keys: React.ReactNode[]
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {keys.map((k, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-[10px] text-ink-subtle">+</span>}
          <Kbd>{k}</Kbd>
        </span>
      ))}
    </span>
  )
}
