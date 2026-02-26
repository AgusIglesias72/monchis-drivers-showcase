// components/postulacion/capacitacion-selector.tsx
'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Link as LinkIcon, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import type { AssignedCapacitacionInfo } from '@/lib/types/portal.types'
import type { FormDocumentsStatus } from '@prisma/client'

const MONCHIS_RED = '#e7243f'

interface OnboardingEvent {
  id: string
  scheduledDate: Date
  startTime: string
  endTime: string
  location: string
  locationAddress: string
  meetingLink: string | null
  maxCapacity: number
  currentCapacity: number
}

interface CapacitacionSelectorProps {
  token: string
  documentsStatus: FormDocumentsStatus
  assignedCapacitacion: AssignedCapacitacionInfo | null
  onUpdate: () => void
}

export function CapacitacionSelector({
  token,
  documentsStatus,
  assignedCapacitacion,
  onUpdate,
}: CapacitacionSelectorProps) {
  const [availableEvents, setAvailableEvents] = useState<OnboardingEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<OnboardingEvent | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showChangeDialog, setShowChangeDialog] = useState(false)

  const canSelect = documentsStatus === 'APPROVED'

  useEffect(() => {
    if (canSelect && !assignedCapacitacion) {
      fetchAvailableEvents()
    }
  }, [canSelect, assignedCapacitacion])

  const fetchAvailableEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/postulacion/${token}/capacitaciones`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar eventos')
      }

      setAvailableEvents(result.events || [])
    } catch (err: any) {
      console.error('Error fetching events:', err)
      toast.error('No se pudieron cargar los eventos disponibles')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectEvent = (event: OnboardingEvent) => {
    setSelectedEvent(event)
    setShowConfirmDialog(true)
  }

  const handleConfirmSelection = async () => {
    if (!selectedEvent) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/postulacion/${token}/capacitaciones/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEvent.id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al seleccionar capacitación')
      }

      toast.success('¡Capacitación confirmada! Recibirás un mensaje de WhatsApp con los detalles.')
      onUpdate()
      setShowConfirmDialog(false)
      setSelectedEvent(null)
    } catch (err: any) {
      console.error('Error selecting event:', err)
      toast.error(err.message || 'No se pudo confirmar la capacitación')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangeEvent = (newEvent: OnboardingEvent) => {
    setSelectedEvent(newEvent)
    setShowChangeDialog(true)
  }

  const handleConfirmChange = async () => {
    if (!selectedEvent) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/postulacion/${token}/capacitaciones/change`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEventId: selectedEvent.id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al cambiar capacitación')
      }

      toast.success('Fecha de capacitación actualizada correctamente')
      onUpdate()
      setShowChangeDialog(false)
      setSelectedEvent(null)
    } catch (err: any) {
      console.error('Error changing event:', err)
      toast.error(err.message || 'No se pudo cambiar la fecha')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-PY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // No puede seleccionar aún
  if (!canSelect) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Documentos pendientes de aprobación</strong>
            <br />
            Para poder seleccionar tu fecha de capacitación, primero necesitás tener todos tus documentos
            aprobados. Subí los documentos faltantes y esperá la aprobación de nuestro equipo.
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Capacitación Pendiente</h3>
            <p className="text-sm text-gray-600">
              Una vez que tus documentos estén aprobados, podrás seleccionar tu fecha de capacitación.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Ya tiene capacitación asignada
  if (assignedCapacitacion) {
    return (
      <div className="space-y-6">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Capacitación confirmada</strong>
            <br />
            Tenés una capacitación programada. Si necesitás cambiar la fecha, podés seleccionar otra disponible
            abajo.
          </AlertDescription>
        </Alert>

        {/* Capacitación Actual */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-green-900">Tu Capacitación</CardTitle>
                <CardDescription className="text-green-700">
                  Asegurate de asistir puntualmente
                </CardDescription>
              </div>
              <Badge className="bg-green-600 text-white">
                {assignedCapacitacion.status === 'SCHEDULED' ? 'Agendado' : assignedCapacitacion.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-green-900">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 mt-0.5 text-green-700" />
              <div>
                <p className="font-medium">{formatDate(assignedCapacitacion.scheduledDate)}</p>
                <p className="text-sm text-green-700">
                  {assignedCapacitacion.startTime} - {assignedCapacitacion.endTime}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 mt-0.5 text-green-700" />
              <div>
                <p className="font-medium">{assignedCapacitacion.location}</p>
                <p className="text-sm text-green-700">{assignedCapacitacion.locationAddress}</p>
              </div>
            </div>
            {assignedCapacitacion.meetingLink && (
              <div className="flex items-start gap-3">
                <LinkIcon className="h-5 w-5 mt-0.5 text-green-700" />
                <a
                  href={assignedCapacitacion.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-700 hover:underline break-all"
                >
                  {assignedCapacitacion.meetingLink}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Otras fechas disponibles */}
        {assignedCapacitacion.canChange && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Cambiar a otra fecha</h3>
              <Button variant="outline" size="sm" onClick={fetchAvailableEvents}>
                Actualizar
              </Button>
            </div>

            {loading ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: MONCHIS_RED }} />
                  <p className="text-gray-600">Cargando eventos...</p>
                </CardContent>
              </Card>
            ) : availableEvents.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-600">No hay otras fechas disponibles en este momento.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {availableEvents
                  .filter((e) => e.id !== assignedCapacitacion.id)
                  .map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onSelect={() => handleChangeEvent(event)}
                      buttonText="Cambiar a esta fecha"
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Sin capacitación asignada - mostrar disponibles
  return (
    <div className="space-y-6">
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          <strong>Seleccioná tu fecha de capacitación</strong>
          <br />
          Elegí la fecha que mejor te quede. La capacitación es obligatoria para poder comenzar a trabajar.
        </AlertDescription>
      </Alert>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: MONCHIS_RED }} />
            <p className="text-gray-600">Cargando eventos disponibles...</p>
          </CardContent>
        </Card>
      ) : availableEvents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay eventos disponibles</h3>
            <p className="text-sm text-gray-600 mb-4">
              No hay capacitaciones programadas en este momento. Contactanos para más información.
            </p>
            <Button variant="outline" onClick={fetchAvailableEvents}>
              Actualizar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Eventos Disponibles ({availableEvents.length})</h3>
            <Button variant="outline" size="sm" onClick={fetchAvailableEvents}>
              Actualizar
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {availableEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onSelect={() => handleSelectEvent(event)}
                buttonText="Seleccionar esta fecha"
              />
            ))}
          </div>
        </>
      )}

      {/* Confirmation Dialog - Select */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Capacitación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas que querés asistir a la capacitación el{' '}
              <strong>{selectedEvent && formatDate(selectedEvent.scheduledDate)}</strong> a las{' '}
              <strong>{selectedEvent?.startTime}</strong>?
              <br />
              <br />
              Recibirás un mensaje de WhatsApp con todos los detalles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSelection}
              disabled={isSubmitting}
              style={{ backgroundColor: MONCHIS_RED }}
              className="hover:opacity-90"
            >
              {isSubmitting ? 'Confirmando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog - Change */}
      <AlertDialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar Fecha de Capacitación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas que querés cambiar tu capacitación al{' '}
              <strong>{selectedEvent && formatDate(selectedEvent.scheduledDate)}</strong> a las{' '}
              <strong>{selectedEvent?.startTime}</strong>?
              <br />
              <br />
              Tu capacitación anterior será cancelada y recibirás un nuevo mensaje de confirmación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmChange}
              disabled={isSubmitting}
              style={{ backgroundColor: MONCHIS_RED }}
              className="hover:opacity-90"
            >
              {isSubmitting ? 'Cambiando...' : 'Cambiar Fecha'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Event Card Component
interface EventCardProps {
  event: OnboardingEvent
  onSelect: () => void
  buttonText: string
}

function EventCard({ event, onSelect, buttonText }: EventCardProps) {
  const availableSpots = event.maxCapacity - event.currentCapacity
  const percentFull = (event.currentCapacity / event.maxCapacity) * 100

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-PY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <Card className="hover:border-[#e7243f] transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <Calendar className="h-5 w-5 mt-0.5" style={{ color: MONCHIS_RED }} />
            <div className="min-w-0">
              <p className="font-medium text-sm leading-tight">{formatDate(event.scheduledDate)}</p>
              <p className="text-xs text-gray-600 mt-0.5">
                {event.startTime} - {event.endTime}
              </p>
            </div>
          </div>
          <Badge variant={percentFull >= 80 ? 'destructive' : 'secondary'} className="shrink-0">
            {availableSpots} cupos
          </Badge>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-0.5 text-gray-500" />
          <div className="text-xs text-gray-700 min-w-0">
            <p className="font-medium">{event.location}</p>
            <p className="text-gray-500">{event.locationAddress}</p>
          </div>
        </div>

        {event.meetingLink && (
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-gray-500" />
            <p className="text-xs text-gray-600">Incluye link de reunión</p>
          </div>
        )}

        <Button
          onClick={onSelect}
          className="w-full mt-2"
          style={{ backgroundColor: MONCHIS_RED }}
          disabled={availableSpots === 0}
        >
          {availableSpots === 0 ? 'Sin cupos' : buttonText}
        </Button>
      </CardContent>
    </Card>
  )
}
