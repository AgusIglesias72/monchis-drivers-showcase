// components/admin/postulaciones-page-content.tsx

"use client"

import { useState, useEffect } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
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
  }
}

type QuickFilter = 'all' | 'scheduled' | 'pending-schedule' | 'review' | 'pending-completion'

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
  
  // Estados locales para los filtros
  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '')
  const [statusFilter, setStatusFilter] = useState(currentFilters.status || 'all')
  const [onboardingStatusFilter, setOnboardingStatusFilter] = useState(currentFilters.onboardingStatus || 'all')
  const [startDate, setStartDate] = useState(currentFilters.startDate || '')
  const [endDate, setEndDate] = useState(currentFilters.endDate || '')
  const [isExporting, setIsExporting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter>('all')

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

  const applyFilters = (page: number = 1, quickFilter?: QuickFilter) => {
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
    if (searchTerm) params.set('search', searchTerm)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (page > 1) params.set('page', page.toString())
    
    const queryString = params.toString()
    router.push(`/admin/postulaciones${queryString ? `?${queryString}` : ''}`, { scroll: false })
  }

  const handleQuickFilter = (filter: QuickFilter) => {
    setIsSearching(true)
    setActiveQuickFilter(filter)
    
    // Resetear filtros manuales cuando se usa un filtro rápido
    if (filter !== 'all') {
      setStatusFilter('all')
      setOnboardingStatusFilter('all')
    }
    
    setTimeout(() => {
      applyFilters(1, filter)
    }, 100)
  }

  const handleSearch = () => {
    setIsSearching(true)
    setTimeout(() => {
      applyFilters(1)
    }, 100)
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setOnboardingStatusFilter('all')
    setStartDate('')
    setEndDate('')
    setActiveQuickFilter('all')
    router.push('/admin/postulaciones', { scroll: false })
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

  // Resetear loading cuando los datos cambian
  useEffect(() => {
    setIsSearching(false)
  }, [postulaciones])

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      
      {/* CONTENEDOR PRINCIPAL: Se ajusta al ancho disponible */}
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

        {/* Tabs de filtros rápidos */}
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeQuickFilter} onValueChange={(value) => handleQuickFilter(value as QuickFilter)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto gap-2">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Todas</span>
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Agendados</span>
                </TabsTrigger>
                <TabsTrigger value="pending-schedule" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Pendiente de Agendar</span>
                </TabsTrigger>
                <TabsTrigger value="review" className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Revisar Postulación</span>
                </TabsTrigger>
                <TabsTrigger value="pending-completion" className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Postulación Pendiente</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Filtros avanzados */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {/* Búsqueda */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="search" className="text-xs text-muted-foreground">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Nombre, cédula, teléfono o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-9"
                />
              </div>

              {/* Filtro de estado */}
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs text-muted-foreground">Estado</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status" className="h-9">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="COMPLETED">Completadas</SelectItem>
                    <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
                    <SelectItem value="ABANDONED">Abandonadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de onboarding */}
              <div className="space-y-1.5">
                <Label htmlFor="onboarding" className="text-xs text-muted-foreground">Onboarding</Label>
                <Select value={onboardingStatusFilter} onValueChange={setOnboardingStatusFilter}>
                  <SelectTrigger id="onboarding" className="h-9">
                    <SelectValue placeholder="Onboarding" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="completed">Realizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha desde */}
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs text-muted-foreground">Desde</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Fecha hasta */}
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs text-muted-foreground">Hasta</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t">
              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  onClick={handleSearch} 
                  size="sm" 
                  className="h-9"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Buscar
                    </>
                  )}
                </Button>

                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    onClick={handleClearFilters} 
                    size="sm"
                    className="h-9"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpiar filtros
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  onClick={handleExport} 
                  size="sm"
                  className="h-9"
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exportando...' : 'Exportar'}
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                Mostrando {postulaciones.length} de {total} postulaciones
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de postulaciones */}
        <div className="relative">
          {isSearching && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando postulaciones...</p>
              </div>
            </div>
          )}
          <PostulacionesTableExpandable 
            postulaciones={postulaciones}
          />
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Anterior</span>
                  </Button>
                  
                  {/* Botones de páginas */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page = i + 1
                      if (totalPages > 5) {
                        if (currentPage > 3) {
                          page = currentPage - 2 + i
                        }
                        if (page > totalPages) return null
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="w-9 h-9 p-0"
                        >
                          {page}
                        </Button>
                      )
                    }).filter(Boolean)}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}