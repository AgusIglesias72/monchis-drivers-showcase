// components/admin/onboarding-kpis.tsx

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Calendar,
  UserCheck,
  Clock,
  TrendingUp,
  ArrowRight,
} from "lucide-react"

interface OnboardingStats {
  upcomingEvents: number
  pendingDrivers: number
  inProgressDrivers: number
  completedThisMonth: number
  noShowsThisMonth: number
  attendanceRate: number
}

export function OnboardingKPIs({ stats }: { stats: OnboardingStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Eventos Próximos */}
      <Link href="/admin/onboarding">
        <Card className="cursor-pointer hover:border-info transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Eventos Próximos
            </CardTitle>
            <Calendar className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                Agendados
              </p>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Drivers Pendientes */}
      <Link href="/admin/onboarding/drivers">
        <Card className="cursor-pointer hover:border-warning transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pendientes de Agendar
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDrivers}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                Listos para onboarding
              </p>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* En Proceso */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            En Proceso
          </CardTitle>
          <UserCheck className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.inProgressDrivers}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Agendados o en curso
          </p>
        </CardContent>
      </Card>

      {/* Tasa de Asistencia */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Tasa de Asistencia
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.completedThisMonth} asistieron este mes
          </p>
        </CardContent>
      </Card>
    </div>
  )
}