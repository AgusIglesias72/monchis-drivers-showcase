// components/admin/onboarding/add-drivers-section-client.tsx
// Este es el Client Component que recibe datos iniciales del servidor

"use client"

import { useState, useEffect, useTransition, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Filter,
  X,
  ExternalLink
} from 'lucide-react'
import { getEligibleDrivers, assignDriversToEvent } from '@/lib/actions/onboarding.actions'
import { toast } from 'sonner'

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
  
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers)
  const [pagination, setPagination] = useState(initialPagination)

  // Filtros y ordenamiento
  const [filters, setFilters] = useState({
    documentsStatus: '',
    applicationStatus: '',
    onboardingStatus: '',
  })
  const [sortBy, setSortBy] = useState<{
    field: 'name' | 'documentsStatus' | 'status' | 'onboardingStatus' | 'createdAt' | null
    order: 'asc' | 'desc'
  }>({ field: null, order: 'asc' })

  // Fetch drivers
  const fetchDrivers = useCallback(async (page: number, search: string) => {
    startTransition(async () => {
      const result = await getEligibleDrivers({
        eventId,
        page,
        limit: 20,
        search
      })
      
      if (result.success) {
        setDrivers(result.drivers as Driver[] || [])
        setPagination(result.pagination)
      } else {
        toast.error(result.error || 'Error al cargar drivers')
        setDrivers([])
      }
    })
  }, [eventId])

  // Debounce search
  useEffect(() => {
    if (searchTerm === '') {
      // Si limpia la búsqueda, volver a los datos iniciales
      setDrivers(initialDrivers)
      setPagination(initialPagination)
      setSelectedDriverIds([])
      return
    }

    const timer = setTimeout(() => {
      fetchDrivers(1, searchTerm)
      setSelectedDriverIds([])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, fetchDrivers, initialDrivers, initialPagination])

  const handleToggleDriver = (driverId: string) => {
    setSelectedDriverIds(prev => {
      if (prev.includes(driverId)) {
        return prev.filter(id => id !== driverId)
      } else {
        return [...prev, driverId]
      }
    })
  }

  const handleSubmit = async () => {
    if (selectedDriverIds.length === 0) {
      toast.error('Selecciona al menos un driver')
      return
    }

    setSubmitting(true)
    const result = await assignDriversToEvent({
      eventId,
      driverIds: selectedDriverIds,
    })

    if (result.success) {
      toast.success(result.message || 'Drivers agregados exitosamente')
      setSelectedDriverIds([])
      setSearchTerm('')
      // Refetch inicial
      fetchDrivers(1, '')
      onSuccess()
    } else {
      toast.error(result.error || 'Error al agregar drivers')
    }
    
    setSubmitting(false)
  }

  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getOnboardingStatusBadge = (status: string | null) => {
    if (!status) return (
      <Badge variant="outline" className="text-xs h-5 bg-gray-50 text-gray-700 border-gray-200">
        Pendiente
      </Badge>
    )
    
    const config = {
      NOT_READY: { label: 'No Listo', className: 'bg-gray-50 text-gray-700 border-gray-200' },
      READY: { label: 'Listo', className: 'bg-blue-50 text-blue-700 border-blue-200' },
      SCHEDULED: { label: 'Programado', className: 'bg-purple-50 text-purple-700 border-purple-200' },
      IN_PROGRESS: { label: 'En Curso', className: 'bg-amber-50 text-amber-700 border-amber-200' },
      COMPLETED: { label: 'Completado', className: 'bg-green-50 text-green-700 border-green-200' },
      CANCELLED: { label: 'Cancelado', className: 'bg-red-50 text-red-700 border-red-200' },
      NO_SHOW: { label: 'No Asistió', className: 'bg-orange-50 text-orange-700 border-orange-200' },
    }
    
    const statusConfig = config[status as keyof typeof config]
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

  const loading = isPending

  // Aplicar filtros y ordenamiento localmente
  const filteredAndSortedDrivers = drivers
    .filter(driver => {
      if (filters.documentsStatus && driver.documentsStatus !== filters.documentsStatus) return false
      if (filters.applicationStatus && driver.status !== filters.applicationStatus) return false
      if (filters.onboardingStatus && driver.onboardingStatus !== filters.onboardingStatus) return false
      return true
    })
    .sort((a, b) => {
      if (!sortBy.field) return 0
      
      let aVal: any
      let bVal: any
      
      if (sortBy.field === 'name') {
        aVal = a.fullName || ''
        bVal = b.fullName || ''
      } else {
        aVal = a[sortBy.field]
        bVal = b[sortBy.field]
      }
      
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      
      if (typeof aVal === 'string') {
        return sortBy.order === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      
      return sortBy.order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
    })

  const handleSort = (field: typeof sortBy.field) => {
    setSortBy(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleFilterChange = (filterKey: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }))
  }

  const clearFilters = () => {
    setFilters({
      documentsStatus: '',
      applicationStatus: '',
      onboardingStatus: '',
    })
  }

  const handleToggleAll = () => {
    if (selectedDriverIds.length === filteredAndSortedDrivers.length) {
      setSelectedDriverIds([])
    } else {
      setSelectedDriverIds(filteredAndSortedDrivers.map(d => d.id))
    }
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
            placeholder="Buscar por nombre o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            disabled={loading || submitting}
          />
        </div>

        {/* Filtros en línea */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filtros:</span>
          </div>
          
          <Select value={filters.documentsStatus} onValueChange={(val) => handleFilterChange('documentsStatus', val)}>
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Estado Docs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="APPROVED">Aprobados</SelectItem>
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="IN_REVIEW">En Revisión</SelectItem>
              <SelectItem value="CORRECTIONS">Correcciones</SelectItem>
              <SelectItem value="INCOMPLETE">Incompleto</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.applicationStatus} onValueChange={(val) => handleFilterChange('applicationStatus', val)}>
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Postulación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="APPROVED">Aprobado</SelectItem>
              <SelectItem value="READY_ONBOARDING">Listo OB</SelectItem>
              <SelectItem value="UNDER_REVIEW">En Revisión</SelectItem>
              <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
              <SelectItem value="SUBMITTED">Enviado</SelectItem>
              <SelectItem value="DOCS_PENDING">Docs Pendientes</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.onboardingStatus || ''} onValueChange={(val) => handleFilterChange('onboardingStatus', val)}>
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Onboarding" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COMPLETED">Completado</SelectItem>
              <SelectItem value="SCHEDULED">Programado</SelectItem>
              <SelectItem value="IN_PROGRESS">En Curso</SelectItem>
              <SelectItem value="READY">Listo</SelectItem>
              <SelectItem value="NOT_READY">No Listo</SelectItem>
            </SelectContent>
          </Select>

          {(filters.documentsStatus || filters.applicationStatus || filters.onboardingStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8"
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-4 py-2">
        <span className="text-muted-foreground">
          {pagination.total} disponible{pagination.total !== 1 ? 's' : ''}
        </span>
        <span className="font-semibold text-primary">
          {selectedDriverIds.length} seleccionado{selectedDriverIds.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Drivers Table */}
      <div className="border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAndSortedDrivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">
              {searchTerm || filters.documentsStatus || filters.applicationStatus || filters.onboardingStatus
                ? 'No se encontraron drivers con los filtros aplicados' 
                : 'No hay drivers disponibles'}
            </p>
          </div>
        ) : (
          <>
            {/* Header con Select All y ordenamiento */}
            <div className="bg-muted/30 border-b">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-3 flex items-center gap-3">
                  <Checkbox
                    checked={filteredAndSortedDrivers.length > 0 && selectedDriverIds.length === filteredAndSortedDrivers.length}
                    onCheckedChange={handleToggleAll}
                  />
                  <button 
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    <span>Driver</span>
                    {sortBy.field === 'name' ? (
                      sortBy.order === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                </div>
                <div className="col-span-2">
                  <button 
                    onClick={() => handleSort('documentsStatus')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    <span>Estado Docs</span>
                    {sortBy.field === 'documentsStatus' ? (
                      sortBy.order === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                </div>
                <div className="col-span-2">
                  <button 
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    <span>Postulación</span>
                    {sortBy.field === 'status' ? (
                      sortBy.order === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                </div>
                <div className="col-span-2">
                  <button 
                    onClick={() => handleSort('onboardingStatus')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    <span>Onboarding</span>
                    {sortBy.field === 'onboardingStatus' ? (
                      sortBy.order === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                </div>
                <div className="col-span-2">
                  <button 
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    <span>Fecha Registro</span>
                    {sortBy.field === 'createdAt' ? (
                      sortBy.order === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                </div>
                <div className="col-span-1 text-center">Acciones</div>
              </div>
            </div>

            {/* Driver Rows */}
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {filteredAndSortedDrivers.map((driver) => {
                const isSelected = selectedDriverIds.includes(driver.id)
                const docsApproved = driver.documentsStatus === 'APPROVED'
                
                return (
                  <div 
                    key={driver.id}
                    className={`grid grid-cols-12 gap-4 px-4 py-3 transition-colors ${
                      isSelected 
                        ? 'bg-primary/10 cursor-pointer' 
                        : 'cursor-pointer hover:bg-muted/20'
                    }`}
                    onClick={() => handleToggleDriver(driver.id)}
                  >
                    {/* Driver Info */}
                    <div className="col-span-3 flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleDriver(driver.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">
                          {driver.fullName || 'Sin nombre'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          CI: {driver.cedula}
                        </div>
                      </div>
                    </div>

                    {/* Document Status */}
                    <div className="col-span-2 flex items-center">
                      {docsApproved ? (
                        <Badge variant="outline" className="text-xs h-5 bg-green-50 text-green-700 border-green-200 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Aprobados
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs h-5 bg-amber-50 text-amber-700 border-amber-200 gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {driver.documentsStatus === 'PENDING' ? 'Pendiente' : 
                           driver.documentsStatus === 'IN_REVIEW' ? 'Revisión' : 
                           driver.documentsStatus === 'CORRECTIONS' ? 'Correcciones' :
                           'Incompleto'}
                        </Badge>
                      )}
                    </div>

                    {/* Application Status */}
                    <div className="col-span-2 flex items-center">
                      {driver.status === 'APPROVED' ? (
                        <Badge variant="outline" className="text-xs h-5 bg-green-50 text-green-700 border-green-200">
                          Aprobado
                        </Badge>
                      ) : driver.status === 'UNDER_REVIEW' ? (
                        <Badge variant="outline" className="text-xs h-5 bg-blue-50 text-blue-700 border-blue-200">
                          En Revisión
                        </Badge>
                      ) : driver.status === 'READY_ONBOARDING' ? (
                        <Badge variant="outline" className="text-xs h-5 bg-purple-50 text-purple-700 border-purple-200">
                          Listo OB
                        </Badge>
                      ) : driver.status === 'COMPLETED' ? (
                        <Badge variant="outline" className="text-xs h-5 bg-gray-50 text-gray-700 border-gray-200">
                          Completado
                        </Badge>
                      ) : driver.status === 'SUBMITTED' ? (
                        <Badge variant="outline" className="text-xs h-5 bg-cyan-50 text-cyan-700 border-cyan-200">
                          Enviado
                        </Badge>
                      ) : driver.status === 'IN_PROGRESS' ? (
                        <Badge variant="outline" className="text-xs h-5 bg-amber-50 text-amber-700 border-amber-200">
                          En Progreso
                        </Badge>
                      ) : driver.status === 'DOCS_PENDING' ? (
                        <Badge variant="outline" className="text-xs h-5 bg-orange-50 text-orange-700 border-orange-200">
                          Docs Pend
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{driver.status || '-'}</span>
                      )}
                    </div>

                    {/* Onboarding Status */}
                    <div className="col-span-2 flex items-center">
                      {getOnboardingStatusBadge(driver.onboardingStatus)}
                    </div>

                    {/* Registration Date */}
                    <div className="col-span-2 flex items-center text-sm text-muted-foreground gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(driver.createdAt)}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-center gap-2">
                      {driver.isAssignedToOtherEvent && driver.assignedEvent && (
                        <Badge 
                          variant="outline" 
                          className="text-xs h-5 bg-red-50 text-red-700 border-red-200"
                          title={`Asignado a: ${driver.assignedEvent.title || 'Evento'} - ${formatDate(driver.assignedEvent.scheduledDate)}`}
                        >
                          Asignado
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`/admin/postulaciones/${driver.id}`, '_blank')
                        }}
                        title="Ver postulación"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
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
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDrivers(pagination.page - 1, searchTerm)}
              disabled={pagination.page === 1 || loading || submitting}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDrivers(pagination.page + 1, searchTerm)}
              disabled={!pagination.hasMore || loading || submitting}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}