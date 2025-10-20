// app/admin/onboarding/[id]/page.tsx

"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  Bell,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  UserPlus,
  AlertCircle,
  Link as LinkIcon,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { AddDriversDialog } from '@/components/admin/onboarding/add-drivers-dialog'
import { AttendeesTable } from '@/components/admin/onboarding/attendees-table'
import { useOnboardingAttendees } from '@/hooks/use-onboarding-attendees'
import { OnBoardingAPI } from '@/types/onboarding'
import { getEventStatusLabel } from '@/types/onboarding'
import type { OnboardingEventWithRelations } from '@/types/onboarding'

export default function EventDetailPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const [event, setEvent] = useState<OnboardingEventWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddDrivers, setShowAddDrivers] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)

  const {
    attendees,
    loading: attendeesLoading,
    fetchAttendees,
    checkIn,
    markNoShow,
    cancelAttendee,
    confirmAttendee,
  } = useOnboardingAttendees(eventId)

  const api = useMemo(() => new OnBoardingAPI(), [])

  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true)
      const events = await api.getEvents()
      const foundEvent = events.find(e => e.id === eventId)
      setEvent(foundEvent || null)
    } catch (error) {
      console.error('Error fetching event:', error)
    } finally {
      setLoading(false)
    }
  }, [eventId, api])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  const handleSendReminders = async () => {
    setActionLoading(true)
    try {
      await api.sendReminders({ eventId })
      alert('Recordatorios enviados exitosamente')
      fetchEvent()
    } catch (error) {
      alert('Error al enviar recordatorios')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteEvent = async () => {
    setActionLoading(true)
    try {
      await api.completeEvent({ eventId })
      alert('Evento completado exitosamente')
      setShowCompleteDialog(false)
      fetchEvent()
    } catch (error) {
      alert('Error al completar evento')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckIn = async (attendeeId: string) => {
    const result = await checkIn(attendeeId)
    if (!result.success) {
      alert(result.error)
    }
  }

  const handleMarkNoShow = async (attendeeId: string) => {
    const result = await markNoShow(attendeeId)
    if (!result.success) {
      alert(result.error)
    }
  }

  const handleCancelAttendee = async (attendeeId: string) => {
    const result = await cancelAttendee(attendeeId)
    if (!result.success) {
      alert(result.error)
    }
  }

  const handleConfirmAttendee = async (attendeeId: string) => {
    const result = await confirmAttendee(attendeeId)
    if (!result.success) {
      alert(result.error)
    }
  }

  const handleViewDriver = (driverId: string) => {
    router.push(`/admin/postulaciones/${driverId}`)
  }

  // Formato corto: dd/mm/yyyy
  const formatDate = (date: Date) => {
    const d = new Date(date)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }

  const formatTime = (time: string) => {
    return time
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; icon: React.ReactNode }> = {
      DRAFT: {
        className: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <AlertCircle className="h-3 w-3" />,
      },
      SCHEDULED: {
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Calendar className="h-3 w-3" />,
      },
      IN_PROGRESS: {
        className: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: <Clock className="h-3 w-3" />,
      },
      COMPLETED: {
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle2 className="h-3 w-3" />,
      },
      CANCELLED: {
        className: 'bg-red-100 text-red-800 border-red-200',
        icon: <AlertCircle className="h-3 w-3" />,
      },
      POSTPONED: {
        className: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <Clock className="h-3 w-3" />,
      },
    }

    const { className, icon } = config[status] || config.DRAFT

    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        {icon}
        {getEventStatusLabel(status as any)}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Evento no encontrado</h2>
          <Button className="mt-4" onClick={() => router.push('/admin/onboarding')}>
            Volver a OnBoarding
          </Button>
        </div>
      </div>
    )
  }

  const attendedCount = attendees.filter(a => a.status === 'ATTENDED').length
  const confirmedCount = attendees.filter(a => a.status === 'CONFIRMED').length
  const noShowCount = attendees.filter(a => a.status === 'NO_SHOW').length

  // Generar título dinámico si no hay título
  const displayTitle = event.title || `OnBoarding - ${formatDate(event.scheduledDate)}`

  return (
    <div className="flex flex-1 flex-col container mx-auto">
      <AdminHeader
        breadcrumbs={[
          { label: "On Boarding", href: "/admin/onboarding" },
          { label: displayTitle }
        ]}
      />

      <div className="flex-1 p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/admin/onboarding')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{displayTitle}</h1>
              {event.description && (
                <p className="text-muted-foreground mt-1">{event.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {event.status === 'SCHEDULED' && !event.reminderSent && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleSendReminders}
                disabled={actionLoading || attendees.length === 0}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                Enviar Recordatorios
              </Button>
            )}
            {(event.status === 'SCHEDULED' || event.status === 'IN_PROGRESS') && (
              <Button
                className="gap-2"
                onClick={() => setShowCompleteDialog(true)}
                disabled={actionLoading}
              >
                <CheckCircle2 className="h-4 w-4" />
                Completar Evento
              </Button>
            )}
          </div>
        </div>

        {/* Event Details */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Fecha y Hora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{formatDate(event.scheduledDate)}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(event.startTime)}
                  {event.endTime && ` - ${formatTime(event.endTime)}`}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Ubicación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-semibold">{event.location || 'No especificada'}</p>
                {event.locationAddress && (
                  <p className="text-sm text-muted-foreground">{event.locationAddress}</p>
                )}
                {event.meetingLink && (
                  <a
                    href={event.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <LinkIcon className="h-3 w-3" />
                    Link de reunión
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Capacidad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {event.currentCapacity}
                  {event.maxCapacity && `/${event.maxCapacity}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {event.maxCapacity
                    ? `${event.maxCapacity - event.currentCapacity} espacios disponibles`
                    : 'Sin límite'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Organizador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-semibold">
                  {event.organizerUser.fullName || event.organizerUser.email}
                </p>
                <div className="mt-2">{getStatusBadge(event.status)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        {attendees.length > 0 && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Invitados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{attendees.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600">
                  Confirmados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">{confirmedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">
                  Asistieron
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{attendedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">
                  No Shows
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{noShowCount}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notes */}
        {event.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                Notas del Evento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{event.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Attendees */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Drivers Asignados</CardTitle>
                <CardDescription>
                  Gestiona los drivers que asistirán a este evento
                </CardDescription>
              </div>
              <Button
                className="gap-2"
                onClick={() => setShowAddDrivers(true)}
                disabled={
                  event.maxCapacity
                    ? event.currentCapacity >= event.maxCapacity
                    : false
                }
              >
                <UserPlus className="h-4 w-4" />
                Agregar Drivers
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {attendeesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <AttendeesTable
                attendees={attendees}
                onCheckIn={handleCheckIn}
                onMarkNoShow={handleMarkNoShow}
                onCancel={handleCancelAttendee}
                onConfirm={handleConfirmAttendee}
                onViewDriver={handleViewDriver}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Drivers Dialog */}
      <AddDriversDialog
        open={showAddDrivers}
        onOpenChange={setShowAddDrivers}
        eventId={eventId}
        onSuccess={fetchAttendees}
      />

      {/* Complete Event Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Completar evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto marcará el evento como completado y actualizará el estado de todos los
              drivers que asistieron. Esta acción no se puede deshacer.
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Resumen:</p>
                <ul className="text-sm space-y-1 mt-2">
                  <li>• {attendedCount} driver(s) completarán el onboarding</li>
                  <li>• {noShowCount} driver(s) no asistieron</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCompleteEvent}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Completar Evento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}