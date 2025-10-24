// components/admin/manage-onboarding-modal-client.tsx
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
  Check,
  CalendarX,
  CalendarCheck,
  ExternalLink,
  AlertTriangle,
  Info
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { 
  assignDriverToOnboardingEvent,
  removeDriverFromOnboardingEvent 
} from "@/lib/actions/onboarding.actions"
import { useRouter } from 'next/navigation'

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

interface CurrentOnboarding {
  id: string // attendeeId
  eventId: string
  status: string
  event: {
    id: string
    title: string | null
    scheduledDate: Date
    startTime: string
    endTime: string | null
    location: string | null
  }
  attendeeNotes: string | null
}

interface ManageOnboardingModalClientProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  driverId: string
  driverName: string
  currentOnboarding: CurrentOnboarding | null
  availableEvents: Event[]
  onSuccess: () => void
}

export function ManageOnboardingModalClient({
  open,
  onOpenChange,
  driverId,
  driverName,
  currentOnboarding,
  availableEvents,
  onSuccess,
}: ManageOnboardingModalClientProps) {
  const router = useRouter()
  const [selectedEventId, setSelectedEventId] = useState('')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [action, setAction] = useState<'schedule' | 'reschedule' | 'cancel' | null>(null)

  const isScheduled = !!currentOnboarding

  // Resetear al abrir/cerrar
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedEventId('')
      setNotes('')
      setAction(null)
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

  const handleReschedule = () => {
    if (!selectedEventId || !currentOnboarding) {
      toast.error('Selecciona un evento de onboarding')
      return
    }

    startTransition(async () => {
      // Primero cancelar el actual
      const cancelResult = await removeDriverFromOnboardingEvent({
        attendeeId: currentOnboarding.id,
        reason: 'Reagendado a otro evento'
      })

      if (!cancelResult.success) {
        toast.error(cancelResult.error || 'Error al cancelar onboarding actual')
        return
      }

      // Luego agendar en el nuevo
      const scheduleResult = await assignDriverToOnboardingEvent({
        eventId: selectedEventId,
        driverId,
        notes: notes.trim() || undefined
      })

      if (scheduleResult.success) {
        toast.success('Onboarding reagendado exitosamente')
        onSuccess()
        handleOpenChange(false)
      } else {
        toast.error(scheduleResult.error || 'Error al reagendar onboarding')
      }
    })
  }

  const handleCancel = () => {
    if (!currentOnboarding) return

    startTransition(async () => {
      const result = await removeDriverFromOnboardingEvent({
        attendeeId: currentOnboarding.id,
        reason: notes.trim() || 'Cancelado por el administrador'
      })

      if (result.success) {
        toast.success('Onboarding cancelado exitosamente')
        onSuccess()
        handleOpenChange(false)
      } else {
        toast.error(result.error || 'Error al cancelar onboarding')
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      INVITED: { label: 'Invitado', variant: 'secondary' },
      CONFIRMED: { label: 'Confirmado', variant: 'default' },
      SCHEDULED: { label: 'Programado', variant: 'default' },
      ATTENDED: { label: 'Asistió', variant: 'default' },
      NO_SHOW: { label: 'No Asistió', variant: 'destructive' },
      CANCELLED: { label: 'Cancelado', variant: 'outline' },
      RESCHEDULED: { label: 'Reagendado', variant: 'secondary' },
    }

    const config = statusConfig[status] || { label: status, variant: 'outline' }
    return <Badge variant={config.variant as any}>{config.label}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isScheduled ? 'Gestionar Onboarding' : 'Agendar Onboarding'}
          </DialogTitle>
          <DialogDescription>
            {isScheduled 
              ? `Gestiona el onboarding de ${driverName}`
              : `Asigna a ${driverName} a un evento de capacitación`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Onboarding actual */}
          {isScheduled && currentOnboarding && (
            <>
              <div className="space-y-3">
                <Label className="text-base font-semibold">Onboarding Actual</Label>
                
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">
                        {currentOnboarding.event.title || 'Evento de Onboarding'}
                      </h4>
                      <div className="flex items-center gap-1 mb-2">
                        {getStatusBadge(currentOnboarding.status)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(currentOnboarding.event.scheduledDate)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(currentOnboarding.event.startTime, currentOnboarding.event.endTime)}</span>
                    </div>

                    {currentOnboarding.event.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{currentOnboarding.event.location}</span>
                      </div>
                    )}

                    {currentOnboarding.attendeeNotes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Notas:</p>
                        <p className="text-sm">{currentOnboarding.attendeeNotes}</p>
                      </div>
                    )}
                  </div>

                  {/* Acciones rápidas */}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/onboarding/${currentOnboarding.eventId}`)}
                      className="cursor-pointer flex-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Ver Evento
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAction('reschedule')}
                      disabled={isPending || action === 'cancel'}
                      className="cursor-pointer flex-1"
                    >
                      <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
                      Reagendar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAction('cancel')}
                      disabled={isPending || action === 'reschedule'}
                      className="cursor-pointer flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <CalendarX className="h-3.5 w-3.5 mr-1.5" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Cancelar onboarding */}
          {action === 'cancel' && currentOnboarding && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-red-900 mb-1">¿Cancelar este onboarding?</p>
                  <p className="text-red-700">
                    El driver será removido del evento. Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancel-notes">Razón de cancelación (opcional)</Label>
                <Textarea
                  id="cancel-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: El driver no puede asistir en esa fecha"
                  rows={3}
                  disabled={isPending}
                />
              </div>
            </div>
          )}

          {/* Seleccionar nuevo evento (para agendar o reagendar) */}
          {(!isScheduled || action === 'reschedule') && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                {action === 'reschedule' ? 'Seleccionar Nuevo Evento' : 'Selecciona un evento'}
              </Label>

              {action === 'reschedule' && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-900">
                    El onboarding actual será cancelado y el driver será asignado al nuevo evento que selecciones.
                  </p>
                </div>
              )}
              
              {availableEvents.length === 0 ? (
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
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {availableEvents.map((event) => {
                    const isSelected = selectedEventId === event.id
                    const isCurrent = currentOnboarding?.eventId === event.id
                    const occupiedSlots = event.currentCapacity || 0
                    const totalSlots = event.maxCapacity || null
                    const availableSlots = event.availableSlots
                    const isFull = event.hasCapacity === false
                    
                    return (
                      <div
                        key={event.id}
                        onClick={() => !isFull && !isCurrent && setSelectedEventId(event.id)}
                        className={cn(
                          "relative border rounded-lg p-4 transition-all",
                          isCurrent && "opacity-50 cursor-not-allowed bg-muted/50",
                          isFull && !isCurrent && "opacity-50 cursor-not-allowed",
                          !isFull && !isCurrent && "cursor-pointer hover:border-primary/50 hover:bg-muted/50",
                          isSelected && "border-primary bg-primary/5 shadow-sm"
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

                        {/* Badge de evento actual */}
                        {isCurrent && (
                          <div className="absolute top-3 right-3">
                            <Badge variant="outline" className="text-xs">
                              Evento Actual
                            </Badge>
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

              {/* Notas opcionales */}
              {(!isScheduled || action === 'reschedule') && (
                <div className="space-y-2 mt-4">
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
                setNotes('')
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

          {(action === 'reschedule' || !isScheduled) && (
            <Button 
              onClick={action === 'reschedule' ? handleReschedule : handleSchedule} 
              disabled={!selectedEventId || isPending || availableEvents.length === 0}
              className="cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {action === 'reschedule' ? 'Reagendando...' : 'Agendando...'}
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  {action === 'reschedule' ? 'Reagendar' : 'Agendar'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}