// app/admin/onboarding/page.tsx

"use client"

import { useState } from "react"
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
} from "lucide-react"
import { AdminHeader } from "@/components/admin/admin-header"
import { EventFormDialog } from "@/components/admin/onboarding/event-form-dialog"
import { useOnboardingEvents } from "@/hooks/use-onboarding-events"
import { getEventStatusLabel } from "@/types/onboarding"
import type { OnboardingEventStatus, OnboardingEventWithRelations } from "@/types/onboarding"

type SortField = 'date' | 'location' | 'organizer' | 'capacity' | 'status'
type SortDirection = 'asc' | 'desc'

export default function OnBoardingPage() {
  const router = useRouter()
  const { events, loading, createEvent, updateEvent, deleteEvent } = useOnboardingEvents()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  
  const [showEventForm, setShowEventForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<OnboardingEventWithRelations | null>(null)
  const [eventToDelete, setEventToDelete] = useState<OnboardingEventWithRelations | null>(null)
  const [deleting, setDeleting] = useState(false)

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
  const filteredAndSortedEvents = events
    .filter(event => {
      const matchesSearch = 
        (event.location?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (event.organizerUser.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        event.title.toLowerCase().includes(searchTerm.toLowerCase())
      
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-PY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
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
    if (selectedEvent) {
      return await updateEvent(selectedEvent.id, data)
    } else {
      return await createEvent(data)
    }
  }

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return
    
    setDeleting(true)
    const result = await deleteEvent(eventToDelete.id)
    setDeleting(false)
    
    if (result.success) {
      setEventToDelete(null)
    } else {
      alert(result.error || 'Error al eliminar evento')
    }
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
                  placeholder="Buscar por título, ubicación u organizador..."
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
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader field="date">Fecha y Hora</SortableHeader>
                    <TableHead>Título</TableHead>
                    <SortableHeader field="location">Ubicación</SortableHeader>
                    <SortableHeader field="organizer">Organizador</SortableHeader>
                    <SortableHeader field="capacity">Capacidad</SortableHeader>
                    <SortableHeader field="status">Estado</SortableHeader>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {searchTerm || filterStatus !== 'all' 
                          ? 'No se encontraron eventos con los filtros aplicados' 
                          : 'No hay eventos creados aún'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedEvents.map((event) => (
                      <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={() => handleViewEvent(event)}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {formatDate(event.scheduledDate)}
                            </span>
                            <span className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {event.startTime}
                              {event.endTime && ` - ${event.endTime}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell onClick={() => handleViewEvent(event)}>
                          <div className="font-medium">{event.title}</div>
                        </TableCell>
                        <TableCell onClick={() => handleViewEvent(event)}>
                          {event.location ? (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {event.location}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell onClick={() => handleViewEvent(event)}>
                          {event.organizerUser.fullName || event.organizerUser.email}
                        </TableCell>
                        <TableCell onClick={() => handleViewEvent(event)}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className={event.maxCapacity && event.currentCapacity >= event.maxCapacity ? 'text-red-600 font-semibold' : ''}>
                              {event.currentCapacity}
                              {event.maxCapacity ? `/${event.maxCapacity}` : ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell onClick={() => handleViewEvent(event)}>
                          {getStatusBadge(event.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewEvent(event)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditEvent(event)
                              }}
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
              ¿Estás seguro de que deseas eliminar el evento "{eventToDelete?.title}"?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}