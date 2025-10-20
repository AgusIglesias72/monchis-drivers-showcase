// components/admin/onboarding/add-drivers-dialog.tsx

"use client"

import { useState, useEffect } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, UserPlus, Mail, Phone, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import type { EligibleDriver, EligibleDriversResponse } from '@/types/onboarding'

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
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  
  const [drivers, setDrivers] = useState<EligibleDriver[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasMore: false,
  })

  // ✅ Fetch drivers SOLO cuando se abre el modal
  const fetchDrivers = async (page = 1, search = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        eventId,
        page: page.toString(),
        limit: '10',
      })
      if (search) params.set('search', search)

      const response = await fetch(`/api/onboarding/actions/eligible-drivers?${params}`)
      if (!response.ok) throw new Error('Error al cargar drivers')
      
      const data: EligibleDriversResponse = await response.json()
      setDrivers(data.drivers)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching drivers:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch inicial cuando se abre el modal
  useEffect(() => {
    if (open) {
      fetchDrivers(1, '')
    }
  }, [open, eventId])

  // Debounce search
  useEffect(() => {
    if (!open) return
    
    const timer = setTimeout(() => {
      fetchDrivers(1, searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, open])

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

  const handleToggleDriver = (driverId: string, canBeSelected: boolean) => {
    if (!canBeSelected) return
    
    const newSet = new Set(selectedDriverIds)
    if (newSet.has(driverId)) {
      newSet.delete(driverId)
    } else {
      newSet.add(driverId)
    }
    setSelectedDriverIds(newSet)
  }

  const handleToggleAll = () => {
    const selectableDrivers = drivers.filter(d => d.canBeSelected)
    
    if (selectedDriverIds.size === selectableDrivers.length) {
      setSelectedDriverIds(new Set())
    } else {
      setSelectedDriverIds(new Set(selectableDrivers.map(d => d.id)))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedDriverIds.size === 0) {
      alert('Selecciona al menos un driver')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/onboarding/attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          formDriverIds: Array.from(selectedDriverIds),
          attendeeNotes: notes || undefined,
        })
      })

      if (!response.ok) throw new Error('Error al agregar drivers')

      // Reset y cerrar
      setSelectedDriverIds(new Set())
      setNotes('')
      setSearchTerm('')
      onOpenChange(false)
      onSuccess() // Refrescar la lista de attendees
    } catch (error) {
      console.error('Error adding drivers:', error)
      alert('Error al agregar drivers')
    } finally {
      setSubmitting(false)
    }
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

  const selectableCount = drivers.filter(d => d.canBeSelected).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Agregar Drivers al Evento</DialogTitle>
          <DialogDescription>
            Selecciona los drivers que deseas agregar a este evento de onboarding
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {pagination.total} driver{pagination.total !== 1 ? 's' : ''} total
                {selectableCount < pagination.total && (
                  <span className="text-amber-600 ml-2">
                    ({pagination.total - selectableCount} ya asignado{pagination.total - selectableCount !== 1 ? 's' : ''})
                  </span>
                )}
              </span>
              <span>
                {selectedDriverIds.size} seleccionado{selectedDriverIds.size !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Drivers Table */}
            <div className="border rounded-lg flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectableCount > 0 && 
                            selectedDriverIds.size === selectableCount
                          }
                          onCheckedChange={handleToggleAll}
                          disabled={selectableCount === 0}
                        />
                      </TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          {searchTerm 
                            ? 'No se encontraron drivers con ese criterio'
                            : 'No hay drivers disponibles'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      drivers.map((driver) => {
                        const isDisabled = !driver.canBeSelected
                        
                        return (
                          <TableRow 
                            key={driver.id}
                            className={`${!isDisabled && 'cursor-pointer hover:bg-muted/50'} ${isDisabled && 'opacity-60 bg-muted/20'}`}
                            onClick={() => !isDisabled && handleToggleDriver(driver.id, driver.canBeSelected)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Checkbox
                                        checked={selectedDriverIds.has(driver.id)}
                                        onCheckedChange={() => handleToggleDriver(driver.id, driver.canBeSelected)}
                                        disabled={isDisabled}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  {isDisabled && (
                                    <TooltipContent side="right" className="max-w-xs">
                                      <div className="space-y-1">
                                        <p className="font-semibold flex items-center gap-1">
                                          <AlertCircle className="h-3 w-3" />
                                          {driver.disabledReason}
                                        </p>
                                        {driver.assignedEvent && (
                                          <>
                                            <p className="text-xs">
                                              <strong>{driver.assignedEvent.title || formatDate(driver.assignedEvent.scheduledDate)}</strong>
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {formatDate(driver.assignedEvent.scheduledDate)}
                                            </p>
                                          </>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{driver.fullName || 'Sin nombre'}</span>
                                  {isDisabled && (
                                    <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">
                                      {driver.documentsStatus !== 'APPROVED' ? 'Docs Pendientes' : 'Asignado'}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  {driver.email && (
                                    <div className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {driver.email}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {driver.phoneNumber}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {driver.onboardingScheduledAt ? (
                                <div className="text-sm">
                                  <div className="font-medium text-blue-600">Agendado</div>
                                  <div className="text-muted-foreground">
                                    {formatDate(driver.onboardingScheduledAt)}
                                  </div>
                                </div>
                              ) : (
                                <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                  Sin agendar
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Página {pagination.page} de {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDrivers(pagination.page - 1, searchTerm)}
                    disabled={pagination.page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDrivers(pagination.page + 1, searchTerm)}
                    disabled={!pagination.hasMore || loading}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Drivers de la zona norte"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || selectedDriverIds.size === 0}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UserPlus className="mr-2 h-4 w-4" />
              Agregar {selectedDriverIds.size > 0 && `(${selectedDriverIds.size})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}