// components/admin/onboarding/add-drivers-dialog.tsx

"use client"

import { useState, useEffect, useTransition, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, UserPlus, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react'
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

interface AddDriversDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  onSuccess: () => void
}

export function AddDriversDialog({ 
  open, 
  onOpenChange,
  eventId,
  onSuccess,
}: AddDriversDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasMore: false,
  })

  // Fetch drivers usando Server Action
  const fetchDrivers = useCallback(async (page = 1, search = '') => {
    setLoading(true)
    
    const result = await getEligibleDrivers({
      eventId,
      page,
      limit: 10,
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

  // Fetch inicial cuando se abre el modal
  useEffect(() => {
    if (open) {
      fetchDrivers(1, '')
    }
  }, [open, eventId, fetchDrivers])

  // Debounce search
  useEffect(() => {
    if (!open) return
    
    const timer = setTimeout(() => {
      fetchDrivers(1, searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, open, fetchDrivers])

  // Reset cuando se cierra
  useEffect(() => {
    if (!open) {
      setSearchTerm('')
      setSelectedDriverIds(new Set())
      setNotes('')
      setDrivers([])
      setPagination({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasMore: false,
      })
    }
  }, [open])

  const handleToggleDriver = (driverId: string) => {
    const newSet = new Set(selectedDriverIds)
    if (newSet.has(driverId)) {
      newSet.delete(driverId)
    } else {
      newSet.add(driverId)
    }
    setSelectedDriverIds(newSet)
  }

  const handleToggleAll = () => {
    if (selectedDriverIds.size === drivers.length) {
      setSelectedDriverIds(new Set())
    } else {
      setSelectedDriverIds(new Set(drivers.map(d => d.id)))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedDriverIds.size === 0) {
      toast.error('Selecciona al menos un driver')
      return
    }

    startTransition(async () => {
      const result = await assignDriversToEvent({
        eventId,
        formDriverIds: Array.from(selectedDriverIds),
        attendeeNotes: notes || undefined
      })

      if (result.success) {
        toast.success(result.message || 'Drivers agregados exitosamente')
        setSelectedDriverIds(new Set())
        setNotes('')
        setSearchTerm('')
        onOpenChange(false)
        onSuccess() // Refrescar la lista de attendees
      } else {
        toast.error(result.error || 'Error al agregar drivers')
      }
    })
  }

  const handleCancel = () => {
    setSelectedDriverIds(new Set())
    setNotes('')
    setSearchTerm('')
    onOpenChange(false)
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-5 w-5" />
            Agregar Drivers al Evento
          </DialogTitle>
          <DialogDescription>
            Selecciona los drivers que deseas agregar a este evento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email, teléfono o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              disabled={loading || isPending}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm px-1">
            <span className="text-muted-foreground">
              {pagination.total} driver{pagination.total !== 1 ? 's' : ''} disponible{pagination.total !== 1 ? 's' : ''}
            </span>
            <span className="font-semibold text-primary">
              {selectedDriverIds.size} seleccionado{selectedDriverIds.size !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Drivers List */}
          <div className="border rounded-lg flex-1 overflow-auto bg-card">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : drivers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">
                  {searchTerm 
                    ? 'No se encontraron drivers'
                    : 'No hay drivers disponibles'}
                </p>
              </div>
            ) : (
              <>
                {/* Select All Header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b sticky top-0 z-10">
                  <Checkbox
                    checked={drivers.length > 0 && selectedDriverIds.size === drivers.length}
                    onCheckedChange={handleToggleAll}
                    disabled={drivers.length === 0}
                    className="cursor-pointer"
                  />
                  <span className="text-sm font-medium cursor-pointer select-none" onClick={handleToggleAll}>
                    Seleccionar todos ({drivers.length})
                  </span>
                </div>

                {/* Driver items */}
                <div className="divide-y">
                  {drivers.map((driver) => {
                    const isSelected = selectedDriverIds.has(driver.id)
                    const docsApproved = driver.documentsStatus === 'APPROVED'
                    const hasOnboarding = driver.onboardingStatus === 'SCHEDULED' || driver.onboardingStatus === 'COMPLETED'
                    
                    return (
                      <div 
                        key={driver.id}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer ${
                          isSelected ? 'bg-primary/5 border-l-2 border-primary' : ''
                        }`}
                        onClick={() => handleToggleDriver(driver.id)}
                      >
                        {/* Checkbox */}
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleDriver(driver.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 cursor-pointer"
                        />
                        
                        {/* Driver Info */}
                        <div className="flex-1 min-w-0">
                          {/* Name and CI */}
                          <div className="flex items-baseline gap-2 mb-1.5">
                            <span className="font-semibold text-base">
                              {driver.fullName || 'Sin nombre'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              CI: {driver.cedula}
                            </span>
                          </div>
                          
                          {/* Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Document Status Badge */}
                            {docsApproved ? (
                              <Badge variant="outline" className="text-xs bg-success-soft text-success border-success gap-1 px-2 py-0">
                                <CheckCircle className="h-3 w-3" />
                                Docs OK
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-warning-soft text-warning border-warning gap-1 px-2 py-0">
                                <AlertTriangle className="h-3 w-3" />
                                Docs {driver.documentsStatus === 'PENDING' ? 'Pendientes' : 
                                      driver.documentsStatus === 'IN_REVIEW' ? 'En Revisión' :
                                      driver.documentsStatus === 'CORRECTIONS' ? 'Correcciones' : 
                                      'Incompletos'}
                              </Badge>
                            )}

                            {/* Onboarding Status Badge */}
                            {hasOnboarding && (
                              <Badge variant="outline" className="text-xs bg-info-soft text-info border-info px-2 py-0">
                                {driver.onboardingStatus === 'COMPLETED' ? 'OB Completado' : 'OB Agendado'}
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
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">
                Página {pagination.page} de {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fetchDrivers(pagination.page - 1, searchTerm)}
                  disabled={pagination.page === 1 || loading || isPending}
                  className="cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fetchDrivers(pagination.page + 1, searchTerm)}
                  disabled={!pagination.hasMore || loading || isPending}
                  className="cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Drivers de la zona norte"
              rows={2}
              disabled={isPending}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isPending || selectedDriverIds.size === 0}
              className="cursor-pointer"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UserPlus className="mr-2 h-4 w-4" />
              Agregar {selectedDriverIds.size > 0 && `(${selectedDriverIds.size})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}