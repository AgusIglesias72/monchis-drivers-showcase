// components/admin/onboarding/add-drivers-section-client.tsx
// Este es el Client Component que recibe datos iniciales del servidor

"use client"

import { useState, useEffect, useTransition, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Loader2, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ExternalLink,
  Clock,
  XCircle,
  Eye,
  CalendarIcon,
  FileCheck,
  UserCheck,
  List
} from 'lucide-react'
import { getEligibleDrivers, assignDriversToEvent } from '@/lib/actions/onboarding.actions'
import { toast } from 'sonner'
import { DriverManagementSheet } from '@/components/admin/onboarding/driver-management-sheet'

interface Driver {
  id: string
  fullName: string | null
  phoneNumber: string
  email: string | null
  cedula: string
  documentsStatus: string
  onboardingStatus: string | null
  onboardingScheduledAt: string | null
  status: string
  createdAt: string
  lastActivityAt: string | null
  isAssignedToOtherEvent: boolean
  canBeSelected: boolean
  disabledReason: string | null
  assignedEvent: {
    id: string
    title: string | null
    scheduledDate: string
  } | null
}

interface AddDriversSectionClientProps {
  eventId: string
  initialDrivers: Driver[]
  initialPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
  onSuccess: () => void
}

export function AddDriversSectionClient({ 
  eventId, 
  initialDrivers,
  initialPagination,
  onSuccess 
}: AddDriversSectionClientProps) {
  const [isPending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([])
  const [selectedDriverForDetails, setSelectedDriverForDetails] = useState<string | null>(null)
  
  // Todos los drivers del servidor - cargar todos
  const [allDrivers, setAllDrivers] = useState<Driver[]>(initialDrivers)
  const [loadingAll, setLoadingAll] = useState(false)
  const [totalDrivers, setTotalDrivers] = useState(initialPagination.total)
  const hasLoadedAllRef = useRef(false)
  
  // Paginación del lado del cliente
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Filtros y ordenamiento
  const [activeQuickFilter, setActiveQuickFilter] = useState<'all' | 'pending-schedule' | 'docs-approved' | 'no-onboarding' | 'ready-to-schedule'>('all')
  const [sortBy, setSortBy] = useState<{
    field: 'name' | 'documentsStatus' | 'status' | 'onboardingStatus' | 'createdAt' | null
    order: 'asc' | 'desc'
  }>({ field: null, order: 'asc' })

  // Filtrado y búsqueda del lado del cliente
  const filteredAndSortedDrivers = useMemo(() => {
    let result = [...allDrivers]

    // Búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(driver => 
        driver.fullName?.toLowerCase().includes(search) ||
        driver.phoneNumber?.includes(search) ||
        driver.email?.toLowerCase().includes(search) ||
        driver.cedula?.includes(search)
      )
    }

    // Filtros rápidos
    switch (activeQuickFilter) {
      case 'pending-schedule':
        // Pendientes de agendar: sin onboarding programado
        result = result.filter(d => !d.onboardingScheduledAt && !d.onboardingStatus)
        break
      case 'docs-approved':
        // Documentos aprobados
        result = result.filter(d => d.documentsStatus === 'APPROVED')
        break
      case 'no-onboarding':
        // Sin onboarding
        result = result.filter(d => !d.onboardingStatus)
        break
      case 'ready-to-schedule':
        // Listos para agendar: documentos aprobados y sin onboarding programado
        result = result.filter(d => 
          d.documentsStatus === 'APPROVED' && 
          !d.onboardingScheduledAt && 
          !d.onboardingStatus
        )
        break
      case 'all':
      default:
        // Todos - no filtrar
        break
    }


    // Ordenamiento
    if (sortBy.field) {
      result.sort((a, b) => {
        let aVal, bVal
        
        switch (sortBy.field) {
          case 'name':
            aVal = a.fullName || ''
            bVal = b.fullName || ''
            break
          case 'documentsStatus':
            aVal = a.documentsStatus
            bVal = b.documentsStatus
            break
          case 'status':
            aVal = a.status
            bVal = b.status
            break
          case 'onboardingStatus':
            aVal = a.onboardingStatus || ''
            bVal = b.onboardingStatus || ''
            break
          case 'createdAt':
            aVal = new Date(a.createdAt).getTime()
            bVal = new Date(b.createdAt).getTime()
            break
          default:
            return 0
        }
        
        if (aVal < bVal) return sortBy.order === 'asc' ? -1 : 1
        if (aVal > bVal) return sortBy.order === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [allDrivers, searchTerm, sortBy, activeQuickFilter])

  // Paginación del lado del cliente
  const totalFiltered = filteredAndSortedDrivers.length
  const totalPages = Math.ceil(totalFiltered / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDrivers = filteredAndSortedDrivers.slice(startIndex, endIndex)

  // Cargar todos los drivers al montar el componente
  useEffect(() => {
    // Resetear el ref cuando cambia el eventId
    hasLoadedAllRef.current = false

    let isMounted = true

    const loadAllDrivers = async () => {
      // Si ya tenemos todos los drivers, no cargar de nuevo
      if (allDrivers.length >= totalDrivers && totalDrivers > 0 && allDrivers.length > initialDrivers.length) {
        hasLoadedAllRef.current = true
        return
      }

      setLoadingAll(true)
      try {
        // Cargar todos los drivers en lotes
        const allDriversList: Driver[] = []
        let page = 1
        const limit = 100 // Cargar 100 a la vez
        let hasMore = true

        while (hasMore && isMounted) {
          const result = await getEligibleDrivers({
            eventId,
            page,
            limit,
          })

          if (result.success && result.drivers) {
            // Convertir fechas Date a string para compatibilidad con la interfaz Driver
            const serializedDrivers = result.drivers.map(driver => ({
              ...driver,
              onboardingScheduledAt: driver.onboardingScheduledAt instanceof Date 
                ? driver.onboardingScheduledAt.toISOString() 
                : driver.onboardingScheduledAt,
              createdAt: driver.createdAt instanceof Date 
                ? driver.createdAt.toISOString() 
                : driver.createdAt,
              lastActivityAt: driver.lastActivityAt instanceof Date 
                ? driver.lastActivityAt.toISOString() 
                : driver.lastActivityAt,
              completedAt: driver.completedAt instanceof Date 
                ? driver.completedAt.toISOString() 
                : driver.completedAt,
              assignedEvent: driver.assignedEvent ? {
                ...driver.assignedEvent,
                scheduledDate: driver.assignedEvent.scheduledDate instanceof Date
                  ? driver.assignedEvent.scheduledDate.toISOString()
                  : driver.assignedEvent.scheduledDate
              } : null
            }))
            allDriversList.push(...serializedDrivers)
            
            // Verificar si hay más páginas
            const totalPages = Math.ceil((result.pagination?.total || 0) / limit)
            hasMore = page < totalPages && result.drivers.length === limit
            
            if (page === 1 && isMounted) {
              setTotalDrivers(result.pagination?.total || 0)
            }
            
            page++
          } else {
            hasMore = false
          }
        }

        if (isMounted) {
          setAllDrivers(allDriversList)
          hasLoadedAllRef.current = true
        }
      } catch (error) {
        console.error('Error al cargar todos los drivers:', error)
        if (isMounted) {
          toast.error('Error al cargar drivers')
        }
      } finally {
        if (isMounted) {
          setLoadingAll(false)
        }
      }
    }

    loadAllDrivers()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]) // Solo ejecutar cuando cambie el eventId

  // Resetear página cuando cambian filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeQuickFilter])

  const handleToggleDriver = (driverId: string) => {
    if (selectedDriverIds.includes(driverId)) {
      setSelectedDriverIds(selectedDriverIds.filter(id => id !== driverId))
    } else {
      setSelectedDriverIds([...selectedDriverIds, driverId])
    }
  }

  const handleToggleAll = () => {
    if (selectedDriverIds.length === filteredAndSortedDrivers.length) {
      setSelectedDriverIds([])
    } else {
      setSelectedDriverIds(filteredAndSortedDrivers.filter(d => d.canBeSelected).map(d => d.id))
    }
  }

  const handleSubmit = async () => {
    if (selectedDriverIds.length === 0) return

    setSubmitting(true)
    try {
      const result = await assignDriversToEvent({
        eventId,
        formDriverIds: selectedDriverIds,
        attendeeNotes: ''
      })

      if (result.success) {
        toast.success(`${selectedDriverIds.length} driver(s) agregado(s) exitosamente`)
        setSelectedDriverIds([])
        // Recargar drivers para actualizar la lista
        hasLoadedAllRef.current = false
        setAllDrivers(initialDrivers) // Resetear a los iniciales
        // Recargar todos los drivers
        const loadAllDrivers = async () => {
          setLoadingAll(true)
          try {
            const allDriversList: Driver[] = []
            let page = 1
            const limit = 100
            let hasMore = true

            while (hasMore) {
              const result = await getEligibleDrivers({
                eventId,
                page,
                limit,
              })

              if (result.success && result.drivers) {
                // Convertir fechas Date a string para compatibilidad con la interfaz Driver
                const serializedDrivers = result.drivers.map(driver => ({
                  ...driver,
                  onboardingScheduledAt: driver.onboardingScheduledAt instanceof Date 
                    ? driver.onboardingScheduledAt.toISOString() 
                    : driver.onboardingScheduledAt,
                  createdAt: driver.createdAt instanceof Date 
                    ? driver.createdAt.toISOString() 
                    : driver.createdAt,
                  lastActivityAt: driver.lastActivityAt instanceof Date 
                    ? driver.lastActivityAt.toISOString() 
                    : driver.lastActivityAt,
                  completedAt: driver.completedAt instanceof Date 
                    ? driver.completedAt.toISOString() 
                    : driver.completedAt,
                  assignedEvent: driver.assignedEvent ? {
                    ...driver.assignedEvent,
                    scheduledDate: driver.assignedEvent.scheduledDate instanceof Date
                      ? driver.assignedEvent.scheduledDate.toISOString()
                      : driver.assignedEvent.scheduledDate
                  } : null
                }))
                allDriversList.push(...serializedDrivers)
                const totalPages = Math.ceil((result.pagination?.total || 0) / limit)
                hasMore = page < totalPages && result.drivers.length === limit
                if (page === 1) {
                  setTotalDrivers(result.pagination?.total || 0)
                }
                page++
              } else {
                hasMore = false
              }
            }

            setAllDrivers(allDriversList)
            hasLoadedAllRef.current = true
          } catch (error) {
            console.error('Error al recargar drivers:', error)
          } finally {
            setLoadingAll(false)
          }
        }
        loadAllDrivers()
        onSuccess()
      } else {
        toast.error(result.error || 'Error al agregar drivers')
      }
    } catch (error) {
      toast.error('Error al agregar drivers')
    } finally {
      setSubmitting(false)
    }
  }

  const getDocsStatusBadge = (status: string) => {
    if (!status) return (
      <Badge variant="outline" className="text-xs h-5 bg-gray-50 text-gray-700 border-gray-200">
        Sin documentos
      </Badge>
    )
    
    const config: Record<string, { label: string; className: string }> = {
      APPROVED: { label: 'Aprobados', className: 'bg-green-50 text-green-700 border-green-200' },
      PENDING: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
      IN_REVIEW: { label: 'En Revisión', className: 'bg-blue-50 text-blue-700 border-blue-200' },
      CORRECTIONS: { label: 'Correcciones', className: 'bg-orange-50 text-orange-700 border-orange-200' },
      INCOMPLETE: { label: 'Incompleto', className: 'bg-gray-50 text-gray-700 border-gray-200' },
      REJECTED: { label: 'Rechazado', className: 'bg-red-50 text-red-700 border-red-200' },
    }
    
    const statusConfig = config[status]
    if (!statusConfig) return (
      <Badge variant="outline" className="text-xs h-5 bg-gray-50 text-gray-700 border-gray-200">
        {status}
      </Badge>
    )
    
    return (
      <Badge variant="outline" className={`text-xs h-5 ${statusConfig.className}`}>
        {statusConfig.label}
      </Badge>
    )
  }

  const getApplicationStatusBadge = (status: string) => {
    if (!status) return (
      <Badge variant="outline" className="text-xs h-5 bg-gray-50 text-gray-700 border-gray-200">
        Sin estado
      </Badge>
    )
    
    const config: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
      UNDER_REVIEW: { label: 'En Revisión', className: 'bg-blue-50 text-blue-700 border-blue-200' },
      APPROVED: { label: 'Aprobado', className: 'bg-green-50 text-green-700 border-green-200' },
      REJECTED: { label: 'Rechazado', className: 'bg-red-50 text-red-700 border-red-200' },
      IN_PROGRESS: { label: 'En Progreso', className: 'bg-blue-50 text-blue-700 border-blue-200' },
      SUBMITTED: { label: 'Enviado', className: 'bg-purple-50 text-purple-700 border-purple-200' },
      ACTIVE: { label: 'Activo', className: 'bg-green-50 text-green-700 border-green-200' },
      COMPLETED: { label: 'Completado', className: 'bg-green-50 text-green-700 border-green-200' },
      INACTIVE: { label: 'Inactivo', className: 'bg-gray-50 text-gray-700 border-gray-200' },
    }
    
    const statusConfig = config[status]
    if (!statusConfig) return (
      <Badge variant="outline" className="text-xs h-5 bg-gray-50 text-gray-700 border-gray-200">
        {status}
      </Badge>
    )
    
    return (
      <Badge variant="outline" className={`text-xs h-5 ${statusConfig.className}`}>
        {statusConfig.label}
      </Badge>
    )
  }

  const getOnboardingStatusBadge = (status: string | null) => {
    if (!status) return (
      <Badge variant="outline" className="text-xs h-5 bg-gray-50 text-gray-700 border-gray-200">
        Sin onboarding
      </Badge>
    )
    
    const config: Record<string, { label: string; className: string }> = {
      SCHEDULED: { label: 'Programado', className: 'bg-blue-50 text-blue-700 border-blue-200' },
      IN_PROGRESS: { label: 'En Curso', className: 'bg-amber-50 text-amber-700 border-amber-200' },
      COMPLETED: { label: 'Completado', className: 'bg-green-50 text-green-700 border-green-200' },
      CANCELLED: { label: 'Cancelado', className: 'bg-red-50 text-red-700 border-red-200' },
      NO_SHOW: { label: 'No Asistió', className: 'bg-orange-50 text-orange-700 border-orange-200' },
    }
    
    const statusConfig = config[status]
    if (!statusConfig) return (
      <Badge variant="outline" className="text-xs h-5 bg-gray-50 text-gray-700 border-gray-200">
        {status}
      </Badge>
    )
    
    return (
      <Badge variant="outline" className={`text-xs h-5 ${statusConfig.className}`}>
        {statusConfig.label}
      </Badge>
    )
  }

  const loading = false // Ya no hay loading porque todo está en el cliente

  const handleSort = (field: typeof sortBy.field) => {
    setSortBy(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }))
  }

  const clearFilters = () => {
    setActiveQuickFilter('all')
    setSearchTerm('')
  }

  const getSortIcon = (field: typeof sortBy.field) => {
    if (sortBy.field !== field) return <ArrowUpDown className="h-3 w-3" />
    return sortBy.order === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  return (
    <div className="space-y-4">
      {/* Header con acción */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Agregar Participantes
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Selecciona los drivers que deseas agregar a este evento
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={submitting || selectedDriverIds.length === 0}
          size="lg"
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Agregar ({selectedDriverIds.length})
        </Button>
      </div>

      {/* Search y Filtros */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, cédula, teléfono o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            disabled={loading || submitting}
          />
        </div>

        {/* Filtros rápidos (solapas) */}
        <div className="relative">
          <div className="flex flex-wrap items-end gap-1 pb-0 relative z-10">
            <button
              onClick={() => setActiveQuickFilter('all')}
              disabled={loading || submitting}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border border-b-0 transition-all text-xs
                whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'all'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Todos</span>
              <span className="sm:hidden">Todos</span>
            </button>
            <button
              onClick={() => setActiveQuickFilter('pending-schedule')}
              disabled={loading || submitting}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border border-b-0 transition-all text-xs
                whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'pending-schedule'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pendientes de Agendar</span>
              <span className="sm:hidden">Pendientes</span>
            </button>
            <button
              onClick={() => setActiveQuickFilter('docs-approved')}
              disabled={loading || submitting}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border border-b-0 transition-all text-xs
                whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'docs-approved'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Docs Aprobados</span>
              <span className="sm:hidden">Docs OK</span>
            </button>
            <button
              onClick={() => setActiveQuickFilter('ready-to-schedule')}
              disabled={loading || submitting}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border border-b-0 transition-all text-xs
                whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'ready-to-schedule'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Listos para Agendar</span>
              <span className="sm:hidden">Listos</span>
            </button>
            <button
              onClick={() => setActiveQuickFilter('no-onboarding')}
              disabled={loading || submitting}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border border-b-0 transition-all text-xs
                whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'no-onboarding'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <XCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sin Onboarding</span>
              <span className="sm:hidden">Sin Onb.</span>
            </button>
          </div>
          {/* Connector line: el solapa activo (z-10) cubre esta línea donde sienta. */}
          <div className="h-px bg-border" />
        </div>

        {/* Botón limpiar filtros */}
        {(activeQuickFilter !== 'all' || searchTerm) && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8"
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {totalFiltered} de {allDrivers.length} disponible{allDrivers.length !== 1 ? 's' : ''}
          </span>
          {loadingAll && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </div>
        <span className="font-semibold text-primary">
          {selectedDriverIds.length} seleccionado{selectedDriverIds.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Drivers Table */}
      <div className="border rounded-lg overflow-hidden">
        {loadingAll && allDrivers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Cargando drivers...</span>
          </div>
        ) : paginatedDrivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">
              {searchTerm || activeQuickFilter !== 'all'
                ? 'No se encontraron drivers con estos filtros'
                : 'No hay drivers disponibles'}
            </p>
            {(searchTerm || activeQuickFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="mt-2"
              >
                Limpiar búsqueda y filtros
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Header con Select All */}
            <div className="bg-muted/30 border-b">
              <div className="grid grid-cols-[auto_1fr_140px_140px_140px_120px_80px] gap-4 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={
                      filteredAndSortedDrivers.filter(d => d.canBeSelected).length > 0 && 
                      selectedDriverIds.length === filteredAndSortedDrivers.filter(d => d.canBeSelected).length
                    }
                    onCheckedChange={handleToggleAll}
                    disabled={filteredAndSortedDrivers.filter(d => d.canBeSelected).length === 0}
                  />
                  <button 
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    Driver {getSortIcon('name')}
                  </button>
                </div>
                <div className="flex items-center">
                  <button 
                    onClick={() => handleSort('documentsStatus')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Estado Docs {getSortIcon('documentsStatus')}
                  </button>
                </div>
                <div className="flex items-center">
                  <button 
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Estado {getSortIcon('status')}
                  </button>
                </div>
                <div className="flex items-center">
                  <button 
                    onClick={() => handleSort('onboardingStatus')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Onboarding {getSortIcon('onboardingStatus')}
                  </button>
                </div>
                <div className="flex items-center">
                  <button 
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Creado {getSortIcon('createdAt')}
                  </button>
                </div>
                <div className="flex items-center">
                  Acciones
                </div>
              </div>
            </div>

            {/* Driver Rows */}
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {paginatedDrivers.map((driver) => {
                const isSelected = selectedDriverIds.includes(driver.id)
                const docsApproved = driver.documentsStatus === 'APPROVED'
                
                return (
                  <div 
                    key={driver.id}
                    className={`grid grid-cols-[auto_1fr_140px_140px_140px_120px_80px] gap-4 px-4 py-3 hover:bg-muted/30 transition-colors ${
                      isSelected ? 'bg-blue-50' : ''
                    } ${!driver.canBeSelected ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        disabled={!driver.canBeSelected}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => handleToggleDriver(driver.id)}
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{driver.fullName || 'Sin nombre'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">{driver.phoneNumber}</p>
                          {driver.isAssignedToOtherEvent && (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              <Calendar className="h-3 w-3 mr-1" />
                              Asignado
                            </Badge>
                          )}
                        </div>
                        {driver.disabledReason && (
                          <p className="text-xs text-red-600 mt-1">{driver.disabledReason}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      {getDocsStatusBadge(driver.documentsStatus)}
                    </div>
                    
                    <div className="flex items-center">
                      {getApplicationStatusBadge(driver.status)}
                    </div>
                    
                    <div className="flex items-center">
                      {getOnboardingStatusBadge(driver.onboardingStatus)}
                    </div>
                    
                    <div className="flex items-center text-xs text-muted-foreground">
                      {new Date(driver.createdAt).toLocaleDateString('es-PY')}
                    </div>
                    
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedDriverForDetails(driver.id)
                        }}
                        className="h-8 px-2 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ver
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de detalles del driver */}
      {selectedDriverForDetails && (
        <DriverManagementSheet
          open={!!selectedDriverForDetails}
          onOpenChange={(open) => !open && setSelectedDriverForDetails(null)}
          driverId={selectedDriverForDetails}
          onSuccess={() => {
            setSelectedDriverForDetails(null)
            // Los datos se recargan desde el servidor por onSuccess del padre
            onSuccess()
          }}
        />
      )}
    </div>
  )
}