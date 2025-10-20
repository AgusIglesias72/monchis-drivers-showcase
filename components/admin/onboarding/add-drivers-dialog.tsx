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
import type { EligibleDriver } from '@/types/onboarding'

interface AddDriversDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eligibleDrivers: EligibleDriver[]
  loading: boolean
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
  onAdd: (driverIds: string[], notes?: string) => Promise<{ success: boolean; error?: string }>
  onPageChange: (page: number) => void
  onSearch: (search: string) => void
}

export function AddDriversDialog({ 
  open, 
  onOpenChange, 
  eligibleDrivers,
  loading,
  pagination,
  onAdd,
  onPageChange,
  onSearch,
}: AddDriversDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset search cuando se cierra
  useEffect(() => {
    if (!open) {
      setSearchTerm('')
      setSelectedDriverIds(new Set())
      setNotes('')
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
    const selectableDrivers = eligibleDrivers.filter(d => d.canBeSelected)
    
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
    const result = await onAdd(Array.from(selectedDriverIds), notes || undefined)
    setSubmitting(false)

    if (result.success) {
      // Reset form
      setSelectedDriverIds(new Set())
      setNotes('')
      setSearchTerm('')
      onOpenChange(false)
    } else {
      alert(result.error || 'Error al agregar drivers')
    }
  }

  const handleCancel = () => {
    setSelectedDriverIds(new Set())
    setNotes('')
    setSearchTerm('')
    onOpenChange(false)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const selectableCount = eligibleDrivers.filter(d => d.canBeSelected).length

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
                    {eligibleDrivers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          {searchTerm 
                            ? 'No se encontraron drivers con ese criterio'
                            : 'No hay drivers disponibles'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      eligibleDrivers.map((driver) => {
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
                                              <strong>{driver.assignedEvent.title}</strong>
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
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pagination.page + 1)}
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