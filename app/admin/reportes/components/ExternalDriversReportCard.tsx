// app/admin/reportes/components/ExternalDriversReportCard.tsx
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  FileText, 
  Calendar,
  Settings,
  Play,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

interface ExternalDriversReportCardProps {
  onJobStart?: (jobId: string) => void
}

export function ExternalDriversReportCard({ onJobStart }: ExternalDriversReportCardProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isStarting, setIsStarting] = useState(false)

  // Helper para obtener el lunes de la semana PASADA
  const getLastMonday = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) - 7 // -7 días para semana pasada
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  // Helper para obtener el domingo de la semana PASADA
  const getLastSunday = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? 0 : 7) - 7 // -7 días para semana pasada
    const sunday = new Date(today.setDate(diff))
    return sunday.toISOString().split('T')[0]
  }

  // Autocompletar con la semana pasada
  useEffect(() => {
    if (!startDate) setStartDate(getLastMonday())
    if (!endDate) setEndDate(getLastSunday())
  }, [startDate, endDate])

  const handleStartProcess = async () => {
    if (!startDate || !endDate) {
      toast.error('Debe seleccionar ambas fechas')
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start > end) {
      toast.error('La fecha de inicio debe ser anterior a la fecha de fin')
      return
    }

    setIsStarting(true)

    try {
      const response = await fetch('/api/reports/external-drivers/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          concurrency: 3, // Fijo en 3 navegadores
          maxDrivers: null,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al iniciar el proceso')
      }
      
      toast.success('Proceso iniciado exitosamente')
      
      // Llamar callback con el jobId
      if (onJobStart) {
        onJobStart(data.jobId)
      }

    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Error al iniciar el proceso')
    } finally {
      setIsStarting(false)
    }
  }

  const handleSetCurrentWeek = () => {
    setStartDate(getLastMonday())
    setEndDate(getLastSunday())
    toast.success('Fechas configuradas para la semana pasada')
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  Pagos Conductores Externos
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Procesa y descarga automáticamente los PDFs de pago de conductores externos (JS y M&G)
                </CardDescription>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Integración con Google - COMPRIMIDO */}
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-info-soft to-success-soft border">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border shadow-sm">
              {/* Ícono correcto de Google Sheets */}
              <svg className="h-4 w-4" viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 0C4.5 0 0 4.5 0 10v68c0 5.5 4.5 10 10 10h44c5.5 0 10-4.5 10-10V26L42 0H10z" fill="#0F9D58"/>
                <path d="M56 26h-14V0l14 14v12z" fill="#87CEAC"/>
                <path d="M8 48v24c0 2.2 1.8 4 4 4h40c2.2 0 4-1.8 4-4V48H8z" fill="#F1F1F1"/>
                <path d="M12 52h40v4H12zm0 8h40v4H12zm0 8h40v4H12z" fill="#0F9D58"/>
              </svg>
              <span className="text-xs font-medium">Google Sheets</span>
            </div>
            <span className="text-muted-foreground text-sm">→</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border shadow-sm">
              <svg className="h-4 w-4" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
              <span className="text-xs font-medium">Google Drive</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            Automatización completa
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Columna 1: Configuración de Fechas - COMPRIMIDO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Período a Procesar
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetCurrentWeek}
                className="text-xs h-7"
              >
                Semana Pasada
              </Button>
            </div>

            <div className="flex gap-3">
              <div className="space-y-1.5 flex-1">
                <Label htmlFor="startDate" className="text-xs text-muted-foreground">
                  Fecha Inicio (Lunes)
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5 flex-1">
                <Label htmlFor="endDate" className="text-xs text-muted-foreground">
                  Fecha Fin (Domingo)
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Columna 2: Configuración Avanzada - COMPRIMIDO */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Configuración del Proceso
            </Label>

            <div className="space-y-2.5">
              {/* Información del proceso - COMPRIMIDO */}
              <div className="rounded-lg bg-muted/50 p-2.5 space-y-1.5 text-xs border">
                <p className="font-medium flex items-center gap-1.5">
                  <span className="text-sm">📋</span>
                  Este proceso:
                </p>
                <ul className="space-y-0.5 text-muted-foreground ml-5">
                  <li>• Lee conductores desde Google Sheets</li>
                  <li>• Descarga PDFs automáticamente</li>
                  <li>• Organiza en carpetas JS/M&G</li>
                  <li>• Sube a Google Drive</li>
                </ul>
              </div>

             
            </div>
          </div>
        </div>

        {/* Botón de Acción - COMPRIMIDO */}
        <Button
          onClick={handleStartProcess}
          disabled={isStarting || !startDate || !endDate}
          className="w-full h-11 text-base"
          size="lg"
        >
          {isStarting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Iniciando Proceso...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Iniciar Procesamiento
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}