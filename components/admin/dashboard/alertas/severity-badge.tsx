import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AlertSeverity } from "@/lib/services/dashboard-alerts.service"

const LABELS: Record<AlertSeverity, string> = {
  info: "Info",
  warning: "Atención",
  critical: "Crítico",
}

export function SeverityBadge({
  severity,
  className,
}: {
  severity: AlertSeverity
  className?: string
}) {
  if (severity === "critical") {
    return (
      <Badge variant="destructive" className={className}>
        {LABELS.critical}
      </Badge>
    )
  }
  if (severity === "warning") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-warning text-warning bg-warning-soft",
          className,
        )}
      >
        {LABELS.warning}
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className={className}>
      {LABELS.info}
    </Badge>
  )
}
