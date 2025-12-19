// app/admin/reportes/components/jobs/ProcessWeekButton.tsx
"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { ProcessingMonitor } from './ProcessingMonitor'

interface ProcessWeekButtonProps {
  onJobCreated?: (jobId: string) => void
  disabled?: boolean
  processedWeeks?: Array<{ startDate: string; endDate: string }> // Para validar semanas ya procesadas
}

export function ProcessWeekButton({ 
  onJobCreated, 
  disabled = false,
  processedWeeks = [],
}: ProcessWeekButtonProps) {
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  // Estado para el monitor
  const [monitorOpen, setMonitorOpen] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)

  const validateDates = () => {
    setError('')

    if (!startDate || !endDate) {
      setError('Ambas fechas son requeridas')
      return false
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start > end) {
      setError('La fecha de inicio no puede ser posterior a la fecha final')
      return false
    }

    // Validar que no sea más de 7 días
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays > 7) {
      setError('El rango no puede ser mayor a 7 días')
      return false
    }

    // Validar que no esté ya procesada
    const isAlreadyProcessed = processedWeeks.some(week => 
      week.startDate === startDate && week.endDate === endDate
    )

    if (isAlreadyProcessed) {
      setError('Esta semana ya fue procesada anteriormente')
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateDates()) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/jobs/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'DRIVER_PROCESSING',
          metadata: {
            startDate,
            endDate,
            weekName: `Semana ${startDate} al ${endDate}`,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear el job')
      }

      const data = await response.json()
      
      toast.success('Proceso iniciado correctamente')
      
      // Cerrar el modal de fechas
      setOpen(false)
      
      // Abrir el monitor con el jobId
      setCurrentJobId(data.jobId)
      setMonitorOpen(true)
      
      // Reset form
      setStartDate('')
      setEndDate('')
      setError('')
      
      // Callback si existe
      onJobCreated?.(data.jobId)

    } catch (err) {
      console.error('Error al iniciar proceso:', err)
      toast.error(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMonitorClose = () => {
    setMonitorOpen(false)
    setCurrentJobId(null)
  }

  // Sugerir semana actual (lunes a domingo)
  const suggestCurrentWeek = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    setStartDate(monday.toISOString().split('T')[0])
    setEndDate(sunday.toISOString().split('T')[0])
  }

  return (
    <>
      <Button 
        onClick={() => setOpen(true)} 
        disabled={disabled}
        className="gap-2"
      >
        <Calendar className="h-4 w-4" />
        Procesar Semana
      </Button>

      {/* Modal de Selección de Fechas */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Procesar Conductores Externos</DialogTitle>
            <DialogDescription>
              Selecciona el rango de fechas de la semana a procesar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={suggestCurrentWeek}
              disabled={isSubmitting}
              className="w-full"
            >
              Usar Semana Actual
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !startDate || !endDate}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                'Iniciar Proceso'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Monitor de Procesamiento */}
      {currentJobId && (
        <ProcessingMonitor
          open={monitorOpen}
          onOpenChange={handleMonitorClose}
          jobId={currentJobId}
          jobType="DRIVER_PROCESSING"
          onJobComplete={() => {
            // Job completado - la tabla de historial se actualiza automáticamente
          }}
        />
      )}
    </>
  )
}