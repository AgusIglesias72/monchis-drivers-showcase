// components/admin/reportes/process-all-modal.tsx
"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, Calendar, Mail, Settings2 } from 'lucide-react'
import { toast } from "sonner"

interface ProcessAllModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProcessAllModal({ open, onOpenChange }: ProcessAllModalProps) {
  const [loading, setLoading] = useState(false)
  
  const getCurrentWeekDates = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    
    return {
      startDate: formatDate(monday),
      endDate: formatDate(sunday)
    }
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const weekDates = getCurrentWeekDates()

  const [formData, setFormData] = useState({
    startDate: weekDates.startDate,
    endDate: weekDates.endDate,
    processExternalDrivers: true,
    concurrency: '3',
    maxDrivers: '',
    notificationEmails: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload: any = {
        startDate: formData.startDate,
        endDate: formData.endDate,
        processExternalDrivers: formData.processExternalDrivers,
        concurrency: parseInt(formData.concurrency) || 3,
      }

      if (formData.maxDrivers) {
        payload.maxDrivers = parseInt(formData.maxDrivers)
      }

      if (formData.notificationEmails.trim()) {
        payload.notificationEmails = formData.notificationEmails
          .split(',')
          .map(email => email.trim())
          .filter(email => email !== '')
      }

      const response = await fetch('/api/reports/process-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Proceso iniciado", {
          description: "Recibirás un email cuando el proceso finalice.",
        })
        onOpenChange(false)
        setFormData({
          ...formData,
          startDate: weekDates.startDate,
          endDate: weekDates.endDate
        })
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (error: any) {
      toast.error("Error al iniciar el proceso", {
        description: error.message || "Error desconocido",
      })
    } finally {
      setLoading(false)
    }
  }

  const setLastWeek = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    
    const lastMonday = new Date(today)
    lastMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - 7)
    
    const lastSunday = new Date(lastMonday)
    lastSunday.setDate(lastMonday.getDate() + 6)
    
    setFormData({
      ...formData,
      startDate: formatDate(lastMonday),
      endDate: formatDate(lastSunday)
    })
  }

  const setThisWeek = () => {
    setFormData({
      ...formData,
      startDate: weekDates.startDate,
      endDate: weekDates.endDate
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>📊 Procesar Todo</DialogTitle>
          <DialogDescription>
            Configure los parámetros del proceso. Recibirá un email al finalizar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fechas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Rango de Fechas</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-xs">Fecha Inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-xs">Fecha Fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setThisWeek}
                className="text-xs cursor-pointer"
              >
                Esta Semana
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setLastWeek}
                className="text-xs cursor-pointer"
              >
                Semana Pasada
              </Button>
            </div>
          </div>

          {/* Conductores Externos */}
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="processDrivers" className="text-sm font-medium cursor-pointer">
                Procesar Conductores Externos
              </Label>
              <p className="text-xs text-muted-foreground">
                Incluir procesamiento de conductores externos
              </p>
            </div>
            <Switch
              id="processDrivers"
              checked={formData.processExternalDrivers}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, processExternalDrivers: checked })
              }
            />
          </div>

          {/* Opciones Avanzadas */}
          {formData.processExternalDrivers && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Opciones Avanzadas</Label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="concurrency" className="text-xs">
                    Concurrencia
                  </Label>
                  <Input
                    id="concurrency"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.concurrency}
                    onChange={(e) => setFormData({ ...formData, concurrency: e.target.value })}
                    placeholder="3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Procesos paralelos (1-10)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxDrivers" className="text-xs">
                    Máx. Conductores
                  </Label>
                  <Input
                    id="maxDrivers"
                    type="number"
                    min="1"
                    value={formData.maxDrivers}
                    onChange={(e) => setFormData({ ...formData, maxDrivers: e.target.value })}
                    placeholder="Sin límite"
                  />
                  <p className="text-xs text-muted-foreground">
                    Opcional
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Emails Adicionales */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="emails" className="text-sm font-medium">
                Emails Adicionales (opcional)
              </Label>
            </div>
            <Input
              id="emails"
              type="text"
              value={formData.notificationEmails}
              onChange={(e) => setFormData({ ...formData, notificationEmails: e.target.value })}
              placeholder="email1@example.com, email2@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Separar múltiples emails con comas
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="cursor-pointer">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                'Iniciar Proceso'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}