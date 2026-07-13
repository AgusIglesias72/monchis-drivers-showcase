import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowRight, CheckCircle2, FileClock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { StuckDocAlert } from "@/lib/services/dashboard-alerts.service"

import { SeverityBadge } from "./severity-badge"

const DOC_LABELS: Record<string, string> = {
  CEDULA: "Cédula",
  LICENSE_FRONT: "Licencia (frente)",
  LICENSE_BACK: "Licencia (dorso)",
  CRIMINAL_RECORD: "Antecedentes",
  VEHICLE_INSURANCE: "Seguro vehículo",
  VEHICLE_REGISTRATION: "Cédula verde",
  VEHICLE_PHOTO_FRONT: "Foto vehículo (frente)",
  VEHICLE_PHOTO_BACK: "Foto vehículo (atrás)",
  VEHICLE_PHOTO_SIDE: "Foto vehículo (lateral)",
  TAX_COMPLIANCE: "Constancia tributaria",
  PAYMENT_PROOF: "Comprobante de pago",
  SELFIE: "Selfie",
  OTHER: "Otro",
}

function labelFor(docType: string) {
  return DOC_LABELS[docType] ?? docType
}

export function StuckDocsList({ alerts }: { alerts: StuckDocAlert[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Docs trabados</CardTitle>
        <CardDescription>
          Documentos en revisión hace más de 7 días
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y rounded-md border">
            {alerts.map((alert) => (
              <li
                key={`${alert.driverId}-${alert.docType}-${alert.pendingSince}`}
                className="flex items-start gap-3 p-3 hover:bg-muted/40 transition-colors"
              >
                <FileClock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-sm font-medium truncate">
                      {alert.driverName ?? "Postulante sin nombre"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {labelFor(alert.docType)}
                    <span className="mx-1.5">·</span>
                    {alert.daysPending} días pendiente
                    <span className="mx-1.5">·</span>
                    desde{" "}
                    {format(new Date(alert.pendingSince), "d MMM", {
                      locale: es,
                    })}
                  </p>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                >
                  <Link href={`/admin/postulaciones/${alert.driverSlug ?? alert.driverId}`}>
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
        Sin docs trabados
      </p>
      <p className="text-xs text-success mt-1">
        Todos los documentos están al día
      </p>
    </div>
  )
}
