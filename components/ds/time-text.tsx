import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

function toDate(v: Date | string | number): Date {
  return v instanceof Date ? v : new Date(v)
}

/** Fecha formateada (mono). */
export function DateText({
  value,
  pattern = "dd MMM yyyy",
  className,
}: {
  value: Date | string | number
  pattern?: string
  className?: string
}) {
  const d = toDate(value)
  if (isNaN(d.getTime())) return <span className={className}>—</span>
  return (
    <time
      dateTime={d.toISOString()}
      className={cn("font-[family-name:var(--font-mono)]", className)}
    >
      {format(d, pattern, { locale: es })}
    </time>
  )
}

/** Tiempo relativo ("hace 4 días"). */
export function TimeAgo({
  value,
  className,
}: {
  value: Date | string | number
  className?: string
}) {
  const d = toDate(value)
  if (isNaN(d.getTime())) return <span className={className}>—</span>
  return (
    <time
      dateTime={d.toISOString()}
      className={cn("text-muted-foreground", className)}
    >
      {formatDistanceToNow(d, { addSuffix: true, locale: es })}
    </time>
  )
}
