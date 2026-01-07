// components/admin/dashboard-kpis-improved.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  CheckCircle,
  Calendar,
  UserCheck,
  TrendingUp,
  TrendingDown,
  UserX,
  Clock,
} from "lucide-react"
import { motion } from "framer-motion"

interface DashboardKpisImprovedProps {
  postulacionesStats: {
    totalPostulaciones: number
    completadas: number
    enProgreso: number
    abandonadas: number
    tasaCompletado: number
  }
  onboardingStats: {
    upcomingEvents: number
    pendingDrivers: number
    inProgressDrivers: number
    completedThisMonth: number
    noShowsThisMonth: number
    attendanceRate: number
    pendingAttendance: number
  }
  asistenciasProgramadasVsRealizadas: {
    totalProgramadas: number
    asistieron: number
    noAsistieron: number
    tasaPresentismo: number
    pendientes: number
  }
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export function DashboardKpisImproved({
  postulacionesStats,
  onboardingStats,
  asistenciasProgramadasVsRealizadas,
}: DashboardKpisImprovedProps) {
  const kpis = [
    {
      title: "Total Postulaciones",
      value: postulacionesStats.totalPostulaciones,
      icon: Users,
      description: `${postulacionesStats.completadas} completadas`,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: "Tasa de Completado",
      value: `${postulacionesStats.tasaCompletado}%`,
      icon: TrendingUp,
      description: `${postulacionesStats.enProgreso} en progreso`,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20",
    },
    {
      title: "Eventos Próximos",
      value: onboardingStats.upcomingEvents,
      icon: Calendar,
      description: `${onboardingStats.pendingAttendance} asistencias pendientes`,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
    },
    {
      title: "Pendientes de Agendar",
      value: onboardingStats.pendingDrivers,
      icon: Clock,
      description: `${onboardingStats.inProgressDrivers} en proceso`,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
    },
  ]

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
    >
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon
        return (
          <motion.div key={index} variants={item}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
                <CardTitle className="text-xs font-medium">
                  {kpi.title}
                </CardTitle>
                <div className={`${kpi.bgColor} p-1.5 rounded-md`}>
                  <Icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className={`text-xl font-bold ${kpi.color}`}>
                  {kpi.value}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {kpi.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
