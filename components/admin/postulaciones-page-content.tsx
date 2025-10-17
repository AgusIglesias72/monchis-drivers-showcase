// components/admin/postulaciones-page-content.tsx

"use client"

import { useState } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"

interface PostulacionesPageContentProps {
  stats: any
  postulaciones: any[]
  total: number
  currentStatus?: string
  currentSearch?: string
}

export function PostulacionesPageContent({
  stats,
  postulaciones,
  total,
  currentStatus,
  currentSearch
}: PostulacionesPageContentProps) {
  const [searchTerm, setSearchTerm] = useState(currentSearch || '')
  const [statusFilter, setStatusFilter] = useState(currentStatus || 'all')
  const [isExporting, setIsExporting] = useState(false)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    
    const queryString = params.toString()
    window.location.href = `/admin/postulaciones${queryString ? `?${queryString}` : ''}`
  }

  const handleResetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    window.location.href = '/admin/postulaciones'
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
        }),
      })

      if (!response.ok) {
        throw new Error('Error al exportar')
      }

      // Descargar el archivo
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
    <div className="flex flex-1 flex-col">
      <AdminHeader 
        breadcrumbs={[
          { label: "Postulaciones" }
        ]}
      />
      
      <div className="flex-1 p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Postulaciones de Drivers</h1>
          <p className="text-muted-foreground mt-1">
            Gestión completa de las postulaciones del formulario
          </p>
        </div>

        {/* KPIs */}
        <PostulacionesKPIs stats={stats} />

        {/* Filtros compactos */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {/* Búsqueda */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, cédula o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>

              {/* Filtro de estado */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="COMPLETED">Completadas</SelectItem>
                  <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
                  <SelectItem value="ABANDONED">Abandonadas</SelectItem>
                </SelectContent>
              </Select>

              {/* Botón buscar */}
              <Button onClick={handleSearch} className="cursor-pointer">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>

              {/* Botón reset */}
              <Button variant="outline" onClick={handleResetFilters} size="icon" className="cursor-pointer">
                <RotateCcw className="h-4 w-4" />
              </Button>

              {/* Botón exportar */}
              <Button 
                variant="outline" 
                onClick={handleExport} 
                className="gap-2 cursor-pointer"
                disabled={isExporting}
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exportando...' : 'Exportar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de postulaciones */}
        <PostulacionesTableExpandable 
          postulaciones={postulaciones}
        />
      </div>
    </div>
  )
}