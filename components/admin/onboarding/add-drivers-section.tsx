// components/admin/onboarding/add-drivers-section.tsx

"use client"

import { useState, useEffect } from 'react'
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
  CheckCircle
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
  const fetchDrivers = async (page: number, search: string) => {
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
  }

  // Fetch inicial
  useEffect(() => {
    fetchDrivers(1, '')
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDrivers(1, searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

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
      driverIds: selectedDriverIds,
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Agregar Participantes
            </CardTitle>
            <CardDescription>
              Selecciona los drivers que deseas agregar a este evento
            </CardDescription>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedDriverIds.length === 0}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agregar ({selectedDriverIds.length})
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {pagination.total} disponible{pagination.total !== 1 ? 's' : ''}
          </span>
          <span className="font-semibold text-primary">
            {selectedDriverIds.length} seleccionado{selectedDriverIds.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Drivers List */}
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
              {/* Select All */}
              <div 
                className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={handleToggleAll}
              >
                <Checkbox
                  checked={drivers.length > 0 && selectedDriverIds.length === drivers.length}
                  onCheckedChange={handleToggleAll}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm font-medium select-none">
                  Seleccionar todos ({drivers.length})
                </span>
              </div>

              {/* Driver Items */}
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {drivers.map((driver) => {
                  const isSelected = selectedDriverIds.includes(driver.id)
                  const docsApproved = driver.documentsStatus === 'APPROVED'
                  const hasOnboarding = driver.onboardingStatus === 'SCHEDULED' || driver.onboardingStatus === 'COMPLETED'
                  
                  return (
                    <div 
                      key={driver.id}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors ${
                        isSelected ? 'bg-primary/5 border-l-4 border-primary' : 'border-l-4 border-transparent'
                      }`}
                      onClick={() => handleToggleDriver(driver.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleDriver(driver.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5"
                      />
                      
                      <div className="flex-1 min-w-0">
                        {/* Name and CI */}
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-semibold">
                            {driver.fullName || 'Sin nombre'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            CI: {driver.cedula}
                          </span>
                        </div>
                        
                        {/* Badges */}
                        <div className="flex items-center gap-1.5">
                          {docsApproved ? (
                            <Badge variant="outline" className="text-xs h-5 bg-green-50 text-green-700 border-green-200 gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Docs
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs h-5 bg-amber-50 text-amber-700 border-amber-200 gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Pendiente
                            </Badge>
                          )}

                          {hasOnboarding && (
                            <Badge variant="outline" className="text-xs h-5 bg-blue-50 text-blue-700 border-blue-200">
                              OB
                            </Badge>
                          )}
                        </div>
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
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
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
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchDrivers(pagination.page + 1, searchTerm)}
                disabled={!pagination.hasMore || loading || submitting}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}