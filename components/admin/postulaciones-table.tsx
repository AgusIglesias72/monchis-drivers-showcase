// components/admin/postulaciones-table.tsx

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Search, 
  Download, 
  Eye, 
  Phone, 
  Mail,
  TestTube,
  Database,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

// ============ DATOS MOCK ============
const MOCK_POSTULACIONES = [
  {
    id: '1',
    cedula: '4.567.890',
    firstName: 'Juan',
    lastName: 'Pérez',
    fullName: 'Juan Pérez',
    phoneNumber: '+595981234567',
    email: 'juan.perez@email.com',
    department: 'Central',
    city: 'Asunción',
    hasVehicle: true,
    vehicleBrand: 'Honda',
    vehicleModel: 'Wave',
    vehicleYear: 2020,
    status: 'COMPLETED',
    currentStep: 7,
    completedSteps: [1, 2, 3, 4, 5, 6, 7],
    startedAt: new Date('2025-10-01T10:30:00'),
    completedAt: new Date('2025-10-01T11:45:00'),
    workZone: 'Centro,Carmelitas'
  },
  {
    id: '2',
    cedula: '5.123.456',
    firstName: 'María',
    lastName: 'González',
    fullName: 'María González',
    phoneNumber: '+595982345678',
    email: 'maria.gonzalez@email.com',
    department: 'Central',
    city: 'Lambaré',
    hasVehicle: true,
    vehicleBrand: 'Yamaha',
    vehicleModel: 'Crypton',
    vehicleYear: 2019,
    status: 'IN_PROGRESS',
    currentStep: 4,
    completedSteps: [1, 2, 3, 4],
    startedAt: new Date('2025-10-05T14:20:00'),
    completedAt: null,
    workZone: 'Lambaré,Fernando de la Mora'
  },
  {
    id: '3',
    cedula: '3.987.654',
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    fullName: 'Carlos Rodríguez',
    phoneNumber: '+595983456789',
    email: 'carlos.rodriguez@email.com',
    department: 'Central',
    city: 'San Lorenzo',
    hasVehicle: false,
    vehicleBrand: null,
    vehicleModel: null,
    vehicleYear: null,
    status: 'COMPLETED',
    currentStep: 7,
    completedSteps: [1, 2, 3, 4, 5, 6, 7],
    startedAt: new Date('2025-10-03T09:15:00'),
    completedAt: new Date('2025-10-03T10:30:00'),
    workZone: 'Centro,Luque'
  },
  {
    id: '4',
    cedula: '6.234.567',
    firstName: 'Ana',
    lastName: 'Martínez',
    fullName: 'Ana Martínez',
    phoneNumber: '+595984567890',
    email: 'ana.martinez@email.com',
    department: 'Central',
    city: 'Fernando de la Mora',
    hasVehicle: true,
    vehicleBrand: 'Honda',
    vehicleModel: 'Biz',
    vehicleYear: 2021,
    status: 'ABANDONED',
    currentStep: 2,
    completedSteps: [1, 2],
    startedAt: new Date('2025-10-04T16:45:00'),
    completedAt: null,
    workZone: null
  },
]

interface PostulacionesTableProps {
  postulaciones: any[]
  total: number
  currentStatus?: string
  currentSearch?: string
}

export function PostulacionesTable({ 
  postulaciones: realPostulaciones, 
  total: realTotal,
  currentStatus,
  currentSearch 
}: PostulacionesTableProps) {
  const router = useRouter()
  const [useMockData, setUseMockData] = useState(true)
  const [searchTerm, setSearchTerm] = useState(currentSearch || '')
  const [statusFilter, setStatusFilter] = useState(currentStatus || 'all')

  // Decidir qué datos usar
  const postulaciones = useMockData ? MOCK_POSTULACIONES : realPostulaciones
  const total = useMockData ? MOCK_POSTULACIONES.length : realTotal

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (searchTerm) params.set('search', searchTerm)
    router.push(`/admin/postulaciones?${params.toString()}`)
  }

  const handleStatusChange = (status: string) => {
    setStatusFilter(status)
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (searchTerm) params.set('search', searchTerm)
    router.push(`/admin/postulaciones?${params.toString()}`)
  }

  return (
    <Card className="p-6">
      {/* Header con Switch */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Lista de Postulaciones</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {total} postulación{total !== 1 ? 'es' : ''} encontrada{total !== 1 ? 's' : ''}
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
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5 mb-4">
            <TestTube className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-900">
              Modo desarrollo: Mostrando datos de prueba
            </span>
          </div>
        )}

        {/* Filtros */}
        <div className="flex items-center gap-4">
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

          <Select value={statusFilter} onValueChange={handleStatusChange}>
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

          <Button onClick={handleSearch} variant="default">
            Buscar
          </Button>

          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Postulante
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Vehículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Progreso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-background divide-y">
              {postulaciones.map((postulacion) => (
                <tr key={postulacion.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-foreground">
                        {postulacion.fullName || `${postulacion.firstName} ${postulacion.lastName}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        CI: {postulacion.cedula}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-1 text-foreground">
                        <Phone className="h-3 w-3" />
                        {postulacion.phoneNumber}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {postulacion.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-foreground">{postulacion.city}</div>
                      <div className="text-muted-foreground">{postulacion.department}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {postulacion.hasVehicle ? (
                      <div className="text-sm">
                        <div className="font-medium text-foreground">
                          {postulacion.vehicleBrand} {postulacion.vehicleModel}
                        </div>
                        <div className="text-muted-foreground">Año {postulacion.vehicleYear}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Sin vehículo</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden max-w-[100px]">
                        <div
                          className="bg-primary h-full transition-all"
                          style={{ width: `${(postulacion.currentStep / 7) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {postulacion.currentStep}/7
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={postulacion.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(postulacion.startedAt).toLocaleDateString('es-PY')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => router.push(`/admin/postulaciones/${postulacion.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                      Ver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {postulaciones.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground font-medium">No se encontraron postulaciones</p>
            <p className="text-sm text-muted-foreground mt-1">
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    COMPLETED: {
      label: 'Completada',
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 hover:bg-green-100'
    },
    IN_PROGRESS: {
      label: 'En Progreso',
      variant: 'secondary' as const,
      className: 'bg-amber-100 text-amber-800 hover:bg-amber-100'
    },
    ABANDONED: {
      label: 'Abandonada',
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-800 hover:bg-red-100'
    },
    SUBMITTED: {
      label: 'Enviada',
      variant: 'outline' as const,
      className: 'bg-blue-100 text-blue-800 hover:bg-blue-100'
    }
  }

  const { label, className } = config[status as keyof typeof config] || config.IN_PROGRESS

  return (
    <Badge className={className}>
      {label}
    </Badge>
  )
}