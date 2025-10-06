// components/admin/postulaciones-kpis.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  CheckCircle, 
  Clock, 
  XCircle,
} from "lucide-react"

interface PostulacionesStats {
  totalPostulaciones: number
  completadas: number
  enProgreso: number
  abandonadas: number
  nuevasUltimaSemana: number
  tasaCompletado: number
}

export function PostulacionesKPIs({ stats }: { stats: PostulacionesStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total de Postulaciones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Postulaciones
          </CardTitle>
          <Users className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalPostulaciones}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Todas las postulaciones
          </p>
        </CardContent>
      </Card>

      {/* Completadas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Completadas
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completadas}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.tasaCompletado}% del total
          </p>
        </CardContent>
      </Card>

      {/* En Progreso */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            En Progreso
          </CardTitle>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.enProgreso}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Completando formulario
          </p>
        </CardContent>
      </Card>

      {/* Abandonadas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Abandonadas
          </CardTitle>
          <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.abandonadas}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Requieren seguimiento
          </p>
        </CardContent>
      </Card>
    </div>
  )
}