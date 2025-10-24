// components/admin/onboarding/add-drivers-sheet.tsx

"use client"

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Loader2, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle,
  X
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

interface AddDriversSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  onSuccess: () => void
}

export function AddDriversSheet({ 
  open, 
  onOpenChange,
  eventId,
  onSuccess,
}: AddDriversSheetProps) {
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  })

  // Fetch drivers usando Server Action
  const fetchDrivers = async (page: number, search: string) => {
    if (!open) return
    
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

  // Fetch inicial cuando se abre
  useEffect(() => {
    if (open) {
      fetchDrivers(1, '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Debounce search
  useEffect(() => {
    if (!open) return
    
    const timer = setTimeout(() => {
      fetchDrivers(1, searchTerm)
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  // Reset cuando se cierra
  useEffect(() => {
    if (!open) {
      setSearchTerm('')
      setSelectedDriverIds(new Set())
      setNotes('')
      setDrivers([])
      setPagination({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      })
    }
  }, [open])

  const handleToggleDriver = (driverId: string) => {
    setSelectedDriverIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(driverId)) {
        newSet.delete(driverId)
      } else {
        newSet.add(driverId)
      }
      return newSet
    })
  }

  const handleToggleAll = () => {
    setSelectedDriverIds(prev => {
      if (prev.size === drivers.length) {
        return new Set()
      } else {
        return new Set(drivers.map(d => d.id))
      }
    })
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
        onSuccess()
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col gap-0 p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Agregar Drivers al Evento
          </SheetTitle>
          <SheetDescription>
            Selecciona los drivers que deseas agregar.
          </SheetDescription>
        </SheetHeader>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, cédula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                disabled={loading || isPending}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {pagination.total} disponible{pagination.total !== 1 ? 's' : ''}
              </span>
              <span className="font-semibold text-primary">
                {selectedDriverIds.size} seleccionado{selectedDriverIds.size !== 1 ? 's' : ''}
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
                      checked={drivers.length > 0 && selectedDriverIds.size === drivers.length}
                      onCheckedChange={handleToggleAll}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm font-medium select-none">
                      Seleccionar todos ({drivers.length})
                    </span>
                  </div>

                  {/* Driver Items */}
                  <div className="divide-y max-h-[400px] overflow-y-auto">
                    {drivers.map((driver) => {
                      const isSelected = selectedDriverIds.has(driver.id)
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
                                {driver.cedula}
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
                  Pág. {pagination.page} de {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDrivers(pagination.page - 1, searchTerm)}
                    disabled={pagination.page === 1 || loading || isPending}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDrivers(pagination.page + 1, searchTerm)}
                    disabled={!pagination.hasMore || loading || isPending}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Notas (opcional)
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Drivers de la zona norte"
                rows={3}
                disabled={isPending}
                className="resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <SheetFooter className="px-6 py-4 border-t bg-muted/20">
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isPending || selectedDriverIds.size === 0}
                className="flex-1"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Agregar {selectedDriverIds.size > 0 && `(${selectedDriverIds.size})`}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}