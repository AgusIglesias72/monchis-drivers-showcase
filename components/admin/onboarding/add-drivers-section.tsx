// components/admin/onboarding/add-drivers-section.tsx

"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { 
  Search, 
  Loader2, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  FileText
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
  onboardingScheduledAt: Date | null
  applicationStatus?: string
  appliedAt?: Date | null
}

interface AddDriversSectionProps {
  eventId: string
  onSuccess: () => void
}

export function AddDriversSection({ eventId, onSuccess }: AddDriversSectionProps) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([])
  
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  })

  // Fetch drivers
  const fetchDrivers = useCallback(async (page: number, search: string) => {
    setLoading(true)
    
    const result = await getEligibleDrivers({
      eventId,
      page,
      limit: 20,
      search
    })
    
    if (result.success) {
      setDrivers(result.drivers || [])
      setPagination(result.pagination)
    } else {
      toast.error(result.error || 'Error al cargar drivers')
      setDrivers([])
    }
    
    setLoading(false)
  }, [eventId])

  // Fetch inicial
  useEffect(() => {
    fetchDrivers(1, '')
  }, [fetchDrivers])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDrivers(1, searchTerm)
      setSelectedDriverIds([])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, fetchDrivers])

  const handleToggleDriver = (driverId: string) => {
    setSelectedDriverIds(prev => {
      if (prev.includes(driverId)) {
        return prev.filter(id => id !== driverId)
      } else {
        return [...prev, driverId]
      }
    })
  }

  const handleToggleAll = () => {
    if (selectedDriverIds.length === drivers.length) {
      setSelectedDriverIds([])
    } else {
      setSelectedDriverIds(drivers.map(d => d.id))
    }
  }

  const handleSubmit = async () => {
    if (selectedDriverIds.length === 0) {
      toast.error('Selecciona al menos un driver')
      return
    }

    setSubmitting(true)
    const result = await assignDriversToEvent({
      eventId,
      formDriverIds: selectedDriverIds,
      attendeeNotes: ''
    })

    if (result.success) {
      toast.success(result.message || 'Drivers agregados exitosamente')
      setSelectedDriverIds([])
      setSearchTerm('')
      fetchDrivers(1, '')
      onSuccess()
    } else {
      toast.error(result.error || 'Error al agregar drivers')
    }
    
    setSubmitting(false)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getApplicationStatusBadge = (status?: string) => {
    if (!status) return null
    
    const config = {
      PENDING: { label: 'Pendiente', className: 'bg-warning-soft text-warning border-warning' },
      UNDER_REVIEW: { label: 'En Revisión', className: 'bg-info-soft text-info border-info' },
      APPROVED: { label: 'Aprobada', className: 'bg-success-soft text-success border-success' },
      REJECTED: { label: 'Rechazada', className: 'bg-danger-soft text-destructive border-destructive' },
    }
    
    const statusConfig = config[status as keyof typeof config]
    if (!statusConfig) return null
    
    return (
      <Badge variant="outline" className={`text-xs h-5 ${statusConfig.className}`}>
        {statusConfig.label}
      </Badge>
    )
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

      {/* Search */}
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
        ) : drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">
              {searchTerm ? 'No se encontraron drivers' : 'No hay drivers disponibles'}
            </p>
          </div>
        ) : (
          <>
            {/* Header con Select All */}
            <div className="bg-muted/30 border-b">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4 flex items-center gap-3">
                  <Checkbox
                    checked={drivers.length > 0 && selectedDriverIds.length === drivers.length}
                    onCheckedChange={handleToggleAll}
                  />
                  <span>Driver</span>
                </div>
                <div className="col-span-2">Estado Docs</div>
                <div className="col-span-2">Postulación</div>
                <div className="col-span-2">Fecha Postulación</div>
                <div className="col-span-2">Onboarding</div>
              </div>
            </div>

            {/* Driver Rows */}
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {drivers.map((driver) => {
                const isSelected = selectedDriverIds.includes(driver.id)
                const docsApproved = driver.documentsStatus === 'APPROVED'
                const hasOnboarding = driver.onboardingStatus === 'SCHEDULED' || driver.onboardingStatus === 'COMPLETED'
                
                return (
                  <div 
                    key={driver.id}
                    className={`grid grid-cols-12 gap-4 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors ${
                      isSelected ? 'bg-primary/5 border-l-4 border-primary' : 'border-l-4 border-transparent'
                    }`}
                    onClick={() => handleToggleDriver(driver.id)}
                  >
                    {/* Driver Info */}
                    <div className="col-span-4 flex items-start gap-3">
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
                        <Badge variant="outline" className="text-xs h-5 bg-success-soft text-success border-success gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Aprobados
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs h-5 bg-warning-soft text-warning border-warning gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Pendiente
                        </Badge>
                      )}
                    </div>

                    {/* Application Status */}
                    <div className="col-span-2 flex items-center">
                      {getApplicationStatusBadge(driver.applicationStatus) || (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>

                    {/* Application Date */}
                    <div className="col-span-2 flex items-center text-sm text-muted-foreground gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(driver.appliedAt?.toISOString() || '')}
                    </div>

                    {/* Onboarding Status */}
                    <div className="col-span-2 flex items-center">
                      {hasOnboarding ? (
                        <Badge variant="outline" className="text-xs h-5 bg-info-soft text-info border-info gap-1">
                          <FileText className="h-3 w-3" />
                          {driver.onboardingStatus === 'COMPLETED' ? 'Completado' : 'Programado'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin OB</span>
                      )}
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