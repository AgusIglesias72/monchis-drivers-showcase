// components/admin/dashboard-kpis.tsx

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  FileWarning, 
  FileText, 
  FileX, 
  UserPlus,
  ArrowRight
} from "lucide-react"

interface DashboardStats {
  manualReviewDocs: number
  pendingDocs: number
  rejectedDocs: number
  newDrivers: number
  approvalRate: number
  processedThisWeek: number
}

export function DashboardKPIs({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Documentos en Revisión Manual - MÁS CRÍTICO */}
      <Link href="/admin/adquisicion/documentos?status=MANUAL_REVIEW">
        <Card className="cursor-pointer hover:border-orange-500 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Revisión Manual
            </CardTitle>
            <FileWarning className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.manualReviewDocs}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                Requieren atención
              </p>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Documentos Pendientes de Procesar */}
      <Link href="/admin/adquisicion/documentos?status=PENDING">
        <Card className="cursor-pointer hover:border-blue-500 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pendientes de Procesar
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDocs}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                Sin validar
              </p>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Documentos Rechazados */}
      <Link href="/admin/adquisicion/documentos?status=REJECTED">
        <Card className="cursor-pointer hover:border-red-500 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Rechazados
            </CardTitle>
            <FileX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejectedDocs}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                Necesitan resubir
              </p>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Postulantes Nuevos */}
      <Link href="/admin/adquisicion/postulantes">
        <Card className="cursor-pointer hover:border-green-500 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Nuevos (7 días)
            </CardTitle>
            <UserPlus className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newDrivers}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                {stats.approvalRate}% aprobación semanal
              </p>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}