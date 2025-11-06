// components/admin/postulaciones-page-content.tsx

"use client"

import { useState, useEffect, useCallback, useTransition, useMemo } from "react"
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
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getContactStatus } from "@/lib/utils/contact-status.utils"

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
  }, [router, statusFilter, onboardingStatusFilter, searchTerm, startDate, endDate, sortBy, sortOrder])

  const handleQuickFilter = (filter: QuickFilter) => {
    setActiveQuickFilter(filter)

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

  const setDatePreset = (preset: 'today' | 'week' | 'month') => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    switch (preset) {
      case 'today':
        setStartDate(todayStr)
        setEndDate(todayStr)
        break
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        setStartDate(weekAgo.toISOString().split('T')[0])
        setEndDate(todayStr)
        break
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        setStartDate(monthAgo.toISOString().split('T')[0])
        setEndDate(todayStr)
        break
    }
    
    setTimeout(() => applyFilters(1), 100)
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

      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Postulaciones</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Gestiona y revisa todas las postulaciones de drivers
          </p>
        </div>

        <PostulacionesKPIs stats={stats} />

        {/* ✅ FILTROS COMPACTOS */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros de Búsqueda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Primera fila: Búsqueda + Filtros principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Búsqueda */}
              <div className="lg:col-span-1">
                <Label htmlFor="search" className="text-xs text-muted-foreground mb-1.5 block">
                  Búsqueda
                </Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Nombre, cédula, teléfono, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-8 pr-8 h-8 text-sm "
                    disabled={isPending}
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => {
                        setSearchTerm('')
                        setTimeout(() => applyFilters(1), 100)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Estado postulación */}
              <div>
                <Label htmlFor="status" className="text-xs text-muted-foreground mb-1.5 block ">
                  Estado postulación
                </Label>
                <Select 
                  value={statusFilter} 
                  onValueChange={(value) => {
                    setStatusFilter(value)
                    setActiveQuickFilter('all')
                    setTimeout(() => applyFilters(1), 100)
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger id="status" className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📋 Todos los estados</SelectItem>
                    <SelectItem value="COMPLETED">✅ Completadas</SelectItem>
                    <SelectItem value="IN_PROGRESS">⏳ En Progreso</SelectItem>
                    <SelectItem value="ABANDONED">🚫 Abandonadas</SelectItem>
                    <SelectItem value="REJECTED">❌ Rechazadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Onboarding */}
              <div>
                <Label htmlFor="onboarding" className="text-xs text-muted-foreground mb-1.5 block">
                  Onboarding
                </Label>
                <Select 
                  value={onboardingStatusFilter} 
                  onValueChange={(value) => {
                    setOnboardingStatusFilter(value)
                    setActiveQuickFilter('all')
                    setTimeout(() => applyFilters(1), 100)
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger id="onboarding" className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📋 Todos</SelectItem>
                    <SelectItem value="pending">⏰ Pendiente</SelectItem>
                    <SelectItem value="scheduled">📅 Agendado</SelectItem>
                    <SelectItem value="completed">✓ Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ordenar por */}
              <div>
                <Label htmlFor="sortBy" className="text-xs text-muted-foreground mb-1.5 block">
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
                  <SelectTrigger id="sortBy" className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">🕐 Más recientes</SelectItem>
                    <SelectItem value="fullName">🔤 Nombre A-Z</SelectItem>
                    <SelectItem value="city">📍 Ciudad A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>



            {/* Footer - más compacto */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t">
                <Button
                  variant="ghost"
                  onClick={handleClearFilters}
                  size="sm"
                  className="h-7 text-xs"
                  disabled={isPending}
                >
                  <X className="h-3 w-3 mr-1.5" />
                  Limpiar todos los filtros
                </Button>
                
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{total} resultado{total !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabla con tabs */}
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
              <Calendar className="h-3.5 w-3.5" />
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