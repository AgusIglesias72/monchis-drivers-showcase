// components/admin/schedule-onboarding-modal-client.tsx
"use client"

import { useState, useTransition } from 'react'
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
import { Loader2, Calendar, MapPin, Clock, Users, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { assignDriverToOnboardingEvent } from "@/lib/actions/onboarding.actions"

interface Event {
  id: string
  title: string | null
  scheduledDate: Date
  startTime: string
  endTime: string | null
  location: string | null
  maxCapacity: number | null
  currentCapacity: number
  availableSlots: number | null
  hasCapacity: boolean
}

interface ScheduleOnboardingModalClientProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  driverId: string
  driverName: string
  events: Event[]
  onSuccess: () => void
}

export function ScheduleOnboardingModalClient({
  open,
  onOpenChange,
  driverId,
  driverName,
  events,
  onSuccess,
}: ScheduleOnboardingModalClientProps) {
  const [selectedEventId, setSelectedEventId] = useState('')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  // Resetear al abrir/cerrar
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedEventId('')
      setNotes('')
    }
    onOpenChange(newOpen)
  }

  const handleSchedule = () => {
    if (!selectedEventId) {
      toast.error('Selecciona un evento de onboarding')
      return
    }

    startTransition(async () => {
      const result = await assignDriverToOnboardingEvent({
        eventId: selectedEventId,
        driverId,
        notes: notes.trim() || undefined
      })

      if (result.success) {
        toast.success(result.message || 'Onboarding agendado exitosamente')
        onSuccess()
        handleOpenChange(false)
      } else {
        toast.error(result.error || 'Error al agendar onboarding')
      }
    })
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (time: string, endTime?: string | null) => {
    const format = (t: string) => {
      const [hours, minutes] = t.split(':')
      return `${hours}:${minutes}`
    }
    
    if (endTime) {
      return `${format(time)} - ${format(endTime)}`
    }
    return format(time)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agendar Onboarding</DialogTitle>
          <DialogDescription>
            Asigna a <span className="font-semibold text-foreground">{driverName}</span> a un evento de capacitación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Lista de eventos */}
          <div className="space-y-2">
            <Label>Selecciona un evento</Label>
            
            {events.length === 0 ? (
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
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {events.map((event) => {
                  const isSelected = selectedEventId === event.id
                  const occupiedSlots = event.currentCapacity || 0
                  const totalSlots = event.maxCapacity || null
                  const availableSlots = event.availableSlots
                  const isFull = event.hasCapacity === false
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => !isFull && setSelectedEventId(event.id)}
                      className={cn(
                        "relative border rounded-lg p-4 transition-all cursor-pointer",
                        isFull && "opacity-50 cursor-not-allowed",
                        isSelected 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      {/* Checkmark para seleccionado */}
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2 pr-8">
                        {/* Título y fecha */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1 truncate">
                              {event.title || 'Evento de Onboarding'}
                            </h4>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{formatDate(event.scheduledDate)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{formatTime(event.startTime, event.endTime)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Ubicación y cupos */}
                        <div className="flex items-center gap-4 text-xs">
                          {event.location && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1.5 ml-auto">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">
                              {occupiedSlots}{totalSlots ? ` / ${totalSlots}` : ''}
                            </span>
                            {availableSlots !== null && availableSlots > 0 && (
                              <span className="text-green-600 ml-1">
                                ({availableSlots} {availableSlots === 1 ? 'libre' : 'libres'})
                              </span>
                            )}
                            {isFull && (
                              <span className="text-red-600 ml-1 font-medium">
                                (Lleno)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
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
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)} 
            disabled={isPending}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSchedule} 
            disabled={!selectedEventId || isPending || events.length === 0}
            className="cursor-pointer"
          >
            {isPending ? (
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