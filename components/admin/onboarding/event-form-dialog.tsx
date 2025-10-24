// components/admin/onboarding/event-form-dialog.tsx

"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react'
import type { OnboardingEventWithRelations, OnboardingEventStatus } from '@/types/onboarding'

interface EventFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: OnboardingEventWithRelations | null
  onSave: (data: any) => Promise<{ success: boolean; error?: string }>
}

interface FormData {
  scheduledDate: string
  startTime: string
  endTime: string
  location: string
  locationAddress: string
  maxCapacity: string
  status: OnboardingEventStatus
  notes: string
}

// Valores por defecto
const DEFAULT_LOCATION = 'HUB'
const DEFAULT_ADDRESS = 'México 850'
const FULL_ADDRESS = 'Mexico N° 850 e/ F.R. Moreno y Manuel Domínguez, Asunción, Paraguay'

export function EventFormDialog({ open, onOpenChange, event, onSave }: EventFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    scheduledDate: '',
    startTime: '',
    endTime: '',
    location: DEFAULT_LOCATION,
    locationAddress: DEFAULT_ADDRESS,
    maxCapacity: '20',
    status: 'SCHEDULED',
    notes: '',
  })

  // Cargar datos del evento si estamos editando
  useEffect(() => {
    if (!open) return // No hacer nada si el modal está cerrado
    
    if (event) {
      // Convertir la fecha a formato local (sin timezone offset)
      const localDate = new Date(event.scheduledDate)
      const year = localDate.getFullYear()
      const month = String(localDate.getMonth() + 1).padStart(2, '0')
      const day = String(localDate.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`

      setFormData({
        scheduledDate: dateString,
        startTime: event.startTime || '09:00',
        endTime: event.endTime || '12:00',
        location: event.location || DEFAULT_LOCATION,
        locationAddress: event.locationAddress || DEFAULT_ADDRESS,
        maxCapacity: event.maxCapacity?.toString() || '20',
        status: event.status,
        notes: event.notes || '',
      })
    } else {
      // Reset form para nuevo evento con valores por defecto
      setFormData({
        scheduledDate: '',
        startTime: '09:00',
        endTime: '12:00',
        location: DEFAULT_LOCATION,
        locationAddress: DEFAULT_ADDRESS,
        maxCapacity: '20',
        status: 'SCHEDULED',
        notes: '',
      })
    }
  }, [event, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Crear fecha en zona horaria local (sin conversión UTC)
      const [year, month, day] = formData.scheduledDate.split('-').map(Number)
      const localDate = new Date(year, month - 1, day, 12, 0, 0) // Noon para evitar cambios de día

      const dataToSend = {
        scheduledDate: localDate.toISOString(),
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
        location: formData.location || undefined,
        locationAddress: formData.locationAddress || undefined,
        maxCapacity: formData.maxCapacity ? parseInt(formData.maxCapacity) : undefined,
        status: formData.status,
        notes: formData.notes || undefined,
      }

      const result = await onSave(dataToSend)
      
      if (result.success) {
        onOpenChange(false)
      } else {
        alert(result.error || 'Error al guardar evento')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Error al guardar evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {event ? 'Editar Evento' : 'Nuevo Evento de OnBoarding'}
          </DialogTitle>
          <DialogDescription>
            {event 
              ? 'Modifica los detalles del evento de onboarding'
              : 'Crea un nuevo evento para incorporar drivers al equipo'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Estado y Capacidad */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Información General</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">Programado</SelectItem>
                    <SelectItem value="IN_PROGRESS">En Curso</SelectItem>
                    <SelectItem value="COMPLETED">Completado</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    <SelectItem value="POSTPONED">Pospuesto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxCapacity">Capacidad Máxima</Label>
                <Input
                  id="maxCapacity"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.maxCapacity}
                  onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
                  placeholder="20"
                />
              </div>
            </div>
          </div>

          {/* Fecha y Hora */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Fecha y Hora</h3>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Fecha *</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Hora Inicio *
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Hora Fin
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Ubicación</h3>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Lugar</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ej: HUB, Oficina Central"
                />
                <p className="text-xs text-muted-foreground">
                  Por defecto: {DEFAULT_LOCATION}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationAddress">Dirección</Label>
                <Input
                  id="locationAddress"
                  value={formData.locationAddress}
                  onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
                  placeholder="México 850"
                />
                <p className="text-xs text-muted-foreground">
                  {FULL_ADDRESS}
                </p>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notas e Instrucciones</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ej: Traer cédula y licencia original. Vestimenta casual."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {event ? 'Guardar Cambios' : 'Crear Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}