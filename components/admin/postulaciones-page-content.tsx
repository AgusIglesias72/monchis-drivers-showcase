// components/admin/postulaciones-page-content.tsx

"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { PostulacionesKPIs } from "@/components/admin/postulaciones-kpis"
import { PostulacionesTableExpandable } from "@/components/admin/postulaciones-table-expandable"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  ClipboardCheck,
  Clock,
  FileCheck,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PostulacionesPageContentProps {
  stats: any
  postulaciones: any[]
  total: number
  currentPage: number
  totalPages: number
  hasMore: boolean
  currentFilters: {
    status?: string
    search?: string
    onboardingStatus?: string
    hasVehicle?: string
    startDate?: string
    endDate?: string
    sortBy?: string
    sortOrder?: string
  }
}

type QuickFilter = 'all' | 'scheduled' | 'pending-schedule' | 'review' | 'pending-completion'

// ✅ Hook personalizado para debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

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

  // Estados locales para los filtros
  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '')
  const [statusFilter, setStatusFilter] = useState(currentFilters.status || 'all')
  const [onboardingStatusFilter, setOnboardingStatusFilter] = useState(currentFilters.onboardingStatus || 'all')
  const [startDate, setStartDate] = useState(currentFilters.startDate || '')
  const [endDate, setEndDate] = useState(currentFilters.endDate || '')
  const [sortBy, setSortBy] = useState(currentFilters.sortBy || 'createdAt')
  const [sortOrder, setSortOrder] = useState(currentFilters.sortOrder || 'desc')
  const [isExporting, setIsExporting] = useState(false)
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter>('all')

  // ✅ Debounce para búsqueda (500ms)
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  // Determinar el filtro rápido activo basado en los filtros actuales
  useEffect(() => {
    if (onboardingStatusFilter === 'scheduled') {
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

  // ✅ Auto-search cuando el debounced value cambia
  useEffect(() => {
    if (debouncedSearchTerm !== currentFilters.search) {
      applyFilters(1)
    }
  }, [debouncedSearchTerm])

  const applyFilters = useCallback((page: number = 1, quickFilter?: QuickFilter) => {
    const params = new URLSearchParams()

    // Si se especifica un filtro rápido, aplicar esos filtros
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
        // 'all' no agrega filtros especiales
      }
    } else {
      // Aplicar filtros manuales
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (onboardingStatusFilter !== 'all') params.set('onboardingStatus', onboardingStatusFilter)
    }

    // Filtros adicionales que siempre se aplican
    if (debouncedSearchTerm) params.set('search', debouncedSearchTerm)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy)
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder)
    if (page > 1) params.set('page', page.toString())

    const queryString = params.toString()
    
    // ✅ Usar startTransition para hacer la navegación no bloqueante
    startTransition(() => {
      router.push(`/admin/postulaciones${queryString ? `?${queryString}` : ''}`, { scroll: false })
    })
  }, [router, statusFilter, onboardingStatusFilter, debouncedSearchTerm, startDate, endDate, sortBy, sortOrder])

  const handleQuickFilter = (filter: QuickFilter) => {
    setActiveQuickFilter(filter)

    // Resetear filtros manuales cuando se usa un filtro rápido
    if (filter !== 'all') {
      setStatusFilter('all')
      setOnboardingStatusFilter('all')
    }

    applyFilters(1, filter)
  }

  const handleSearch = () => {
    applyFilters(1)
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setOnboardingStatusFilter('all')
    setStartDate('')
    setEndDate('')
    setSortBy('createdAt')
    setSortOrder('desc')
    setActiveQuickFilter('all')
    
    startTransition(() => {
      router.push('/admin/postulaciones', { scroll: false })
    })
  }

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || onboardingStatusFilter !== 'all' || startDate || endDate

  const handlePageChange = (newPage: number) => {
    applyFilters(newPage, activeQuickFilter === 'all' ? undefined : activeQuickFilter)
  }

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const response = await fetch('/api/admin/postulaciones/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          searchTerm: searchTerm || undefined,
          onboardingStatus: onboardingStatusFilter !== 'all' ? onboardingStatusFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      })

      if (!response.ok) throw new Error('Error al exportar')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `postulaciones_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Datos exportados correctamente')
    } catch (error) {
      console.error('Error al exportar:', error)
      toast.error('Error al exportar los datos')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        breadcrumbs={[
          { label: "Postulaciones", href: "/admin/postulaciones" },
        ]}
      />

      {/* CONTENEDOR PRINCIPAL */}
      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Postulaciones</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Gestiona y revisa todas las postulaciones de drivers
          </p>
        </div>

        {/* KPIs */}
        <PostulacionesKPIs stats={stats} />

        {/* Filtros avanzados */}
        <Card className="-mt-[1px] relative z-0">
          <CardHeader className="">
            <CardTitle className="text-lg">Filtros de Búsqueda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Búsqueda y filtros en una línea */}
            <div className="flex flex-wrap items-end gap-2">
              {/* Búsqueda */}
              <div className="relative w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  id="search"
                  placeholder="Buscar por nombre, cédula, teléfono o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9 pr-9 h-9 text-sm"
                  disabled={isPending}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
                    onClick={() => {
                      setSearchTerm('')
                      setTimeout(() => applyFilters(1), 100)
                    }}
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                {isPending && debouncedSearchTerm !== searchTerm && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Estado postulación */}
              <div className="space-y-1.5 flex-1 min-w-[150px]">
                <Label htmlFor="status" className="text-xs font-medium text-muted-foreground">
                  Estado postulación
                </Label>
                <Select 
                  value={statusFilter} 
                  onValueChange={(value) => {
                    setStatusFilter(value)
                    setTimeout(() => applyFilters(1), 100)
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger id="status" className="h-9 text-sm w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="COMPLETED">Completadas</SelectItem>
                    <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
                    <SelectItem value="ABANDONED">Abandonadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Onboarding */}
              <div className="space-y-1.5 flex-1 min-w-[140px]">
                <Label htmlFor="onboarding" className="text-xs font-medium text-muted-foreground">
                  Onboarding
                </Label>
                <Select 
                  value={onboardingStatusFilter} 
                  onValueChange={(value) => {
                    setOnboardingStatusFilter(value)
                    setTimeout(() => applyFilters(1), 100)
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger id="onboarding" className="h-9 text-sm w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ordenar por */}
              <div className="space-y-1.5 flex-1 min-w-[140px]">
                <Label htmlFor="sortBy" className="text-xs font-medium text-muted-foreground">
                  Ordenar por
                </Label>
                <Select 
                  value={sortBy} 
                  onValueChange={(value) => {
                    setSortBy(value)
                    setTimeout(() => applyFilters(1), 100)
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger id="sortBy" className="h-9 text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Más recientes</SelectItem>
                    <SelectItem value="fullName">Nombre A-Z</SelectItem>
                    <SelectItem value="city">Ciudad A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha desde */}
              <div className="space-y-1.5 flex-1 min-w-[140px]">
                <Label htmlFor="startDate" className="text-xs font-medium text-muted-foreground">
                  Desde
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setTimeout(() => applyFilters(1), 100)
                  }}
                  className="h-9 text-sm w-full"
                  disabled={isPending}
                />
              </div>

              {/* Fecha hasta */}
              <div className="space-y-1.5 flex-1 min-w-[140px]">
                <Label htmlFor="endDate" className="text-xs font-medium text-muted-foreground">
                  Hasta
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setTimeout(() => applyFilters(1), 100)
                  }}
                  className="h-9 text-sm w-full"
                  disabled={isPending}
                />
              </div>

              {/* Exportar */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground opacity-0 select-none">
                  _
                </Label>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  size="sm"
                  className="h-9 whitespace-nowrap"
                  disabled={isExporting || isPending}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5 mr-2" />
                      Exportar
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Footer con acciones */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                <Button
                  variant="ghost"
                  onClick={handleClearFilters}
                  size="sm"
                  className="h-7 text-xs"
                  disabled={isPending}
                >
                  <X className="h-3 w-3 mr-1.5" />
                  Limpiar filtros
                </Button>
                
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span>Filtros activos</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabla de postulaciones */}
        <div className="relative">
          <div className="flex flex-wrap items-end gap-1 pb-0">
            <button
              onClick={() => handleQuickFilter('all')}
              disabled={isPending}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border border-b-0 transition-all
                cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'all'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Todas</span>
            </button>
            <button
              onClick={() => handleQuickFilter('scheduled')}
              disabled={isPending}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border border-b-0 transition-all 
                whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'scheduled'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Agendados</span>
            </button>
            <button
              onClick={() => handleQuickFilter('pending-schedule')}
              disabled={isPending}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border border-b-0 transition-all 
                whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'pending-schedule'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Pendiente de Agendar</span>
            </button>
            <button
              onClick={() => handleQuickFilter('review')}
              disabled={isPending}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border border-b-0 transition-all 
                whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'review'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Revisar Postulación</span>
            </button>
            <button
              onClick={() => handleQuickFilter('pending-completion')}
              disabled={isPending}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border border-b-0 transition-all 
                whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                ${activeQuickFilter === 'pending-completion'
                  ? 'bg-white border-gray-200 shadow-sm font-medium text-foreground relative z-10'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
            >
              <Loader2 className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Postulación Pendiente</span>
            </button>
          </div>
          
          {/* Skeleton durante la carga */}
          {isPending ? (
            <Card className="rounded-t-none">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header de la tabla skeleton */}
                  <div className="flex items-center gap-4 pb-3 border-b">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </div>
                  
                  {/* Filas skeleton */}
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-4 border-b">
                      <Skeleton className="h-4 w-4" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <PostulacionesTableExpandable
              postulaciones={postulaciones}
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