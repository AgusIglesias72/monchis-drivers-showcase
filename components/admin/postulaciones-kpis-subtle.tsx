// components/admin/postulaciones-kpis-subtle.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  CheckCircle, 
  Clock, 
  XCircle,
} from "lucide-react"
import { motion } from "framer-motion"

interface PostulacionesStats {
  totalPostulaciones: number
  completadas: number
  enProgreso: number
  abandonadas: number
  nuevasUltimos30Dias: number
  tasaCompletado: number
}

export function PostulacionesKPIsSubtle({ stats }: { stats: PostulacionesStats }) {
  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
    }
  }

  const kpiCards = [
    {
      title: "Total Postulaciones",
      subtitle: "Últimos 30 días",
      value: stats.nuevasUltimos30Dias,
      icon: Users,
      iconColor: "text-blue-500",
      glowColor: "rgba(59, 130, 246, 0.04)",
      borderColor: "hover:border-blue-200/50",
    },
    {
      title: "Completadas",
      subtitle: `${stats.tasaCompletado}% del total`,
      value: stats.completadas,
      icon: CheckCircle,
      iconColor: "text-green-500",
      glowColor: "rgba(34, 197, 94, 0.04)",
      borderColor: "hover:border-green-200/50",
    },
    {
      title: "En Progreso",
      subtitle: "Completando formulario",
      value: stats.enProgreso,
      icon: Clock,
      iconColor: "text-amber-500",
      glowColor: "rgba(245, 158, 11, 0.04)",
      borderColor: "hover:border-amber-200/50",
    },
    {
      title: "Abandonadas",
      subtitle: "Requieren seguimiento",
      value: stats.abandonadas,
      icon: XCircle,
      iconColor: "text-red-500",
      glowColor: "rgba(239, 68, 68, 0.04)",
      borderColor: "hover:border-red-200/50",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpiCards.map((card, index) => (
        <motion.div
          key={card.title}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          transition={{
            delay: index * 0.08,
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
          <motion.div
            whileHover={{ 
              y: -2,
              transition: { duration: 0.2 }
            }}
            animate={{
              boxShadow: [
                `0 0 0px ${card.glowColor}`,
                `0 0 15px ${card.glowColor}`,
                `0 0 0px ${card.glowColor}`,
              ]
            }}
            transition={{
              boxShadow: {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.5
              }
            }}
          >
            <Card className={`relative overflow-hidden transition-all duration-300 ${card.borderColor}`}>
              {/* Gradient overlay muy sutil */}
              <div 
                className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${card.glowColor}, transparent 70%)`
                }}
              />
              
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [1, 0.9, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.3
                  }}
                >
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                </motion.div>
              </CardHeader>
              
              <CardContent>
                <motion.div
                  className="text-2xl font-bold"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: index * 0.08 + 0.2,
                    duration: 0.4,
                    ease: "easeOut"
                  }}
                >
                  {card.value.toLocaleString()}
                </motion.div>
                <p className="text-xs text-muted-foreground mt-1">
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