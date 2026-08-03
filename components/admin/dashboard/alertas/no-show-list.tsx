import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowRight, CheckCircle2, UserX } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { NoShowAlert } from "@/lib/services/dashboard-alerts.service"

import { SeverityBadge } from "./severity-badge"

export function NoShowList({ alerts }: { alerts: NoShowAlert[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No-shows recientes</CardTitle>
        <CardDescription>
          Postulantes que no asistieron al onboarding (últimos 7 días)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y rounded-md border">
            {alerts.map((alert) => (
              <li
                key={alert.attendeeId}
                className="flex items-start gap-3 p-3 hover:bg-muted/40 transition-colors"
              >
                <UserX className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-sm font-medium truncate">
                      {alert.driverName ?? "Postulante sin nombre"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(alert.eventDate), "d MMM yyyy", {
                      locale: es,
                    })}
                    {alert.zone && (
                      <>
                        <span className="mx-1.5">·</span>
                        {alert.zone}
                      </>
                    )}
                  </p>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                >
                  <Link href="/admin/onboarding">
                    Ver
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-success bg-success-soft p-6 text-center">
      <CheckCircle2 className="h-7 w-7 mx-auto text-success" />
      <p className="mt-2 text-sm font-medium text-success">
        Sin no-shows en este rango
      </p>
      <p className="text-xs text-success mt-1">
        Todos los postulantes citados asistieron
      </p>
    </div>
  )
}
