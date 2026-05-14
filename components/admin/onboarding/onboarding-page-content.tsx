// components/admin/onboarding/onboarding-page-content.tsx

"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  MapPin,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Loader2,
  UserPlus,
  ArrowUpDown,
  CalendarIcon,
  History,
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

type SortField = 'date' | 'location' | 'capacity' | 'status'
type SortDirection = 'asc' | 'desc'

interface OnboardingPageContentProps {
  initialEvents: OnboardingEventWithRelations[]
  currentStatus?: string
  /** Cuando se renderiza dentro de tabs, ocultamos AdminHeader, container y
   *  el título h1 — ese chrome lo provee la página padre. */
  hideOuterChrome?: boolean
}

export function OnboardingPageContent({
  initialEvents,
  currentStatus,
  hideOuterChrome = false,
}: OnboardingPageContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // State
  const [events, setEvents] = useState<OnboardingEventWithRelations[]>(initialEvents)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [activeQuickFilter, setActiveQuickFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  
  // Modals
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventToEdit, setEventToEdit] = useState<OnboardingEventWithRelations | null>(null)
  const [eventToDelete, setEventToDelete] = useState<OnboardingEventWithRelations | null>(null)

  // Sync with initial data
  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  // Get next upcoming event
  const getNextEvent = () => {
    const now = new Date()
    const upcomingEvents = events
      .filter(event => {
        const eventDate = new Date(event.scheduledDate)
        return eventDate >= now && event.status === 'SCHEDULED'
      })
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    
    return upcomingEvents[0] || null
  }

  const nextEvent = getNextEvent()

  // Filtering and Sorting
  const filteredAndSortedEvents = events
    .filter(event => {
      // Date filtering basado en activeQuickFilter
      let matchesDate = true
      const eventDate = new Date(event.scheduledDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      switch (activeQuickFilter) {
        case "upcoming":
          // Eventos desde hoy en adelante
          matchesDate = eventDate >= today
          break
        case "past":
          // Eventos anteriores a hoy
          matchesDate = eventDate < today
          break
        case "all":
          matchesDate = true
          break
      }
      
      return matchesDate
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'date':
          // Combinar fecha y hora de inicio para ordenamiento preciso
          const dateA = new Date(a.scheduledDate)
          const dateB = new Date(b.scheduledDate)
          
          // Comparar primero por fecha
          const dateComparison = dateA.getTime() - dateB.getTime()
          
          // Si son del mismo día, comparar por hora de inicio
          if (dateComparison === 0 && a.startTime && b.startTime) {
            const timeA = a.startTime.split(':').map(Number) // ["09", "00"] -> [9, 0]
            const timeB = b.startTime.split(':').map(Number)
            const minutesA = timeA[0] * 60 + (timeA[1] || 0)
            const minutesB = timeB[0] * 60 + (timeB[1] || 0)
            comparison = minutesA - minutesB
          } else {
            comparison = dateComparison
          }
          break
        case 'location':
          comparison = (a.location || '').localeCompare(b.location || '')
          break
        case 'capacity':
          comparison = (a.currentCapacity || 0) - (b.currentCapacity || 0)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }
      
      // Ordenamiento inteligente por fecha:
      // - Para "Próximos": ascendente (más próximo primero, más temprano primero si mismo día)
      // - Para "Pasados": descendente (más reciente primero, más tarde primero si mismo día)
      // - Para "Todos": ascendente (más próximo primero, más temprano primero si mismo día)
      if (sortField === 'date') {
        if (activeQuickFilter === 'past') {
          // Para pasados, invertir el orden (más reciente primero)
          return sortDirection === 'asc' ? -comparison : comparison
        } else {
          // Para próximos y todos, orden normal (más próximo primero, más temprano primero)
          return sortDirection === 'asc' ? comparison : -comparison
        }
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer select-none hover:bg-muted/50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {children}
        <ArrowUpDown className="h-4 w-4" />
      </div>
    </TableHead>
  )

  // Event Handlers
  const handleCreateEvent = () => {
    setEventToEdit(null)
    setShowEventForm(true)
  }

  const handleEditEvent = (event: OnboardingEventWithRelations) => {
    setEventToEdit(event)
    setShowEventForm(true)
  }

  const handleSaveEvent = (data: any) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      startTransition(async () => {
        try {
          if (eventToEdit) {
            const result = await updateOnboardingEvent(eventToEdit.id, data)
            
            if (result.success && result.event) {
              setEvents(prev => prev.map(e => e.id === eventToEdit.id ? result.event! : e))
              toast.success(result.message || 'Evento actualizado')
              setShowEventForm(false)
              router.refresh()
              resolve({ success: true })
            } else {
              toast.error(result.error || 'Error al actualizar')
              resolve({ success: false, error: result.error })
            }
          } else {
            const result = await createOnboardingEvent(data)
            
            if (result.success && result.event) {
              setEvents(prev => [...prev, result.event!])
              toast.success(result.message || 'Evento creado')
              setShowEventForm(false)
              router.refresh()
              resolve({ success: true })
            } else {
              toast.error(result.error || 'Error al crear')
              resolve({ success: false, error: result.error })
            }
          }
        } catch (error: any) {
          toast.error(error.message || 'Error al guardar evento')
          resolve({ success: false, error: error.message })
        }
      })
    })
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

  // Formatting helpers
  const formatDate = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return date.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getStatusBadge = (event: OnboardingEventWithRelations) => {
    const now = new Date()
    const eventDate = new Date(event.scheduledDate)
    
    // Si el evento tiene hora de inicio, combinarla con la fecha para comparación precisa
    let eventDateTime = eventDate
    if (event.startTime) {
      const [hours, minutes] = event.startTime.split(':').map(Number)
      eventDateTime = new Date(eventDate)
      eventDateTime.setHours(hours, minutes || 0, 0, 0)
    }
    
    // Detectar si el evento ya pasó
    const isPast = eventDateTime < now
    
    // Si el evento está SCHEDULED pero ya pasó, mostrar como "Pasado"
    const displayStatus = (event.status === 'SCHEDULED' && isPast) ? 'PAST' : event.status
    
    const config: Record<OnboardingEventStatus | 'PAST', { className: string; icon: React.ReactNode; label: string }> = {
      DRAFT: { 
        className: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <Edit className="h-3 w-3" />,
        label: getEventStatusLabel('DRAFT')
      },
      SCHEDULED: { 
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Calendar className="h-3 w-3" />,
        label: getEventStatusLabel('SCHEDULED')
      },
      IN_PROGRESS: { 
        className: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: <Clock className="h-3 w-3" />,
        label: getEventStatusLabel('IN_PROGRESS')
      },
      COMPLETED: { 
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="h-3 w-3" />,
        label: getEventStatusLabel('COMPLETED')
      },
      CANCELLED: { 
        className: 'bg-red-100 text-red-800 border-red-200',
        icon: <XCircle className="h-3 w-3" />,
        label: getEventStatusLabel('CANCELLED')
      },
      POSTPONED: { 
        className: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <Clock className="h-3 w-3" />,
        label: getEventStatusLabel('POSTPONED')
      },
      PAST: {
        className: 'bg-gray-100 text-gray-600 border-gray-300',
        icon: <History className="h-3 w-3" />,
        label: 'Pasado'
      },
    }

    const { className, icon, label } = config[displayStatus]

    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        {icon}
        {label}
      </Badge>
    )
  }

  const Outer = hideOuterChrome
    ? ({ children }: { children: React.ReactNode }) => <>{children}</>
    : ({ children }: { children: React.ReactNode }) => (
        <div className="flex flex-1 flex-col container mx-auto">{children}</div>
      )

  const Inner = hideOuterChrome
    ? ({ children }: { children: React.ReactNode }) => (
        <div className="space-y-6">{children}</div>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <div className="flex-1 p-8 space-y-8">{children}</div>
      )

  return (
    <Outer>
      {!hideOuterChrome && (
        <AdminHeader breadcrumbs={[{ label: 'On Boarding' }]} />
      )}

      <Inner>
        {/* Header — dentro de tabs solo dejamos la acción a la derecha */}
        {hideOuterChrome ? (
          <div className="flex justify-end">
            <Button className="gap-2 cursor-pointer" onClick={handleCreateEvent}>
              <Plus className="h-4 w-4" />
              Nueva Sesión
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">On Boarding</h1>
              <p className="text-muted-foreground mt-1">
                Gestiona las sesiones de incorporación de nuevos drivers
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Button className="gap-2 md:mt-0 cursor-pointer" onClick={handleCreateEvent}>
                <Plus className="h-4 w-4" />
                Nueva Sesión
              </Button>
            </motion.div>
          </div>
        )}

        {/* Next Event Card */}
        {nextEvent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                        Próximo Evento
                      </h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium text-foreground">
                          {formatDate(nextEvent.scheduledDate)}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <Clock className="h-4 w-4" />
                        <span>
                          {nextEvent.startTime}
                          {nextEvent.endTime && ` - ${nextEvent.endTime}`}
                        </span>
                      </div>
                      {nextEvent.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{nextEvent.location}</span>
                          {nextEvent.locationAddress && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-xs">{nextEvent.locationAddress}</span>
                            </>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {nextEvent.currentCapacity || 0} / {nextEvent.maxCapacity || '∞'} drivers registrados
                        </span>
                        {nextEvent.currentCapacity === nextEvent.maxCapacity && (
                          <Badge variant="destructive" className="text-xs">
                            Cupo lleno
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleViewEvent(nextEvent)}
                      className="cursor-pointer"
                    >
                      Ver Detalles
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/admin/onboarding/${nextEvent.id}`)}
                      className="cursor-pointer"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Agregar Drivers
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
          <CardHeader>
            <CardTitle>Eventos de On Boarding</CardTitle>
            <CardDescription>
              Visualiza y gestiona todos los eventos programados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Quick Filters Tabs */}
              <div className="relative">
                <div className="flex flex-wrap items-end gap-1 pb-0">
                  <button
                    onClick={() => setActiveQuickFilter('upcoming')}
                    disabled={isPending}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border border-b-0 transition-all text-xs
                      cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed
                      ${activeQuickFilter === 'upcoming'
                        ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                        : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                      }`}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Próximos</span>
                    <span className="sm:hidden">Próx.</span>
                  </button>
                  <button
                    onClick={() => setActiveQuickFilter('past')}
                    disabled={isPending}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border border-b-0 transition-all text-xs
                      whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                      ${activeQuickFilter === 'past'
                        ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                        : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                      }`}
                  >
                    <History className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Pasados</span>
                    <span className="sm:hidden">Pas.</span>
                  </button>
                  <button
                    onClick={() => setActiveQuickFilter('all')}
                    disabled={isPending}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border border-b-0 transition-all text-xs
                      whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                      ${activeQuickFilter === 'all'
                        ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                        : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                      }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Todos</span>
                    <span className="sm:hidden">Todos</span>
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Events Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className={`p-0 ${activeQuickFilter !== 'all' ? 'rounded-t-none' : ''}`}>
          <CardContent className="p-0">
            {isPending ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader >
                  <TableRow className="bg-muted/90">
                    <SortableHeader field="date">Fecha y Hora</SortableHeader>
                    <SortableHeader field="location">Ubicación</SortableHeader>
                    <SortableHeader field="capacity">Capacidad</SortableHeader>
                    <SortableHeader field="status">Estado</SortableHeader>
                    <TableHead className="text-right pr-6">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {filteredAndSortedEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          {activeQuickFilter !== 'all'
                            ? 'No se encontraron eventos con los filtros aplicados'
                            : 'No hay eventos creados. Crea tu primer evento de on boarding.'
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedEvents.map((event, index) => (
                        <motion.tr
                          key={event.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ 
                            duration: 0.2, 
                            delay: index * 0.03,
                            ease: "easeOut" 
                          }}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleViewEvent(event)}
                        >
                        {/* Fecha y Hora */}
                        <TableCell 
                          onClick={() => handleViewEvent(event)}
                          className="font-medium"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div>{formatDate(event.scheduledDate)}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {event.startTime}
                                {event.endTime && ` - ${event.endTime}`}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Ubicación */}
                        <TableCell 
                          onClick={() => handleViewEvent(event)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="line-clamp-1">
                              {event.location || '-'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Capacidad */}
                        <TableCell 
                          onClick={() => handleViewEvent(event)}
                          className="cursor-pointer"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {event.currentCapacity || 0}
                                {event.maxCapacity && `/${event.maxCapacity}`}
                              </span>
                              {event.currentCapacity === event.maxCapacity && (
                                <Badge variant="destructive" className="text-xs">
                                  Lleno
                                </Badge>
                              )}
                            </div>
                            {event.maxCapacity && (
                              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${
                                    event.currentCapacity / event.maxCapacity >= 1
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
                            )}
                          </div>
                        </TableCell>

                        {/* Estado */}
                        <TableCell 
                          onClick={() => handleViewEvent(event)}
                          className="cursor-pointer"
                        >
                          {getStatusBadge(event)}
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer"
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
                              className="h-8 w-8 cursor-pointer"
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
                              className="h-8 w-8 cursor-pointer"
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
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
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
                      </motion.tr>
                    ))
                  )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        </motion.div>
      </Inner>

      {/* Event Form Dialog */}
      <EventFormDialog
        open={showEventForm}
        onOpenChange={setShowEventForm}
        event={eventToEdit}
        onSave={handleSaveEvent}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El evento y todos sus datos asociados serán eliminados permanentemente.
              {eventToDelete && eventToDelete.currentCapacity > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ Este evento tiene {eventToDelete.currentCapacity} driver(s) registrado(s)
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Outer>
  )
}