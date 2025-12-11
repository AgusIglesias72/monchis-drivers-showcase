// app/admin/reportes/components/ProcessAllReportCard.tsx
"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlayCircle, Loader2 } from 'lucide-react'
import { ProcessAllModal } from './ProcessAllModal'

export function ProcessAllReportCard() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Card className="w-full hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">
                📊 Procesar Todo (Reportes + Conductores)
              </CardTitle>
              <CardDescription className="text-sm">
                Procesa y sube reportes de pago, luego procesa conductores externos
              </CardDescription>
            </div>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="ml-4"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Ejecutar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span>Procesa reportes de pago por rango de fechas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span>Sube datos a Google Sheets</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span>Procesa conductores externos (opcional)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Envía notificación por email al finalizar</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProcessAllModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
      />
    </>
  )
}