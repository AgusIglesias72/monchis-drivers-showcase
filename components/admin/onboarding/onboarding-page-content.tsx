// components/admin/onboarding/onboarding-page-content.tsx

"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Search,
  MapPin,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Loader2,
  UserPlus,
} from "lucide-react"
import { AdminHeader } from "@/components/admin/admin-header"
import { EventFormDialog } from "@/components/admin/onboarding/event-form-dialog"
import { 
  createOnboardingEvent, 
  updateOnboardingEvent, 
  deleteOnboardingEvent 
} from "@/lib/actions/onboarding.actions"
import { getEventStatusLabel } from "@/types/onboarding"
import { toast } from "sonner"
import type { OnboardingEventStatus, OnboardingEventWithRelations } from "@/types/onboarding"

type SortField = 'date' | 'location' | 'organizer' | 'capacity' | 'status'
type SortDirection = 'asc' | 'desc'

interface OnboardingPageContentProps {
  initialEvents: OnboardingEventWithRelations[]
  currentStatus?: string
}

export function OnboardingPageContent({ 
  initialEvents,
  currentStatus
}: OnboardingPageContentProps) {
  const router = useRouter()
  
  // Estado local de eventos (inicializado con datos del servidor)
  const [events, setEvents] = useState<OnboardingEventWithRelations[]>(initialEvents)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>(currentStatus || 'all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  
  const [showEventForm, setShowEventForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<OnboardingEventWithRelations | null>(null)
  const [eventToDelete, setEventToDelete] = useState<OnboardingEventWithRelations | null>(null)
  
  const [isPending, startTransition] = useTransition()

  // Actualizar eventos cuando cambian los datos iniciales
  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  // Calcular currentCapacity dinámicamente a partir de attendees
  const eventsWithCapacity = events.map(event => ({
    ...event,
    currentCapacity: event.attendees?.length || 0
  }))

  // Función para manejar el ordenamiento
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Filtrar y ordenar eventos
  const filteredAndSortedEvents = eventsWithCapacity
    .filter(event => {
      const matchesSearch = 
        (event.location?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (event.organizerUser.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (event.title?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      
      const matchesFilter = filterStatus === 'all' || event.status === filterStatus

      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
          break
        case 'location':
          comparison = (a.location || '').localeCompare(b.location || '')
          break
        case 'organizer':
          comparison = (a.organizerUser.fullName || '').localeCompare(b.organizerUser.fullName || '')
          break
        case 'capacity':
          const aPercent = a.maxCapacity ? a.currentCapacity / a.maxCapacity : 0
          const bPercent = b.maxCapacity ? b.currentCapacity / b.maxCapacity : 0
          comparison = aPercent - bPercent
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })

  // Componente para el header de tabla ordenable
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field
    
    return (
      <TableHead 
        className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-2">
          {children}
          <div className="flex flex-col">
            <svg
              className={`h-3 w-3 transition-colors ${isActive && sortDirection === 'asc' ? 'text-foreground' : 'text-muted-foreground/30'}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M7 14l5-5 5 5z" />
            </svg>
            <svg
              className={`h-3 w-3 -mt-1 transition-colors ${isActive && sortDirection === 'desc' ? 'text-foreground' : 'text-muted-foreground/30'}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </div>
        </div>
      </TableHead>
    )
  }

  const getStatusBadge = (status: OnboardingEventStatus) => {
    const config = {
      DRAFT: {
        className: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <Edit className="h-3 w-3" />,
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
        icon: <CheckCircle className="h-3 w-3" />,
      },
      CANCELLED: {
        className: 'bg-red-100 text-red-800 border-red-200',
        icon: <XCircle className="h-3 w-3" />,
      },
      POSTPONED: {
        className: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <Clock className="h-3 w-3" />,
      },
    }

    const { className, icon } = config[status]

    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        {icon}
        {getEventStatusLabel(status)}
      </Badge>
    )
  }

  // Formato de fecha: dd/mm/yyyy
  const formatDate = (date: Date) => {
    const d = new Date(date)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }

  const handleCreateEvent = () => {
    setSelectedEvent(null)
    setShowEventForm(true)
  }

  const handleEditEvent = (event: OnboardingEventWithRelations) => {
    setSelectedEvent(event)
    setShowEventForm(true)
  }

  const handleSaveEvent = async (data: any) => {
    startTransition(async () => {
      try {
        if (selectedEvent) {
          const result = await updateOnboardingEvent(selectedEvent.id, data)
          
          if (result.success && result.event) {
            setEvents(prev => prev.map(e => e.id === selectedEvent.id ? result.event! : e))
            toast.success(result.message || 'Evento actualizado')
            setShowEventForm(false)
            router.refresh()
          } else {
            toast.error(result.error || 'Error al actualizar')
          }
        } else {
          const result = await createOnboardingEvent(data)
          
          if (result.success && result.event) {
            setEvents(prev => [...prev, result.event!])
            toast.success(result.message || 'Evento creado')
            setShowEventForm(false)
            router.refresh()
          } else {
            toast.error(result.error || 'Error al crear')
          }
        }
      } catch (error: any) {
        toast.error(error.message || 'Error al guardar evento')
      }
    })
    
    return Promise.resolve({ success: true })
  }

  const handleDeleteEvent = () => {
    if (!eventToDelete) return
    
    startTransition(async () => {
      const result = await deleteOnboardingEvent(eventToDelete.id)
      
      if (result.success) {
        setEvents(prev => prev.filter(e => e.id !== eventToDelete.id))
        toast.success(result.message || 'Evento eliminado')
        setEventToDelete(null)
        router.refresh()
      } else {
        toast.error(result.error || 'Error al eliminar')
      }
    })
  }

  const handleViewEvent = (event: OnboardingEventWithRelations) => {
    router.push(`/admin/onboarding/${event.id}`)
  }

  return (
    <div className="flex flex-1 flex-col container mx-auto">
      <AdminHeader
        breadcrumbs={[
          { label: "On Boarding" }
        ]}
      />

      <div className="flex-1 p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">On Boarding</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona las sesiones de incorporación de nuevos drivers
            </p>
          </div>
          <Button className="gap-2 md:mt-0" onClick={handleCreateEvent}>
            <Plus className="h-4 w-4" />
            Nueva Sesión
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos de On Boarding</CardTitle>
            <CardDescription>
              Visualiza y gestiona todos los eventos programados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ubicación u organizador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="DRAFT">Borradores</SelectItem>
                  <SelectItem value="SCHEDULED">Programados</SelectItem>
                  <SelectItem value="IN_PROGRESS">En Curso</SelectItem>
                  <SelectItem value="COMPLETED">Completados</SelectItem>
                  <SelectItem value="CANCELLED">Cancelados</SelectItem>
                  <SelectItem value="POSTPONED">Pospuestos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card>
          <CardContent className="p-0">
            {isPending ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <SortableHeader field="date">Fecha y Hora</SortableHeader>
                      <SortableHeader field="location">Ubicación</SortableHeader>
                      <SortableHeader field="organizer">Organizador</SortableHeader>
                      <SortableHeader field="capacity">Capacidad</SortableHeader>
                      <SortableHeader field="status">Estado</SortableHeader>
                      <TableHead className="text-right pr-6">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          {searchTerm || filterStatus !== 'all' 
                            ? 'No se encontraron eventos con los filtros aplicados' 
                            : 'No hay eventos creados aún'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedEvents.map((event) => (
                        <TableRow 
                          key={event.id} 
                          className="group hover:bg-muted/30 transition-colors border-b"
                        >
                          {/* Fecha y Hora */}
                          <TableCell 
                            onClick={() => handleViewEvent(event)}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">
                                  {formatDate(event.scheduledDate)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="text-xs">
                                  {event.startTime}
                                  {event.endTime && ` - ${event.endTime}`}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Ubicación */}
                          <TableCell 
                            onClick={() => handleViewEvent(event)}
                            className="cursor-pointer"
                          >
                            {event.location ? (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{event.location}</span>
                                  {event.locationAddress && (
                                    <span className="text-xs text-muted-foreground">
                                      {event.locationAddress}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Sin ubicación</span>
                            )}
                          </TableCell>

                          {/* Organizador */}
                          <TableCell 
                            onClick={() => handleViewEvent(event)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-semibold text-primary">
                                  {(event.organizerUser.fullName || event.organizerUser.email || 'N/A').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm font-medium">
                                {event.organizerUser.fullName || event.organizerUser.email}
                              </span>
                            </div>
                          </TableCell>

                          {/* Capacidad */}
                          <TableCell 
                            onClick={() => handleViewEvent(event)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className={`text-sm font-semibold ${
                                  event.maxCapacity && event.currentCapacity >= event.maxCapacity 
                                    ? 'text-red-600' 
                                    : 'text-foreground'
                                }`}>
                                  {event.currentCapacity}
                                  {event.maxCapacity ? `/${event.maxCapacity}` : ''}
                                </span>
                              </div>
                              {/* Progress bar */}
                              {event.maxCapacity && (
                                <div className="flex-1 max-w-[100px]">
                                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all ${
                                        event.currentCapacity >= event.maxCapacity
                                          ? 'bg-red-500'
                                          : event.currentCapacity / event.maxCapacity > 0.8
                                          ? 'bg-amber-500'
                                          : 'bg-green-500'
                                      }`}
                                      style={{ 
                                        width: `${Math.min((event.currentCapacity / event.maxCapacity) * 100, 100)}%` 
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Estado */}
                          <TableCell 
                            onClick={() => handleViewEvent(event)}
                            className="cursor-pointer"
                          >
                            {getStatusBadge(event.status)}
                          </TableCell>

                          {/* Acciones */}
                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewEvent(event)
                                }}
                                title="Ver detalles"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/admin/onboarding/${event.id}`)
                                }}
                                title="Agregar drivers"
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditEvent(event)
                                }}
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEventToDelete(event)
                                }}
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Event Form Dialog */}
      <EventFormDialog
        open={showEventForm}
        onOpenChange={setShowEventForm}
        event={selectedEvent}
        onSave={handleSaveEvent}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este evento del {eventToDelete && formatDate(eventToDelete.scheduledDate)}?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}