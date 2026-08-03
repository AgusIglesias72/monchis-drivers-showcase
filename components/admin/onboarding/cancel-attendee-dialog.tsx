// components/admin/onboarding/cancel-attendee-dialog.tsx
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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Loader2, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  CalendarX,
  CalendarCheck,
  AlertTriangle,
  Info,
  User,
  Phone,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { 
  cancelAttendee,
  removeDriverFromOnboardingEvent,
  assignDriverToOnboardingEvent,
  getAllOnboardingEvents
} from "@/lib/actions/onboarding.actions"

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

interface CancelAttendeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attendee: any | null
  onSuccess: () => void
}

export function CancelAttendeeDialog({
  open,
  onOpenChange,
  attendee,
  onSuccess,
}: CancelAttendeeDialogProps) {
  const [action, setAction] = useState<'cancel' | 'reschedule' | null>(null)
  const [selectedEventId, setSelectedEventId] = useState('')
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [availableEvents, setAvailableEvents] = useState<Event[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  // Cargar eventos disponibles cuando se abre para reagendar
  const loadAvailableEvents = async () => {
    if (loadingEvents || availableEvents.length > 0) return
    
    setLoadingEvents(true)
    try {
      const result = await getAllOnboardingEvents({ status: 'SCHEDULED' })
      if (result.success && result.events) {
        // Filtrar eventos que tengan capacidad y no sean el actual
        const currentEventId = attendee?.event?.id || attendee?.eventId
        const filtered = result.events
          .filter((e: any) => e.id !== currentEventId)
          .map((e: any) => ({
            id: e.id,
            title: e.title,
            scheduledDate: e.scheduledDate,
            startTime: e.startTime,
            endTime: e.endTime,
            location: e.location,
            maxCapacity: e.maxCapacity,
            currentCapacity: e.currentCapacity,
            availableSlots: e.maxCapacity ? e.maxCapacity - e.currentCapacity : null,
            hasCapacity: e.maxCapacity ? e.currentCapacity < e.maxCapacity : true,
          }))
        setAvailableEvents(filtered)
      }
    } catch (error) {
      console.error('Error loading events:', error)
      toast.error('Error al cargar eventos')
    } finally {
      setLoadingEvents(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAction(null)
      setSelectedEventId('')
      setReason('')
      setAvailableEvents([])
    }
    onOpenChange(newOpen)
  }

  const handleCancel = () => {
    if (!attendee) return

    startTransition(async () => {
      const result = await removeDriverFromOnboardingEvent({
        attendeeId: attendee.id,
        reason: reason.trim() || 'Cancelado sin motivo especificado'
      })

      if (result.success) {
        toast.success('Asistencia cancelada exitosamente')
        onSuccess()
        handleOpenChange(false)
      } else {
        toast.error(result.error || 'Error al cancelar')
      }
    })
  }

  const handleReschedule = () => {
    if (!selectedEventId || !attendee) {
      toast.error('Selecciona un evento para reagendar')
      return
    }

    startTransition(async () => {
      // Primero cancelar el actual
      const cancelResult = await removeDriverFromOnboardingEvent({
        attendeeId: attendee.id,
        reason: reason.trim() || 'Reagendado a otro evento'
      })

      if (!cancelResult.success) {
        toast.error(cancelResult.error || 'Error al cancelar asistencia actual')
        return
      }

      // Luego agendar en el nuevo
      const scheduleResult = await assignDriverToOnboardingEvent({
        eventId: selectedEventId,
        driverId: attendee.formDriver.id,
        notes: reason.trim() || undefined
      })

      if (scheduleResult.success) {
        toast.success('Onboarding reagendado exitosamente')
        onSuccess()
        handleOpenChange(false)
      } else {
        toast.error(scheduleResult.error || 'Error al reagendar')
      }
    })
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (time: string, endTime?: string | null) => {
    return endTime ? `${time} - ${endTime}` : time
  }

  if (!attendee) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar Asistencia</DialogTitle>
          <DialogDescription>
            Cancela o reagenda la asistencia de {attendee.formDriver?.fullName || 'este driver'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info del driver */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{attendee.formDriver?.fullName || 'Sin nombre'}</span>
            </div>
            {attendee.formDriver?.phoneNumber && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{attendee.formDriver.phoneNumber}</span>
              </div>
            )}
            
            {attendee.event && (
              <>
                <Separator />
                
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Evento Actual:</p>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-info mt-0.5" />
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{attendee.event.title || 'Sin título'}</p>
                      <p className="text-muted-foreground">
                        {formatDate(attendee.event.scheduledDate)} • {formatTime(attendee.event.startTime, attendee.event.endTime)}
                      </p>
                      {attendee.event.location && (
                        <p className="text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {attendee.event.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Selector de acción */}
          {!action && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">¿Qué deseas hacer?</Label>
              
              <div className="grid gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAction('reschedule')
                    loadAvailableEvents()
                  }}
                  disabled={isPending}
                  className="cursor-pointer justify-start h-auto p-4"
                >
                  <div className="flex items-start gap-3 text-left">
                    <CalendarCheck className="h-5 w-5 text-info mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Reagendar a otro evento</p>
                      <p className="text-sm text-muted-foreground">
                        Cancela el evento actual y asigna al driver a un nuevo onboarding
                      </p>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setAction('cancel')}
                  disabled={isPending}
                  className="cursor-pointer justify-start h-auto p-4 hover:bg-danger-soft hover:border-destructive"
                >
                  <div className="flex items-start gap-3 text-left">
                    <CalendarX className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Cancelar asistencia</p>
                      <p className="text-sm text-muted-foreground">
                        Remueve al driver del evento sin asignarlo a otro
                      </p>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* Vista de Cancelar */}
          {action === 'cancel' && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-danger-soft border border-destructive rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-destructive mb-1">¿Cancelar esta asistencia?</p>
                  <p className="text-destructive">
                    El driver será removido del evento y podrás asignarlo a otro onboarding más adelante.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
                <Textarea
                  id="cancel-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Reprogramado por solicitud del driver, problemas de disponibilidad..."
                  rows={3}
                  disabled={isPending}
                />
              </div>
            </div>
          )}

          {/* Vista de Reagendar */}
          {action === 'reschedule' && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-info-soft border border-info rounded-lg text-sm">
                <Info className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
                <p className="text-info">
                  El onboarding actual será cancelado y el driver será asignado al nuevo evento que selecciones.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Seleccionar Nuevo Evento</Label>

                {loadingEvents ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : availableEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No hay eventos disponibles</p>
                    <p className="text-sm">Crea un nuevo evento para poder reagendar</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {availableEvents.map((event) => {
                      const isSelected = selectedEventId === event.id
                      const isFull = !event.hasCapacity
                      const totalSlots = event.maxCapacity
                      const availableSlots = event.availableSlots

                      return (
                        <button
                          key={event.id}
                          onClick={() => !isFull && setSelectedEventId(event.id)}
                          disabled={isFull || isPending}
                          className={cn(
                            "w-full text-left p-4 rounded-lg border-2 transition-all",
                            isSelected
                              ? "border-info bg-info-soft"
                              : isFull
                              ? "border-border bg-muted opacity-60 cursor-not-allowed"
                              : "border-border hover:border-border hover:bg-muted cursor-pointer"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <Calendar className={cn(
                              "h-5 w-5 mt-0.5",
                              isSelected ? "text-info" : "text-muted-foreground"
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">
                                {event.title || 'Sin título'}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                <span>{formatDate(event.scheduledDate)}</span>
                                <span>•</span>
                                <span>{formatTime(event.startTime, event.endTime)}</span>
                                {event.location && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {event.location}
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-2 text-xs">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {event.currentCapacity}{totalSlots ? ` / ${totalSlots}` : ''}
                                </span>
                                {availableSlots !== null && availableSlots > 0 && (
                                  <span className="text-success ml-1">
                                    ({availableSlots} {availableSlots === 1 ? 'libre' : 'libres'})
                                  </span>
                                )}
                                {isFull && (
                                  <span className="text-destructive ml-1 font-medium">
                                    (Lleno)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Notas opcionales */}
              {availableEvents.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="reschedule-notes">Notas (opcional)</Label>
                  <Textarea
                    id="reschedule-notes"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej: Reagendado por disponibilidad del driver..."
                    rows={2}
                    disabled={isPending}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              if (action) {
                setAction(null)
                setSelectedEventId('')
                setReason('')
              } else {
                handleOpenChange(false)
              }
            }} 
            disabled={isPending}
            className="cursor-pointer"
          >
            {action ? 'Volver' : 'Cancelar'}
          </Button>

          {action === 'cancel' && (
            <Button 
              variant="destructive"
              onClick={handleCancel} 
              disabled={isPending}
              className="cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <CalendarX className="h-4 w-4 mr-2" />
                  Confirmar Cancelación
                </>
              )}
            </Button>
          )}

          {action === 'reschedule' && (
            <Button 
              onClick={handleReschedule} 
              disabled={!selectedEventId || isPending || availableEvents.length === 0}
              className="cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reagendando...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Reagendar
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}