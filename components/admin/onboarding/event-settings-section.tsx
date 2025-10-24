// components/admin/onboarding/event-settings-section.tsx

"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Save, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react'
import { updateOnboardingEvent } from '@/lib/actions/onboarding.actions'
import { toast } from 'sonner'

interface EventSettingsSectionProps {
  event: any
  onUpdate: () => void
}

// Valores por defecto (mismos que el dialog)
const DEFAULT_LOCATION = 'HUB'
const DEFAULT_ADDRESS = 'México 850'
const FULL_ADDRESS = 'Mexico N° 850 e/ F.R. Moreno y Manuel Domínguez, Asunción, Paraguay'

export function EventSettingsSection({ event, onUpdate }: EventSettingsSectionProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: event.title || '',
    organizer: event.organizer || '',
    description: event.description || '',
    scheduledDate: event.scheduledDate.split('T')[0],
    startTime: event.startTime || '09:00',
    endTime: event.endTime || '12:00',
    location: event.location || DEFAULT_LOCATION,
    locationAddress: event.locationAddress || DEFAULT_ADDRESS,
    meetingLink: event.meetingLink || '',
    maxCapacity: event.maxCapacity || '20',
    status: event.status,
    notes: event.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await updateOnboardingEvent(event.id, {
      ...formData,
      maxCapacity: formData.maxCapacity ? parseInt(formData.maxCapacity) : undefined,
    })

    if (result.success) {
      toast.success('Evento actualizado correctamente')
      onUpdate()
    } else {
      toast.error(result.error || 'Error al actualizar el evento')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información General */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
          <CardDescription>
            Datos básicos del evento de onboarding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título del Evento</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={loading}
                placeholder="Ej: OnBoarding Octubre - Zona Norte"
              />
              <p className="text-xs text-muted-foreground">
                Opcional - Si no se especifica, se generará automáticamente
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizer">Organizador *</Label>
              <Input
                id="organizer"
                value={formData.organizer}
                onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                disabled={loading}
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              disabled={loading}
              placeholder="Descripción breve del evento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Borrador</SelectItem>
                <SelectItem value="SCHEDULED">Programado</SelectItem>
                <SelectItem value="IN_PROGRESS">En Curso</SelectItem>
                <SelectItem value="COMPLETED">Completado</SelectItem>
                <SelectItem value="CANCELLED">Cancelado</SelectItem>
                <SelectItem value="POSTPONED">Pospuesto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Fecha y Hora */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Fecha y Hora</CardTitle>
              <CardDescription>
                Define cuándo se realizará el evento
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Fecha *</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ubicación */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Ubicación</CardTitle>
              <CardDescription>
                Define dónde se realizará el evento
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Lugar</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ej: HUB, Oficina Central"
                disabled={loading}
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
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {FULL_ADDRESS}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meetingLink">Link de Reunión Virtual (opcional)</Label>
            <Input
              id="meetingLink"
              type="url"
              value={formData.meetingLink}
              onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Capacidad y Notas */}
      <Card>
        <CardHeader>
          <CardTitle>Capacidad y Notas</CardTitle>
          <CardDescription>
            Configuración adicional del evento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Número máximo de drivers que pueden asistir al evento
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas e Instrucciones</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Ej: Traer cédula y licencia original. Vestimenta casual."
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botón de guardar */}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading} size="lg">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Guardar Cambios
        </Button>
      </div>
    </form>
  )
}