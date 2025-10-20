// components/admin/schedule-onboarding-modal.tsx

"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Calendar, MapPin, Clock, Users, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ScheduleOnboardingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  driverId: string
  driverName: string
  onSuccess: () => void
}

export function ScheduleOnboardingModal({
  open,
  onOpenChange,
  driverId,
  driverName,
  onSuccess,
}: ScheduleOnboardingModalProps) {
  const [events, setEvents] = useState<any[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingEvents, setIsFetchingEvents] = useState(false)

  useEffect(() => {
    if (open) {
      fetchAvailableEvents()
      setSelectedEventId('')
      setNotes('')
    }
  }, [open])

  const fetchAvailableEvents = async () => {
    setIsFetchingEvents(true)
    try {
      const response = await fetch('/api/onboarding/events?upcoming=true')
      if (!response.ok) throw new Error('Error al cargar eventos')
      const data = await response.json()
      
      const availableEvents = Array.isArray(data) ? data.filter((event: any) => {
        const hasCapacity = !event.maxCapacity || (event.availableSlots && event.availableSlots > 0)
        const isSchedulable = ['SCHEDULED', 'IN_PROGRESS'].includes(event.status)
        return hasCapacity && isSchedulable
      }) : []
      
      setEvents(availableEvents)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar eventos disponibles')
    } finally {
      setIsFetchingEvents(false)
    }
  }

  const handleSchedule = async () => {
    if (!selectedEventId) {
      toast.error('Selecciona un evento de onboarding')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/onboarding/attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          formDriverIds: [driverId],
          attendeeNotes: notes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al agendar onboarding')
      }

      toast.success('Onboarding agendado exitosamente')
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Error al agendar onboarding')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    return `${day}/${month}`
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'p.m.' : 'a.m.'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Agendar Onboarding</DialogTitle>
          <DialogDescription>
            Asigna a <span className="font-semibold text-foreground">{driverName}</span> a un evento de capacitación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tabla de eventos */}
          <div className="space-y-2">
            <Label>Selecciona un evento</Label>
            
            {isFetchingEvents ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-muted/50">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  No hay eventos disponibles
                </p>
                <p className="text-xs text-muted-foreground">
                  Crea uno primero en la sección de Onboarding
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-xs font-medium text-muted-foreground">
                      <th className="text-left p-3 w-12"></th>
                      <th className="text-left p-3">Fecha</th>
                      <th className="text-left p-3">Hora</th>
                      <th className="text-left p-3">Ubicación</th>
                      <th className="text-right p-3">Cupos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => {
                      const isSelected = selectedEventId === event.id
                      const occupiedSlots = event.currentCapacity || 0
                      const totalSlots = event.maxCapacity || '∞'
                      
                      return (
                        <tr
                          key={event.id}
                          onClick={() => setSelectedEventId(event.id)}
                          className={cn(
                            "cursor-pointer transition-colors border-b last:border-b-0",
                            isSelected 
                              ? "bg-primary/5 hover:bg-primary/10" 
                              : "hover:bg-muted/50"
                          )}
                        >
                          <td className="p-3">
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                              isSelected 
                                ? "border-primary bg-primary" 
                                : "border-muted-foreground/30"
                            )}>
                              {isSelected && (
                                <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{formatDate(event.scheduledDate)}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{formatTime(event.startTime)}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            {event.location ? (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate max-w-[200px]">{event.location}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Sin ubicación</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {occupiedSlots} / {totalSlots}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notas opcionales */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Driver de la zona norte, necesita uniformes talle L"
              rows={3}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSchedule} 
            disabled={!selectedEventId || isLoading || events.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Agendando...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Agendar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}