// components/admin/postulaciones-table-expandable.tsx

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChevronDown,
  ChevronRight,
  MoreVertical,
  CheckCircle,
  XCircle,
  Eye,
  Mail,
  Phone,
  MapPin,
  User,
  Clock,
  FileText,
  Bike,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

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
    neighborhood: 'Centro',
    address: 'Av. España 1234',
    hasVehicle: true,
    vehicleBrand: 'Honda',
    vehicleModel: 'Wave',
    vehicleYear: 2020,
    vehiclePlate: 'ABC123',
    status: 'COMPLETED',
    currentStep: 5,
    completedSteps: [1, 2, 3, 4, 5],
    startedAt: new Date('2025-10-01T10:30:00'),
    completedAt: new Date('2025-10-01T11:45:00'),
    workZone: 'Centro,Carmelitas',
    emergencyName: 'María Pérez',
    emergencyPhone: '+595981234568',
    emergencyRelationship: 'Hermana',
    experience: 'Más de 3 años',
    availability: ['Mañana', 'Tarde'],
    whenCanStart: 'Inmediatamente',
    timeline: [
      { step: 1, name: 'Contacto Básico', completedAt: new Date('2025-10-01T10:32:00') },
      { step: 2, name: 'Datos Personales', completedAt: new Date('2025-10-01T10:35:00') },
      { step: 3, name: 'Trabajo y Vehículo', completedAt: new Date('2025-10-01T10:38:00') },
      { step: 4, name: 'Documentos', completedAt: new Date('2025-10-01T11:25:00') },
      { step: 5, name: 'Información Adicional', completedAt: new Date('2025-10-01T11:35:00') },
    ],
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
    neighborhood: 'Centro',
    address: 'Calle Principal 567',
    hasVehicle: true,
    vehicleBrand: 'Yamaha',
    vehicleModel: 'Crypton',
    vehicleYear: 2019,
    vehiclePlate: 'XYZ789',
    status: 'IN_PROGRESS',
    currentStep: 3,
    completedSteps: [1, 2, 3],
    startedAt: new Date('2025-10-05T14:20:00'),
    completedAt: null,
    workZone: 'Lambaré,Fernando de la Mora',
    emergencyName: null,
    emergencyPhone: null,
    emergencyRelationship: null,
    experience: 'Sin experiencia',
    availability: ['Tarde', 'Noche'],
    whenCanStart: 'La próxima semana',
    timeline: [
      { step: 1, name: 'Contacto Básico', completedAt: new Date('2025-10-05T14:22:00') },
      { step: 2, name: 'Datos Personales', completedAt: new Date('2025-10-05T14:28:00') },
      { step: 3, name: 'Trabajo y Vehículo', completedAt: new Date('2025-10-05T14:35:00') },
      { step: 4, name: 'Documentos', completedAt: null },
      { step: 5, name: 'Información Adicional', completedAt: null },
    ],
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
    neighborhood: 'San Miguel',
    address: 'Barrio Obrero 890',
    hasVehicle: false,
    vehicleBrand: null,
    vehicleModel: null,
    vehicleYear: null,
    vehiclePlate: null,
    status: 'COMPLETED',
    currentStep: 5,
    completedSteps: [1, 2, 3, 4, 5],
    startedAt: new Date('2025-10-03T09:15:00'),
    completedAt: new Date('2025-10-03T10:30:00'),
    workZone: 'Centro,Luque',
    emergencyName: 'Ana Rodríguez',
    emergencyPhone: '+595983456790',
    emergencyRelationship: 'Esposa',
    experience: '1-3 años',
    availability: ['Mañana'],
    whenCanStart: 'Esta semana',
    timeline: [
      { step: 1, name: 'Contacto Básico', completedAt: new Date('2025-10-03T09:17:00') },
      { step: 2, name: 'Datos Personales', completedAt: new Date('2025-10-03T09:22:00') },
      { step: 3, name: 'Trabajo y Vehículo', completedAt: new Date('2025-10-03T09:28:00') },
      { step: 4, name: 'Documentos', completedAt: new Date('2025-10-03T10:05:00') },
      { step: 5, name: 'Información Adicional', completedAt: new Date('2025-10-03T10:30:00') },
    ],
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
    neighborhood: 'Zona Norte',
    address: 'Calle 15 de Agosto 456',
    hasVehicle: true,
    vehicleBrand: 'Honda',
    vehicleModel: 'Biz',
    vehicleYear: 2021,
    vehiclePlate: 'DEF456',
    status: 'ABANDONED',
    currentStep: 2,
    completedSteps: [1, 2],
    startedAt: new Date('2025-10-04T16:45:00'),
    completedAt: null,
    workZone: null,
    emergencyName: null,
    emergencyPhone: null,
    emergencyRelationship: null,
    experience: null,
    availability: [],
    whenCanStart: null,
    timeline: [
      { step: 1, name: 'Contacto Básico', completedAt: new Date('2025-10-04T16:47:00') },
      { step: 2, name: 'Datos Personales', completedAt: new Date('2025-10-04T16:50:00') },
      { step: 3, name: 'Trabajo y Vehículo', completedAt: null },
      { step: 4, name: 'Documentos', completedAt: null },
      { step: 5, name: 'Información Adicional', completedAt: null },
    ],
  },
]

