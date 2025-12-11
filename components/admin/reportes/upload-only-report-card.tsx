// components/admin/reportes/upload-only-report-card.tsx
"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlayCircle } from 'lucide-react'
import { UploadOnlyModal } from './upload-only-modal'

export function UploadOnlyReportCard() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Card className="w-full hover:shadow-md transition-shadow border-2">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📈</div>
              <div className="space-y-1">
                <h3 className="text-xl font-semibold">
                  Solo Subir Reportes
                </h3>
                <p className="text-sm text-muted-foreground">
                  Procesa y sube reportes de pago sin procesar conductores
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="ml-4 cursor-pointer"
              size="lg"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Ejecutar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-2 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
              <span className="text-muted-foreground">Procesa reportes de pago por rango de fechas</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
              <span className="text-muted-foreground">Sube datos a Google Sheets automáticamente</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
              <span className="text-muted-foreground">Más rápido que el proceso completo</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
              <span className="text-muted-foreground">Notificación por email al finalizar</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <UploadOnlyModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
      />
    </>
  )
}