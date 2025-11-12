// components/admin/postulaciones-page-content.tsx

"use client"

import { useState, useEffect, useCallback, useTransition, useMemo } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PostulacionesKPIs } from "@/components/admin/postulaciones-kpis"
import { PostulacionesTableExpandable } from "@/components/admin/postulaciones-table-expandable"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Filter,
  X,
  Calendar as CalendarIcon,
  ClipboardCheck,
  Clock,
  FileCheck,
  Loader2,
  XCircle,
  HelpCircle,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getContactStatus } from "@/lib/utils/contact-status.utils"
import type { PostulacionFilters } from "@/types/postulacion-filters.types"
import {
  CURRENT_STEP_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  DOCUMENT_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  INVOICE_STATUS_OPTIONS,
} from "@/types/postulacion-filters.types"

interface PostulacionesPageContentProps {
  stats: any
  postulaciones: any[]
  total: number
  currentPage: number
  totalPages: number
  hasMore: boolean
  currentFilters: PostulacionFilters
}

type QuickFilter = 'all' | 'scheduled' | 'pending-schedule' | 'review' | 'pending-completion' | 'rejected'

export function PostulacionesPageContent({
  stats,
  postulaciones,
  total,
  currentPage,
  totalPages,
  hasMore,
  currentFilters
}: PostulacionesPageContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Estados locales para los filtros
  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '')
  const [statusFilter, setStatusFilter] = useState(currentFilters.status || 'all')
  const [onboardingStatusFilter, setOnboardingStatusFilter] = useState(currentFilters.onboardingStatus || 'all')
  const [currentStepFilter, setCurrentStepFilter] = useState(currentFilters.currentStep || 'all')
  const [contactStatusFilter, setContactStatusFilter] = useState(currentFilters.contactStatus || 'all')
  const [documentStatusFilter, setDocumentStatusFilter] = useState(currentFilters.documentStatus || 'all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(currentFilters.paymentStatus || 'all')
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState(currentFilters.invoiceStatus || 'all')
  const [startDate, setStartDate] = useState(currentFilters.startDate || '')
  const [endDate, setEndDate] = useState(currentFilters.endDate || '')
  const [sortBy, setSortBy] = useState(currentFilters.sortBy || 'createdAt')
  const [sortOrder, setSortOrder] = useState(currentFilters.sortOrder || 'desc')
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter>('all')

  const postulacionesWithContactStatus = useMemo(() => {
    return postulaciones.map(post => {
      const hasBeenContacted = (post.driverContacts?.length ?? 0) > 0
      const isRejected = post.status === 'REJECTED'
      const completedSteps = post.completedSteps?.length ?? 0

      return {
        ...post,
        hasBeenContacted,
        contactStatus: getContactStatus(isRejected, hasBeenContacted, completedSteps)
      }
    })
  }, [postulaciones])

  useEffect(() => {
    if (statusFilter === 'REJECTED') {
      setActiveQuickFilter('rejected')
    } else if (onboardingStatusFilter === 'scheduled') {
      setActiveQuickFilter('scheduled')
    } else if (onboardingStatusFilter === 'pending' && statusFilter === 'COMPLETED') {
      setActiveQuickFilter('pending-schedule')
    } else if (statusFilter === 'COMPLETED' && onboardingStatusFilter === 'all') {
      setActiveQuickFilter('review')
    } else if (statusFilter === 'IN_PROGRESS') {
      setActiveQuickFilter('pending-completion')
    } else {
      setActiveQuickFilter('all')
    }
  }, [statusFilter, onboardingStatusFilter])

  const applyFilters = useCallback((page: number = 1, quickFilter?: QuickFilter) => {
    const params = new URLSearchParams()

    if (quickFilter) {
      switch (quickFilter) {
        case 'scheduled':
          params.set('onboardingStatus', 'scheduled')
          params.set('status', 'COMPLETED')
          break
        case 'pending-schedule':
          params.set('onboardingStatus', 'pending')
          params.set('status', 'COMPLETED')
          break
        case 'review':
          params.set('status', 'COMPLETED')
          break
        case 'pending-completion':
          params.set('status', 'IN_PROGRESS')
          break
        case 'rejected':
          params.set('status', 'REJECTED')
          break
      }
    } else {
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (onboardingStatusFilter !== 'all') params.set('onboardingStatus', onboardingStatusFilter)
      if (currentStepFilter !== 'all') params.set('currentStep', currentStepFilter)
      if (contactStatusFilter !== 'all') params.set('contactStatus', contactStatusFilter)
      if (documentStatusFilter !== 'all') params.set('documentStatus', documentStatusFilter)
      if (paymentStatusFilter !== 'all') params.set('paymentStatus', paymentStatusFilter)
      if (invoiceStatusFilter !== 'all') params.set('invoiceStatus', invoiceStatusFilter)
    }

    if (searchTerm) params.set('search', searchTerm)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy)
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder)
    if (page > 1) params.set('page', page.toString())

    const queryString = params.toString()
    
    startTransition(() => {
      router.push(`/admin/postulaciones${queryString ? `?${queryString}` : ''}`, { scroll: false })
    })
  }, [router, statusFilter, onboardingStatusFilter, currentStepFilter, contactStatusFilter, documentStatusFilter, paymentStatusFilter, invoiceStatusFilter, searchTerm, startDate, endDate, sortBy, sortOrder])

  const handleQuickFilter = (filter: QuickFilter) => {
    setActiveQuickFilter(filter)

    if (filter !== 'all') {
      setStatusFilter('all')
      setOnboardingStatusFilter('all')
      setCurrentStepFilter('all')
      setContactStatusFilter('all')
      setDocumentStatusFilter('all')
      setPaymentStatusFilter('all')
      setInvoiceStatusFilter('all')
    }

    applyFilters(1, filter)
  }

  const handleSearch = () => {
    applyFilters(1)
  }

  const handleApplyFilters = () => {
    setIsSheetOpen(false)
    applyFilters(1)
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setOnboardingStatusFilter('all')
    setCurrentStepFilter('all')
    setContactStatusFilter('all')
    setDocumentStatusFilter('all')
    setPaymentStatusFilter('all')
    setInvoiceStatusFilter('all')
    setStartDate('')
    setEndDate('')
    setSortBy('createdAt')
    setSortOrder('desc')
    setActiveQuickFilter('all')
    
    startTransition(() => {
      router.push('/admin/postulaciones', { scroll: false })
    })
  }

  // Contar filtros activos (excluyendo búsqueda y ordenamiento)
  const activeFiltersCount = [
    statusFilter !== 'all',
    onboardingStatusFilter !== 'all',
    currentStepFilter !== 'all',
    contactStatusFilter !== 'all',
    documentStatusFilter !== 'all',
    paymentStatusFilter !== 'all',
    invoiceStatusFilter !== 'all',
    startDate !== '',
    endDate !== '',
  ].filter(Boolean).length

  const hasActiveFilters = 
    searchTerm || 
    statusFilter !== 'all' || 
    onboardingStatusFilter !== 'all' || 
    currentStepFilter !== 'all' ||
    contactStatusFilter !== 'all' ||
    documentStatusFilter !== 'all' ||
    paymentStatusFilter !== 'all' ||
    invoiceStatusFilter !== 'all' ||
    startDate || 
    endDate

  const handlePageChange = (newPage: number) => {
    applyFilters(newPage, activeQuickFilter === 'all' ? undefined : activeQuickFilter)
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        breadcrumbs={[
          { label: "Postulaciones", href: "/admin/postulaciones" },
        ]}
      />

      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Postulaciones</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Gestiona y revisa todas las postulaciones de drivers
          </p>
        </div>

        <PostulacionesKPIs stats={stats} />

        {/* ✅ BARRA DE FILTROS COMPACTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, cédula, teléfono, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 pr-9 h-10"
              disabled={isPending}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => {
                  setSearchTerm('')
                  setTimeout(() => applyFilters(1), 100)
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Botón de Filtros con Sheet */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 relative">
                <Filter className="h-4 w-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="default" className="ml-1 h-5 min-w-5 px-1 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-4">
              <SheetHeader className="pb-2 border-b border-gray-200 mb-3 px-0">
                <SheetTitle className="text-lg font-semibold text-gray-900">Filtros</SheetTitle>
                <SheetDescription className="text-xs text-gray-500 mt-1">
                  Selecciona los criterios para filtrar las postulaciones
                </SheetDescription>
              </SheetHeader>

              <TooltipProvider>
                <div className="space-y-4">
                  {/* Sección: Filtros de Fecha */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Rango de Fechas</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor="sheet-start-date" className="text-xs font-medium text-gray-600">
                            Fecha Desde
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Filtra postulaciones desde esta fecha</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="sheet-start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-9 text-sm w-full cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor="sheet-end-date" className="text-xs font-medium text-gray-600">
                            Fecha Hasta
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Filtra postulaciones hasta esta fecha</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="sheet-end-date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="h-9 text-sm w-full cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección: Estado General */}
                  <div className="space-y-2.5 pt-3 border-t border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Estado General</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor="sheet-status" className="text-xs font-medium text-gray-600">
                            Estado de Postulación
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Filtra por el estado general de la postulación</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Select 
                          value={statusFilter} 
                          onValueChange={(value) => setStatusFilter(value as any)}
                        >
                          <SelectTrigger id="sheet-status" className="h-9 text-sm w-full cursor-pointer">
                            <SelectValue placeholder="Todos los estados" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="cursor-pointer">Todos</SelectItem>
                            <SelectItem value="COMPLETED" className="cursor-pointer">Completadas</SelectItem>
                            <SelectItem value="IN_PROGRESS" className="cursor-pointer">En Progreso</SelectItem>
                            <SelectItem value="ASISTIDA" className="cursor-pointer">Asistidas</SelectItem>
                            <SelectItem value="ABANDONED" className="cursor-pointer">Abandonadas</SelectItem>
                            <SelectItem value="REJECTED" className="cursor-pointer">Rechazadas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor="sheet-step" className="text-xs font-medium text-gray-600">
                            Paso Actual
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Filtra por el paso actual del proceso</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Select 
                          value={currentStepFilter} 
                          onValueChange={(value) => setCurrentStepFilter(value as any)}
                        >
                          <SelectTrigger id="sheet-step" className="h-9 text-sm w-full cursor-pointer">
                            <SelectValue placeholder="Todos los pasos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="cursor-pointer">Todos los pasos</SelectItem>
                            <SelectItem value="1" className="cursor-pointer">Paso 1/6</SelectItem>
                            <SelectItem value="2" className="cursor-pointer">Paso 2/6</SelectItem>
                            <SelectItem value="3" className="cursor-pointer">Paso 3/6</SelectItem>
                            <SelectItem value="4" className="cursor-pointer">Paso 4/6</SelectItem>
                            <SelectItem value="5" className="cursor-pointer">Paso 5/6</SelectItem>
                            <SelectItem value="6" className="cursor-pointer">Paso 6/6</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Sección: Proceso de Onboarding */}
                  <div className="space-y-2.5 pt-3 border-t border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Proceso de Onboarding</h3>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="sheet-onboarding" className="text-xs font-medium text-gray-600">
                          Estado de Onboarding
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Filtra por el estado de la capacitación</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Select 
                        value={onboardingStatusFilter} 
                        onValueChange={(value) => setOnboardingStatusFilter(value as any)}
                      >
                        <SelectTrigger id="sheet-onboarding" className="h-9 text-sm w-full cursor-pointer">
                          <SelectValue placeholder="Todos los estados" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="cursor-pointer">Todos</SelectItem>
                          <SelectItem value="pending" className="cursor-pointer">Pendiente</SelectItem>
                          <SelectItem value="scheduled" className="cursor-pointer">Agendado</SelectItem>
                          <SelectItem value="completed" className="cursor-pointer">Completado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Sección: Estados de Proceso */}
                  <div className="space-y-2.5 pt-3 border-t border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Estados de Proceso</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor="sheet-contact" className="text-xs font-medium text-gray-600">
                            Estado de Contacto
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Filtra por si el driver ha sido contactado</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Select 
                          value={contactStatusFilter} 
                          onValueChange={(value) => setContactStatusFilter(value as any)}
                        >
                          <SelectTrigger id="sheet-contact" className="h-9 text-sm w-full cursor-pointer">
                            <SelectValue placeholder="Todos los estados" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="cursor-pointer">Todos</SelectItem>
                            <SelectItem value="contacted" className="cursor-pointer">Contactado</SelectItem>
                            <SelectItem value="pending" className="cursor-pointer">Pendiente</SelectItem>
                            <SelectItem value="not-applicable" className="cursor-pointer">No aplica</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor="sheet-docs" className="text-xs font-medium text-gray-600">
                            Estado de Documentos
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Filtra por el estado de los documentos</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Select 
                          value={documentStatusFilter} 
                          onValueChange={(value) => setDocumentStatusFilter(value as any)}
                        >
                          <SelectTrigger id="sheet-docs" className="h-9 text-sm w-full cursor-pointer">
                            <SelectValue placeholder="Todos los estados" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="cursor-pointer">Todos</SelectItem>
                            <SelectItem value="completos" className="cursor-pointer">Completos</SelectItem>
                            <SelectItem value="en-revision" className="cursor-pointer">En Revisión</SelectItem>
                            <SelectItem value="pendientes" className="cursor-pointer">Pendientes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor="sheet-payment" className="text-xs font-medium text-gray-600">
                            Estado de Pago
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Filtra por el estado de verificación de pago</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Select 
                          value={paymentStatusFilter} 
                          onValueChange={(value) => setPaymentStatusFilter(value as any)}
                        >
                          <SelectTrigger id="sheet-payment" className="h-9 text-sm w-full cursor-pointer">
                            <SelectValue placeholder="Todos los estados" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="cursor-pointer">Todos</SelectItem>
                            <SelectItem value="verificado" className="cursor-pointer">Verificado</SelectItem>
                            <SelectItem value="en-verificacion" className="cursor-pointer">En Verificación</SelectItem>
                            <SelectItem value="pendiente" className="cursor-pointer">Pendiente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor="sheet-invoice" className="text-xs font-medium text-gray-600">
                            Estado de Facturación
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Filtra por el estado de facturación</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Select 
                          value={invoiceStatusFilter} 
                          onValueChange={(value) => setInvoiceStatusFilter(value as any)}
                        >
                          <SelectTrigger id="sheet-invoice" className="h-9 text-sm w-full cursor-pointer">
                            <SelectValue placeholder="Todos los estados" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="cursor-pointer">Todos</SelectItem>
                            <SelectItem value="completa" className="cursor-pointer">Completa</SelectItem>
                            <SelectItem value="pendiente" className="cursor-pointer">Pendiente</SelectItem>
                            <SelectItem value="na" className="cursor-pointer">No Aplica</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Sección: Ordenamiento */}
                  <div className="space-y-2.5 pt-3 border-t border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Ordenamiento</h3>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="sheet-sort" className="text-xs font-medium text-gray-600">
                          Ordenar Por
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Selecciona cómo ordenar los resultados</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Select 
                        value={sortBy} 
                        onValueChange={(value) => setSortBy(value as any)}
                      >
                        <SelectTrigger id="sheet-sort" className="h-9 text-sm w-full cursor-pointer">
                          <SelectValue placeholder="Más recientes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="createdAt" className="cursor-pointer">Más recientes</SelectItem>
                          <SelectItem value="fullName" className="cursor-pointer">Nombre A-Z</SelectItem>
                          <SelectItem value="city" className="cursor-pointer">Ciudad A-Z</SelectItem>
                          <SelectItem value="currentStep" className="cursor-pointer">Por paso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TooltipProvider>

              <SheetFooter className="gap-2 pt-4 mt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="flex-1 h-9 text-sm"
                  disabled={!hasActiveFilters}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Limpiar
                </Button>
                <Button
                  onClick={handleApplyFilters}
                  className="flex-1 h-9 text-sm"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    'Aplicar Filtros'
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* Contador de resultados */}
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg text-sm whitespace-nowrap">
            <span className="font-semibold text-foreground">{total}</span>
            <span className="text-muted-foreground">resultado{total !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Quick Filters (Tabs) */}
        <div className="relative">
          <div className="flex flex-wrap items-end gap-1 pb-0">
            <button
              onClick={() => handleQuickFilter('all')}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border border-b-0 transition-all text-xs
                cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'all'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Todas</span>
            </button>
            <button
              onClick={() => handleQuickFilter('scheduled')}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border border-b-0 transition-all text-xs
                whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'scheduled'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Agendados</span>
            </button>
            <button
              onClick={() => handleQuickFilter('pending-schedule')}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border border-b-0 transition-all text-xs
                whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'pending-schedule'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pendiente de Agendar</span>
            </button>
            <button
              onClick={() => handleQuickFilter('review')}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border border-b-0 transition-all text-xs
                whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'review'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Revisar Postulación</span>
            </button>
            <button
              onClick={() => handleQuickFilter('pending-completion')}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border border-b-0 transition-all text-xs
                whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'pending-completion'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <Loader2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Postulación Pendiente</span>
            </button>
            <button
              onClick={() => handleQuickFilter('rejected')}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg border border-b-0 transition-all text-xs
                whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'rejected'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <XCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rechazados</span>
            </button>
          </div>
          
          {isPending ? (
            <Card className="rounded-t-none">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <PostulacionesTableExpandable
              postulaciones={postulacionesWithContactStatus}
              currentPage={currentPage}
              totalPages={totalPages}
              total={total}
              isPending={isPending}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </div>
  )
}