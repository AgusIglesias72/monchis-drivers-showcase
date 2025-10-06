// components/admin/postulaciones-page-content.tsx

"use client"

import { useState } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  TestTube,
  Database,
  Calendar as CalendarIcon,
  RotateCcw,
} from "lucide-react"

interface PostulacionesPageContentProps {
  stats: any
  postulaciones: any[]
  total: number
  currentStatus?: string
  currentSearch?: string
}

export function PostulacionesPageContent({
  stats: realStats,
  postulaciones: realPostulaciones,
  total: realTotal,
  currentStatus,
  currentSearch
}: PostulacionesPageContentProps) {
  const [useMockData, setUseMockData] = useState(true)
  const [searchTerm, setSearchTerm] = useState(currentSearch || '')
  const [statusFilter, setStatusFilter] = useState(currentStatus || 'all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Decidir qué datos usar
  const stats = useMockData ? {
    totalPostulaciones: 48,
    completadas: 12,
    enProgreso: 28,
    abandonadas: 8,
    nuevasUltimaSemana: 15,
    completadasUltimaSemana: 4,
    tasaCompletado: 25,
  } : realStats

  const handleSearch = () => {
    // En producción, esto actualizaría la URL y refrescaría los datos
    console.log('Buscar:', { searchTerm, statusFilter, startDate, endDate })
  }

  const handleResetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setStartDate('')
    setEndDate('')
    console.log('Filtros reseteados')
  }

  const handleExport = () => {
    console.log('Exportar datos')
    // Aquí iría la lógica de exportación
  }

  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader 
        breadcrumbs={[
          { label: "Postulaciones" }
        ]}
      />
      
      <div className="flex-1 p-8 space-y-8">
      {/* Header con Switch */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Postulaciones de Drivers</h1>
          <p className="text-muted-foreground mt-1">
            Gestión completa de las postulaciones del formulario
          </p>
        </div>

        {/* Switch Mock/Real */}
        <div className="flex items-center gap-3 bg-muted rounded-lg p-2">
          <div className="flex items-center gap-2">
            <TestTube className={`h-4 w-4 ${useMockData ? 'text-amber-600' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-medium ${useMockData ? 'text-foreground' : 'text-muted-foreground'}`}>
              Mock
            </span>
          </div>
          
          <button
            onClick={() => setUseMockData(!useMockData)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              useMockData ? 'bg-amber-500' : 'bg-green-500'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                useMockData ? 'translate-x-1' : 'translate-x-6'
              }`}
            />
          </button>
          
          <div className="flex items-center gap-2">
            <Database className={`h-4 w-4 ${!useMockData ? 'text-green-600' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-medium ${!useMockData ? 'text-foreground' : 'text-muted-foreground'}`}>
              Real
            </span>
          </div>
        </div>
      </div>

      {/* Badge de modo desarrollo */}
      {useMockData && (
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
          <TestTube className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-xs font-medium text-amber-900">
            Modo desarrollo: Mostrando datos de prueba
          </span>
        </div>
      )}

      {/* KPIs */}
      <PostulacionesKPIs stats={stats} />

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros y Búsqueda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primera fila: Búsqueda y Estado */}
          <div className="flex items-center gap-4">
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
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="COMPLETED">Completadas</SelectItem>
                <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
                <SelectItem value="ABANDONED">Abandonadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Segunda fila: Filtros de fecha */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="startDate" className="text-sm">Fecha de inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="endDate" className="text-sm">Fecha de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSearch} className="gap-2">
              <Search className="h-4 w-4" />
              Buscar
            </Button>

            <Button variant="outline" onClick={handleResetFilters} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Resetear Filtros
            </Button>

            <div className="flex-1" />

            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de postulaciones */}
      <PostulacionesTableExpandable 
        postulaciones={realPostulaciones}
        useMockData={useMockData}
      />
      </div>
    </div>
  )
}