type SortField = 'fullName' | 'city' | 'status' | 'startedAt'
type SortOrder = 'asc' | 'desc' | null

interface PostulacionesTableProps {
  postulaciones?: any[]
  useMockData?: boolean
}

export function PostulacionesTableExpandable({ 
  postulaciones: realPostulaciones = [],
  useMockData = true 
}: PostulacionesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  const postulaciones = useMockData ? MOCK_POSTULACIONES : realPostulaciones

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else if (sortOrder === 'desc') {
        setSortOrder(null)
        setSortField(null)
      }
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const sortedPostulaciones = [...postulaciones].sort((a, b) => {
    if (!sortField || !sortOrder) return 0

    let aValue: any = a[sortField]
    let bValue: any = b[sortField]

    if (sortField === 'startedAt') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.ceil(sortedPostulaciones.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPostulaciones = sortedPostulaciones.slice(startIndex, endIndex)

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const handleAction = (action: string, postulacion: any) => {
    console.log(`Acción: ${action}`, postulacion)
  }

  const handleViewDetails = (postulacionId: string) => {
    console.log('Ver detalles de postulación:', postulacionId)
    window.location.href = `/admin/postulaciones/${postulacionId}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Postulaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left w-10"></th>
                  
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    onClick={() => handleSort('fullName')}
                  >
                    <div className="flex items-center gap-2">
                      Postulante
                      <SortIcon field="fullName" currentField={sortField} order={sortOrder} />
                    </div>
                  </th>
                  
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Contacto
                  </th>
                  
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    onClick={() => handleSort('city')}
                  >
                    <div className="flex items-center gap-2">
                      Ciudad
                      <SortIcon field="city" currentField={sortField} order={sortOrder} />
                    </div>
                  </th>
                  
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Progreso
                  </th>
                  
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Estado
                      <SortIcon field="status" currentField={sortField} order={sortOrder} />
                    </div>
                  </th>
                  
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    onClick={() => handleSort('startedAt')}
                  >
                    <div className="flex items-center gap-2">
                      Fecha
                      <SortIcon field="startedAt" currentField={sortField} order={sortOrder} />
                    </div>
                  </th>
                  
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase w-24">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y">
                {paginatedPostulaciones.map((postulacion) => {
                  const isExpanded = expandedRows.has(postulacion.id)
                  
                  return (
                    <>
                      {/* Fila principal */}
                      <tr 
                        key={postulacion.id} 
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 cursor-pointer"
                            onClick={() => toggleRow(postulacion.id)}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium text-foreground">
                              {postulacion.fullName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              CI: {postulacion.cedula}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-1 text-foreground">
                              <Phone className="h-3 w-3" />
                              <span className="text-xs">{postulacion.phoneNumber}</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="text-xs">{postulacion.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-foreground">{postulacion.city}</div>
                            <div className="text-muted-foreground">{postulacion.department}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden max-w-[100px]">
                              <div
                                className="bg-primary h-full transition-all"
                                style={{ width: `${(postulacion.currentStep / 5) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                              {postulacion.currentStep}/5
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={postulacion.status} />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(postulacion.startedAt).toLocaleDateString('es-PY')}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                                variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 cursor-pointer"
                              onClick={() => handleViewDetails(postulacion.id)}
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 cursor-pointer"
                                  title="Acciones"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleAction('contactar', postulacion)}>
                                  <Phone className="h-4 w-4 mr-2" />
                                  Contactar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleAction('aprobar', postulacion)}
                                  className="text-green-600 cursor-pointer"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Aprobar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleAction('rechazar', postulacion)}
                                  className="text-red-600 cursor-pointer"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Rechazar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>

{/* Fila expandida - DISEÑO MEJORADO */}
{isExpanded && (
  <tr>
    <td colSpan={8} className="px-6 py-6 bg-muted/20">
      <div className="space-y-6">
        {/* Grid principal: 2 columnas balanceadas */}
        <div className="grid grid-cols-2 gap-8">
          {/* Columna izquierda: Info Personal + Ubicación */}
          <div className="space-y-6">
            {/* Info Personal */}
            <div className="space-y-3">
              <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                INFORMACIÓN PERSONAL
              </h5>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <InfoRow label="Nombre" value={postulacion.fullName} />
                <InfoRow label="Cédula" value={postulacion.cedula} />
                <InfoRow label="Teléfono" value={postulacion.phoneNumber} />
                <InfoRow label="Email" value={postulacion.email} />
              </div>
            </div>

            {/* Ubicación */}
            <div className="space-y-3 pt-3 border-t">
              <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                UBICACIÓN
              </h5>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <InfoRow label="Departamento" value={postulacion.department} />
                <InfoRow label="Ciudad" value={postulacion.city} />
                <InfoRow label="Barrio" value={postulacion.neighborhood || '-'} />
                <InfoRow label="Dirección" value={postulacion.address} />
              </div>
            </div>

            {/* Contacto de Emergencia */}
            {postulacion.emergencyName && (
              <div className="space-y-3 pt-3 border-t">
                <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  CONTACTO DE EMERGENCIA
                </h5>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <InfoRow label="Nombre" value={postulacion.emergencyName} />
                  <InfoRow label="Relación" value={postulacion.emergencyRelationship} />
                  <InfoRow label="Teléfono" value={postulacion.emergencyPhone} />
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha: Vehículo + Zonas + Info Adicional */}
          <div className="space-y-6">
            {/* Vehículo */}
            <div className="space-y-3">
              <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Bike className="h-3.5 w-3.5" />
                VEHÍCULO
              </h5>
              {postulacion.hasVehicle ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <InfoRow label="Marca" value={postulacion.vehicleBrand} />
                  <InfoRow label="Modelo" value={postulacion.vehicleModel} />
                  <InfoRow label="Año" value={postulacion.vehicleYear} />
                  <InfoRow label="Placa" value={postulacion.vehiclePlate} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No posee vehículo</p>
              )}
            </div>

            {/* Zonas de Trabajo */}
            {postulacion.workZone && (
              <div className="space-y-3 pt-3 border-t">
                <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  ZONAS DE TRABAJO
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {postulacion.workZone.split(',').map((zone: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {zone}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Información Adicional */}
            {postulacion.experience && (
              <div className="space-y-3 pt-3 border-t">
                <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  INFORMACIÓN ADICIONAL
                </h5>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <InfoRow label="Experiencia" value={postulacion.experience} />
                  <InfoRow label="Puede empezar" value={postulacion.whenCanStart || '-'} />
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground block">Disponibilidad</span>
                    <span className="font-medium text-xs">{postulacion.availability?.join(', ') || '-'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline visual - Ancho completo abajo */}
        {postulacion.timeline && postulacion.timeline.length > 0 && (
          <div className="pt-6 border-t">
            <h5 className="text-xs font-semibold text-muted-foreground mb-4 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              HISTORIAL DEL PROCESO
            </h5>
            <div className="relative">
              {/* Línea horizontal de fondo */}
              <div className="absolute top-6 left-0 right-0 h-0.5 bg-muted" />
              
              {/* Línea de progreso */}
              <div 
                className="absolute top-6 left-0 h-0.5 bg-primary transition-all duration-500"
                style={{ 
                  width: `${((postulacion.completedSteps.length - 1) / (postulacion.timeline.length - 1)) * 100}%` 
                }}
              />
              
              {/* Steps */}
              <div className="relative grid grid-cols-5 gap-2">
                {postulacion.timeline.map((step: any) => {
                  const isCompleted = postulacion.completedSteps.includes(step.step)
                  
                  return (
                    <div key={step.step} className="text-center">
                      {/* Círculo del step */}
                      <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold mb-3 transition-all ${
                        isCompleted
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {step.step}
                      </div>
                      
                      {/* Nombre del step */}
                      <p className="text-xs font-medium text-foreground mb-1 px-1">
                        {step.name}
                      </p>
                      
                      {/* Hora de completado */}
                      {step.completedAt && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(step.completedAt).toLocaleTimeString('es-PY', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </td>
  </tr>
)}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>

          {postulaciones.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-medium">No hay postulaciones</p>
            </div>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1}-{Math.min(endIndex, sortedPostulaciones.length)} de {sortedPostulaciones.length} postulaciones
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    COMPLETED: {
      label: 'Completada',
      className: 'bg-green-100 text-green-800 hover:bg-green-100'
    },
    IN_PROGRESS: {
      label: 'En Progreso',
      className: 'bg-amber-100 text-amber-800 hover:bg-amber-100'
    },
    ABANDONED: {
      label: 'Abandonada',
      className: 'bg-red-100 text-red-800 hover:bg-red-100'
    },
  }

  const { label, className } = config[status as keyof typeof config] || config.IN_PROGRESS

  return (
    <Badge className={className}>
      {label}
    </Badge>
  )
}

function SortIcon({ 
  field, 
  currentField, 
  order 
}: { 
  field: string
  currentField: string | null
  order: SortOrder 
}) {
  if (currentField !== field) {
    return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
  }
  
  if (order === 'asc') {
    return <ArrowUp className="h-3.5 w-3.5 text-foreground" />
  }
  
  if (order === 'desc') {
    return <ArrowDown className="h-3.5 w-3.5 text-foreground" />
  }
  
  return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
}

function InfoRow({ label, value }: { label: string, value: string | number }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground block">{label}</span>
      <span className="font-medium text-xs">{value}</span>
    </div>
  )
}