// app/admin/reportes/components/ExternalDriversReportCard.tsx
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  FileText, 
  Calendar,
  Settings,
  Play,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import { ProcessingMonitor } from './jobs/ProcessingMonitor'

interface ExternalDriversReportCardProps {
  onJobStart?: () => void
}

export function ExternalDriversReportCard({ onJobStart }: ExternalDriversReportCardProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [concurrency, setConcurrency] = useState('3')
  const [isStarting, setIsStarting] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [monitorOpen, setMonitorOpen] = useState(false)

  // Helper para obtener el lunes de la semana actual
  const getCurrentMonday = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Ajustar cuando es domingo
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  // Helper para obtener el domingo de la semana actual
  const getCurrentSunday = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? 0 : 7)
    const sunday = new Date(today.setDate(diff))
    return sunday.toISOString().split('T')[0]
  }

  // Autocompletar con la semana actual
  useEffect(() => {
    if (!startDate) setStartDate(getCurrentMonday())
    if (!endDate) setEndDate(getCurrentSunday())
  }, [])

  const handleStartProcess = async () => {
    // Validaciones
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
          concurrency: parseInt(concurrency),
          maxDrivers: null, // Procesar todos
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al iniciar el proceso')
      }

      setJobId(data.jobId)
      setMonitorOpen(true)
      
      toast.success('Proceso iniciado exitosamente')
      onJobStart?.()

    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Error al iniciar el proceso')
    } finally {
      setIsStarting(false)
    }
  }

  const handleSetCurrentWeek = () => {
    setStartDate(getCurrentMonday())
    setEndDate(getCurrentSunday())
    toast.success('Fechas configuradas para la semana actual')
  }

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-primary" />
                Pagos Conductores Externos
              </CardTitle>
              <CardDescription>
                Procesa y descarga automáticamente los PDFs de pago de conductores externos (JS y M&G)
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Configuración de Fechas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Período a Procesar
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetCurrentWeek}
                className="text-xs"
              >
                Semana Actual
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-xs text-muted-foreground">
                  Fecha Inicio (Lunes)
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-xs text-muted-foreground">
                  Fecha Fin (Domingo)
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Configuración Avanzada */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración Avanzada
            </Label>

            <div className="space-y-2">
              <Label htmlFor="concurrency" className="text-xs text-muted-foreground">
                Navegadores en Paralelo
              </Label>
              <Select value={concurrency} onValueChange={setConcurrency}>
                <SelectTrigger id="concurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 navegador (más lento, más estable)</SelectItem>
                  <SelectItem value="2">2 navegadores</SelectItem>
                  <SelectItem value="3">3 navegadores (recomendado)</SelectItem>
                  <SelectItem value="4">4 navegadores</SelectItem>
                  <SelectItem value="5">5 navegadores (más rápido)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Información */}
          <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
            <p className="font-medium">📋 Este proceso:</p>
            <ul className="space-y-1 text-muted-foreground ml-4">
              <li>• Lee conductores desde Google Sheets</li>
              <li>• Descarga PDFs de pagos automáticamente</li>
              <li>• Organiza en carpetas JS/M&G por semana</li>
              <li>• Sube a Google Drive automáticamente</li>
            </ul>
          </div>

          {/* Botón de Acción */}
          <Button
            onClick={handleStartProcess}
            disabled={isStarting || !startDate || !endDate}
            className="w-full h-12 text-base"
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

      {/* Monitor de Progreso */}
      {jobId && (
        <ProcessingMonitor
          open={monitorOpen}
          onOpenChange={setMonitorOpen}
          jobId={jobId}
          jobType="Conductores Externos"
          onJobComplete={() => {
            onJobStart?.()
          }}
        />
      )}
    </>
  )
}