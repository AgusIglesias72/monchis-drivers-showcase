// components/admin/onboarding/onboarding-page-content.tsx

"use client"

import { Fragment, useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
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
  MoreHorizontal,
  Video,
  Zap,
  Settings2,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  StickyNote,
  Bell,
  Link as LinkIcon,
  User,
  UserCheck,
  ShieldCheck,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AdminHeader } from "@/components/admin/admin-header"
import { EventFormDialog } from "@/components/admin/onboarding/event-form-dialog"
import {
  createOnboardingEvent,
  updateOnboardingEvent,
  deleteOnboardingEvent
} from "@/lib/actions/onboarding.actions"
import { getEventStatusLabel } from "@/types/onboarding"
import { MODALITY_LABEL } from "@/lib/types/onboarding-rules.types"
import { toast } from "sonner"
import type { OnboardingEventStatus, OnboardingEventWithRelations } from "@/types/onboarding"
import type { OnboardingModality } from "@prisma/client"

const MODALITY_ICON = {
  IN_PERSON: MapPin,
  VIRTUAL: Video,
  HYBRID: Zap,
} as const

const MODALITY_BADGE_CLASS: Record<OnboardingModality, string> = {
  IN_PERSON: 'bg-muted text-foreground',
  VIRTUAL: 'bg-info-soft text-info',
  HYBRID: 'bg-violet-100 text-violet-700',
}

const ATTENDEE_STATUS_LABEL: Record<string, string> = {
  INVITED: 'Invitado',
  CONFIRMED: 'Confirmado',
  ATTENDED: 'Asistió',
  SCHEDULED: 'Agendado',
  NO_SHOW: 'No se presentó',
  CANCELLED: 'Cancelado',
  RESCHEDULED: 'Reagendado',
}

