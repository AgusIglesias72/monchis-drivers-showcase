// components/admin/postulaciones-kpis.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  CheckCircle, 
  Clock, 
  XCircle,
  GraduationCap,
} from "lucide-react"
import { motion } from "framer-motion"

interface PostulacionesStats {
  totalPostulaciones: number
  completadas: number
  enProgreso: number
  abandonadas: number
  nuevasUltimos30Dias: number
  tasaCompletado: number
  capacitados: number
  rechazados: number
}

export function PostulacionesKPIs({ stats }: { stats: PostulacionesStats }) {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
    }
  }

  const glowAnimation = {
    animate: {
      boxShadow: [
        "0 0 8px rgba(59, 130, 246, 0.1)",
        "0 0 12px rgba(59, 130, 246, 0.15)",
        "0 0 8px rgba(59, 130, 246, 0.1)",
      ]
    },
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }

  const kpiCards = [
    {
      title: "Total Postulaciones",
      subtitle: `${stats.completadas} completadas`,
      value: stats.totalPostulaciones,
      icon: Users,
      iconColor: "text-blue-500",
      glowColor: "rgba(59, 130, 246, 0.1)",
    },
    {
      title: "Capacitados",
      subtitle: "Onboarding completado",
      value: stats.capacitados,
      icon: GraduationCap,
      iconColor: "text-green-500",
      glowColor: "rgba(34, 197, 94, 0.1)",
    },
    {
      title: "En Progreso",
      subtitle: "Completando formulario",
      value: stats.enProgreso,
      icon: Clock,
      iconColor: "text-amber-500",
      glowColor: "rgba(245, 158, 11, 0.1)",
    },
    {
      title: "Rechazados",
      subtitle: "Requieren revisión",
      value: stats.rechazados,
      icon: XCircle,
      iconColor: "text-red-500",
      glowColor: "rgba(239, 68, 68, 0.1)",
    },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {kpiCards.map((card, index) => (
        <motion.div
          key={card.title}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          transition={{
            delay: index * 0.1,
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
          <motion.div
            animate={{
              boxShadow: [
                `0 0 8px ${card.glowColor}`,
                `0 0 12px ${card.glowColor}`,
                `0 0 8px ${card.glowColor}`,
              ]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.3
            }}
          >
            <Card className="relative overflow-hidden">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-background/5 pointer-events-none" />
              
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
                <CardTitle className="text-xs font-medium">
                  {card.title}
                </CardTitle>
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.2
                  }}
                >
                  <card.icon className={`h-3.5 w-3.5 ${card.iconColor}`} />
                </motion.div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <motion.div
                  className="text-xl font-bold"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: index * 0.1 + 0.3,
                    duration: 0.5,
                    type: "spring",
                    stiffness: 200
                  }}
                >
                  {card.value?.toLocaleString() || '0'}
                </motion.div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {card.subtitle}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      ))}
    </div>
  )
}