const ATTENDEE_STATUS_BADGE: Record<string, string> = {
  INVITED: 'bg-muted text-muted-foreground',
  CONFIRMED: 'bg-info-soft text-info',
  ATTENDED: 'bg-green-100 text-green-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  NO_SHOW: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RESCHEDULED: 'bg-purple-100 text-purple-700',
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '–'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

// Devuelve solo el primer nombre, capitalizado.
// Fallback: parte local del email (antes del primer "." o "@").
function getFirstName(user: { fullName?: string | null; email?: string | null } | null | undefined): string {
  if (!user) return 'Admin'
  if (user.fullName) {
    const first = user.fullName.trim().split(/\s+/)[0] || ''
    if (first) return capitalize(first)
  }
  if (user.email) {
    const local = user.email.split('@')[0] || ''
    const part = local.split('.')[0] || local
    if (part) return capitalize(part)
  }
  return 'Admin'
}

// Cuándo termina (o empieza, si no hay endTime) un evento.
// Lo usamos para decidir si un evento sigue siendo "próximo" comparando con NOW.
function getEventCutoff(event: { scheduledDate: Date | string; startTime: string | null; endTime: string | null }): Date {
  const cutoff = new Date(event.scheduledDate)
  const timeStr = event.endTime || event.startTime
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number)
    cutoff.setHours(h, m || 0, 0, 0)
  } else {
    cutoff.setHours(23, 59, 59, 999)
  }
  return cutoff
}

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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      // Comportamiento accordion: solo una fila abierta a la vez.
      if (prev.has(id)) return new Set()
      return new Set([id])
    })
  }

  // Counts para los filtros (Próximos / Pasados / Todos) — usa la misma lógica
  // tiempo-aware que el filtro de la tabla.
  const filterCounts = (() => {
    const now = new Date()
    let upcoming = 0
    let past = 0
    for (const e of events) {
      if (getEventCutoff(e) >= now) upcoming++
      else past++
    }
    return { upcoming, past, all: events.length }
  })()
  
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
      // "Próximos" = eventos que aún no terminaron (comparación con hora real).
      // "Pasados"  = el resto.
      const now = new Date()
      const cutoff = getEventCutoff(event)

      switch (activeQuickFilter) {
        case "upcoming":
          return cutoff >= now
        case "past":
          return cutoff < now
        case "all":
        default:
          return true
      }
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

  // Paginación client-side: el dataset ya está en memoria, solo cortamos.
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedEvents.length / PAGE_SIZE))

  // Reset de página cuando cambian filtro/orden o cuando se reduce el total.
  useEffect(() => {
    setPage(1)
  }, [activeQuickFilter, sortField, sortDirection])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  const paginatedEvents = filteredAndSortedEvents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )
  const from = filteredAndSortedEvents.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, filteredAndSortedEvents.length)

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

  const formatDayNum = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return date.toLocaleDateString('es-PY', { day: '2-digit' })
  }

  const formatMonthShort = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return date.toLocaleDateString('es-PY', { month: 'short' }).replace('.', '').toUpperCase()
  }

  const formatWeekdayLong = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    const wd = date.toLocaleDateString('es-PY', { weekday: 'long' })
    return wd.charAt(0).toUpperCase() + wd.slice(1)
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

  const innerClass = hideOuterChrome ? 'space-y-6' : 'flex-1 p-8 space-y-8'

  const content = (
    <>
      {!hideOuterChrome && (
        <AdminHeader breadcrumbs={[{ label: 'On Boarding' }]} />
      )}

      <div className={innerClass}>
        {/* Header — dentro de tabs alineamos con el patrón de Capacitaciones */}
        {hideOuterChrome ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Sesiones generadas a partir de las capacitaciones o creadas manualmente.
            </p>
            <Button
              onClick={handleCreateEvent}
              className="bg-brand text-brand-foreground hover:bg-brand-hover cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva sesión
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
              <Button
                onClick={handleCreateEvent}
                className="bg-brand text-brand-foreground hover:bg-brand-hover md:mt-0 cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva sesión
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

        {/* Events Card — header + filtros + tabla en un solo bloque */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Eventos de On Boarding</CardTitle>
                <CardDescription>
                  Visualiza y gestiona todos los eventos programados
                </CardDescription>
              </div>

              {/* Segmented control: Próximos / Pasados / Todos */}
              <div
                role="tablist"
                aria-label="Filtrar eventos"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground"
              >
                {([
                  { key: 'upcoming', label: 'Próximos', short: 'Próx.', icon: CalendarIcon, count: filterCounts.upcoming },
                  { key: 'past', label: 'Pasados', short: 'Pas.', icon: History, count: filterCounts.past },
                  { key: 'all', label: 'Todos', short: 'Todos', icon: Calendar, count: filterCounts.all },
                ] as const).map(({ key, label, short, icon: Icon, count }) => {
                  const active = activeQuickFilter === key
                  return (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveQuickFilter(key)}
                      disabled={isPending}
                      className={`inline-flex h-[calc(100%-1px)] items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium whitespace-nowrap transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        active
                          ? 'bg-background text-foreground shadow-sm'
                          : 'hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">{short}</span>
                      <span
                        className={`tabular-nums text-[10px] rounded px-1.5 py-0.5 ${
                          active ? 'bg-muted text-muted-foreground' : 'bg-background/60'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardHeader>
            <CardContent className="p-0">
            {isPending ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/90 hover:bg-muted/90">
                    <TableHead className="w-10"></TableHead>
                    <SortableHeader field="date">Fecha y Hora</SortableHeader>
                    <TableHead>Modalidad</TableHead>
                    <SortableHeader field="location">Ubicación</SortableHeader>
                    <SortableHeader field="capacity">Cupo</SortableHeader>
                    <SortableHeader field="status">Estado</SortableHeader>
                    <TableHead className="text-right w-[140px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredAndSortedEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          {activeQuickFilter !== 'all'
                            ? 'No se encontraron eventos con los filtros aplicados'
                            : 'No hay eventos creados. Crea tu primer evento de on boarding.'
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedEvents.map((event) => {
                        const modality = event.modality || event.scheduleRule?.modality || null
                        const ModalityIcon = modality ? MODALITY_ICON[modality] : null
                        const rule = event.scheduleRule
                        const isFull =
                          event.maxCapacity !== null &&
                          event.maxCapacity !== undefined &&
                          event.currentCapacity >= event.maxCapacity
                        const expanded = expandedIds.has(event.id)

                        // Desglose de asistentes
                        const attendees = event.attendees || []
                        const attendeesByStatus = attendees.reduce<Record<string, number>>((acc, a) => {
                          acc[a.status] = (acc[a.status] || 0) + 1
                          return acc
                        }, {})

                        return (
                          <Fragment key={event.id}>
                            <tr
                              className={`cursor-pointer border-b transition-colors hover:bg-muted/50 ${expanded ? 'bg-muted/30' : ''}`}
                              onClick={() => toggleExpanded(event.id)}
                              aria-expanded={expanded}
                            >
                              {/* Chevron */}
                              <TableCell className="pr-0 align-middle">
                                <span
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-transform duration-150 ${expanded ? 'rotate-90 text-foreground' : ''}`}
                                  aria-hidden
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </span>
                              </TableCell>

                              {/* Fecha y Hora — tile + detalle + capacitación */}
                              <TableCell className="font-medium align-middle">
                                <div className="flex items-center gap-3">
                                  {/* Tile calendario */}
                                  <div className="flex h-12 w-12 flex-shrink-0 flex-col rounded-md border bg-background overflow-hidden">
                                    <div className="bg-muted text-[9px] font-semibold uppercase tracking-wide text-muted-foreground text-center leading-[14px]">
                                      {formatMonthShort(event.scheduledDate)}
                                    </div>
                                    <div className="flex-1 flex items-center justify-center text-base font-bold leading-none">
                                      {formatDayNum(event.scheduledDate)}
                                    </div>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-foreground">
                                      {formatWeekdayLong(event.scheduledDate)}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                      <span>{formatDate(event.scheduledDate)}</span>
                                      <span className="text-muted-foreground/50">·</span>
                                      <Clock className="h-3 w-3" />
                                      <span className="tabular-nums">
                                        {event.startTime}
                                        {event.endTime && ` – ${event.endTime}`}
                                      </span>
                                    </div>
                                    {rule ? (
                                      <Link
                                        href={`/admin/onboarding/reglas/${rule.slug}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-block mt-1.5"
                                      >
                                        <Badge
                                          variant="secondary"
                                          className="bg-info-soft text-info hover:opacity-90 gap-1 max-w-[220px]"
                                        >
                                          <Settings2 className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">{rule.title}</span>
                                        </Badge>
                                      </Link>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="mt-1.5 text-[10px] text-muted-foreground"
                                      >
                                        Manual
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>

                              {/* Modalidad */}
                              <TableCell>
                                {modality && ModalityIcon ? (
                                  <Badge className={MODALITY_BADGE_CLASS[modality]} variant="secondary">
                                    <ModalityIcon className="mr-1 h-3 w-3" />
                                    {MODALITY_LABEL[modality]}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>

                              {/* Ubicación */}
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="line-clamp-1">
                                    {event.location || '-'}
                                  </span>
                                </div>
                              </TableCell>

                              {/* Cupo */}
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm">
                                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="font-medium tabular-nums">
                                    {event.currentCapacity || 0}
                                    {event.maxCapacity ? `/${event.maxCapacity}` : ''}
                                  </span>
                                  {isFull && (
                                    <Badge variant="destructive" className="text-[10px]">
                                      Lleno
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>

                              {/* Estado */}
                              <TableCell>{getStatusBadge(event)}</TableCell>

                              {/* Acciones */}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewEvent(event)}
                                    className="h-8 cursor-pointer gap-1 text-brand hover:text-brand hover:bg-brand-soft"
                                  >
                                    Ingresar
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                  </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="cursor-pointer">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleViewEvent(event)}
                                      className="cursor-pointer"
                                    >
                                      <Eye className="h-4 w-4" />
                                      Ver detalles
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => router.push(`/admin/onboarding/${event.id}`)}
                                      className="cursor-pointer"
                                    >
                                      <UserPlus className="h-4 w-4" />
                                      Agregar drivers
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleEditEvent(event)}
                                      className="cursor-pointer"
                                    >
                                      <Edit className="h-4 w-4" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setEventToDelete(event)}
                                      className="cursor-pointer text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                </div>
                              </TableCell>
                            </tr>

                            {/* Fila expandida con detalle */}
                            {expanded && (
                              <tr className="bg-muted/20 border-b">
                                <td colSpan={7} className="p-0">
                                  <div className="px-6 py-4 border-t border-border/60">
                                    {/* Título + descripción (si existen) */}
                                    {(event.title || event.description) && (
                                      <div className="mb-3 pb-3 border-b border-border/40">
                                        {event.title && (
                                          <div className="text-sm font-semibold text-foreground">{event.title}</div>
                                        )}
                                        {event.description && (
                                          <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-0.5">
                                            {event.description}
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {/* Layout: 1/3 datos del evento, 2/3 invitados */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                                      {/* Col 1: definition list compacta */}
                                      <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-xs self-start">
                                        {event.locationAddress && (
                                          <>
                                            <dt className="text-muted-foreground inline-flex items-center gap-1.5">
                                              <MapPin className="h-3 w-3" /> Dirección
                                            </dt>
                                            <dd className="text-foreground">{event.locationAddress}</dd>
                                          </>
                                        )}

                                        {event.meetingLink && (
                                          <>
                                            <dt className="text-muted-foreground inline-flex items-center gap-1.5">
                                              <LinkIcon className="h-3 w-3" /> Enlace
                                            </dt>
                                            <dd className="min-w-0">
                                              <a
                                                href={event.meetingLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-info hover:underline break-all"
                                              >
                                                {event.meetingLink}
                                              </a>
                                            </dd>
                                          </>
                                        )}

                                        {event.organizerUser && (
                                          <>
                                            <dt className="text-muted-foreground inline-flex items-center gap-1.5">
                                              <User className="h-3 w-3" /> Organizador
                                            </dt>
                                            <dd className="text-foreground">
                                              {event.organizerUser.fullName || event.organizerUser.email}
                                              {event.organizerUser.fullName && event.organizerUser.email && (
                                                <span className="text-muted-foreground"> · {event.organizerUser.email}</span>
                                              )}
                                            </dd>
                                          </>
                                        )}

                                        <dt className="text-muted-foreground inline-flex items-center gap-1.5">
                                          <Bell className="h-3 w-3" /> Recordatorio
                                        </dt>
                                        <dd className="text-foreground">
                                          {event.reminderHoursBefore}h antes
                                          <span className="text-muted-foreground"> · </span>
                                          {event.reminderSent ? (
                                            <span className="text-success inline-flex items-center gap-1">
                                              <CheckCircle className="h-3 w-3" /> Enviado
                                            </span>
                                          ) : (
                                            <span className="text-muted-foreground">Pendiente</span>
                                          )}
                                        </dd>

                                        {event.notes && (
                                          <>
                                            <dt className="text-muted-foreground inline-flex items-start gap-1.5 pt-0.5">
                                              <StickyNote className="h-3 w-3 mt-0.5" /> Notas
                                            </dt>
                                            <dd className="text-foreground whitespace-pre-wrap">{event.notes}</dd>
                                          </>
                                        )}
                                      </dl>

                                      {/* Col 2 (span 2 = 2/3 ancho): invitados con resumen + preview */}
                                      {attendees.length > 0 && (
                                        <div className="text-xs self-start min-w-0 md:col-span-2">
                                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                            <span className="text-muted-foreground inline-flex items-center gap-1.5 mr-1">
                                              <Users className="h-3 w-3" /> Invitados
                                              <span className="tabular-nums">({attendees.length})</span>
                                            </span>
                                            {Object.entries(attendeesByStatus).map(([status, count]) => (
                                              <Badge
                                                key={status}
                                                variant="secondary"
                                                className={`text-[10px] font-normal px-1.5 py-0 ${ATTENDEE_STATUS_BADGE[status] || ''}`}
                                              >
                                                {ATTENDEE_STATUS_LABEL[status] || status}
                                                <span className="ml-1 tabular-nums font-semibold">{count}</span>
                                              </Badge>
                                            ))}
                                          </div>
                                          {(() => {
                                            const limit = 10
                                            const visible = attendees.slice(0, limit)
                                            const extra = attendees.length - visible.length
                                            return (
                                              <>
                                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                                  {visible.map((a) => {
                                                    const fd = a.formDriver
                                                    const displayName =
                                                      fd?.fullName ||
                                                      [fd?.firstName, fd?.lastName].filter(Boolean).join(' ') ||
                                                      fd?.email ||
                                                      fd?.phoneNumber ||
                                                      '—'
                                                    const initials = getInitials(displayName)
                                                    const isSelfServed = !a.invitedBy
                                                    const assignerFirstName = getFirstName(a.invitedByUser)
                                                    return (
                                                      <li
                                                        key={a.id}
                                                        className="flex items-center gap-2 px-2 py-1.5 border border-border/40 rounded-md bg-background/60 min-w-0"
                                                      >
                                                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase text-muted-foreground">
                                                          {initials}
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                          <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="truncate text-xs text-foreground capitalize">{displayName}</span>
                                                            {isSelfServed ? (
                                                              <span
                                                                title="El driver se agendó por sí mismo desde el flow público"
                                                                className="inline-flex items-center gap-0.5 flex-shrink-0 text-[10px] font-medium text-info"
                                                              >
                                                                <UserCheck className="h-2.5 w-2.5" /> Usuario
                                                              </span>
                                                            ) : (
                                                              <span
                                                                title={`Asignado por ${a.invitedByUser?.fullName || a.invitedByUser?.email || 'admin'}`}
                                                                className="inline-flex items-center gap-0.5 flex-shrink-0 text-[10px] font-medium text-muted-foreground capitalize"
                                                              >
                                                                <ShieldCheck className="h-2.5 w-2.5 flex-shrink-0" />
                                                                {assignerFirstName}
                                                              </span>
                                                            )}
                                                          </div>
                                                          {fd?.phoneNumber && (
                                                            <div className="truncate text-[10px] text-muted-foreground">
                                                              {fd.phoneNumber}
                                                            </div>
                                                          )}
                                                        </div>
                                                        <Badge
                                                          variant="secondary"
                                                          className={`text-[9px] font-normal px-1.5 py-0 flex-shrink-0 ${ATTENDEE_STATUS_BADGE[a.status] || ''}`}
                                                        >
                                                          {ATTENDEE_STATUS_LABEL[a.status] || a.status}
                                                        </Badge>
                                                      </li>
                                                    )
                                                  })}
                                                </ul>
                                                {extra > 0 && (
                                                  <div className="mt-1.5 px-2 py-1 text-[10px] text-muted-foreground text-center bg-muted/30 rounded">
                                                    + {extra} más
                                                  </div>
                                                )}
                                              </>
                                            )
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              )}
                          </Fragment>
                        )
                      })
                    )}
                </TableBody>
              </Table>
            )}

            {/* Paginación */}
            {filteredAndSortedEvents.length > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs">
                <span className="text-muted-foreground tabular-nums">
                  Mostrando <span className="font-medium text-foreground">{from}–{to}</span> de{' '}
                  <span className="font-medium text-foreground">{filteredAndSortedEvents.length}</span>
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 cursor-pointer"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-2 tabular-nums text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 cursor-pointer"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Página siguiente"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </motion.div>
      </div>

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
    </>
  )

  return hideOuterChrome ? (
    content
  ) : (
    <div className="flex flex-1 flex-col container mx-auto">{content}</div>
  )
}