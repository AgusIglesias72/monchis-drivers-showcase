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
  Calendar,
  Car,
  User,
  Clock,
  FileText,
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
    currentStep: 7,
    completedSteps: [1, 2, 3, 4, 5, 6, 7],
    startedAt: new Date('2025-10-01T10:30:00'),
    completedAt: new Date('2025-10-01T11:45:00'),
    workZone: 'Centro,Carmelitas',
    emergencyName: 'María Pérez',
    emergencyPhone: '+595981234568',
    emergencyRelationship: 'Hermana',
    experience: 'si',
    whenCanStart: 'inmediato',
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
    currentStep: 4,
    completedSteps: [1, 2, 3, 4],
    startedAt: new Date('2025-10-05T14:20:00'),
    completedAt: null,
    workZone: 'Lambaré,Fernando de la Mora',
    emergencyName: null,
    emergencyPhone: null,
    emergencyRelationship: null,
    experience: null,
    whenCanStart: null,
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
    currentStep: 7,
    completedSteps: [1, 2, 3, 4, 5, 6, 7],
    startedAt: new Date('2025-10-03T09:15:00'),
    completedAt: new Date('2025-10-03T10:30:00'),
    workZone: 'Centro,Luque',
    emergencyName: 'Ana Rodríguez',
    emergencyPhone: '+595983456790',
    emergencyRelationship: 'Esposa',
    experience: 'no',
    whenCanStart: 'esta_semana',
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
    whenCanStart: null,
  },
]

interface PostulacionesTableProps {
  postulaciones?: any[]
  useMockData?: boolean
}

export function PostulacionesTableExpandable({ 
  postulaciones: realPostulaciones = [],
  useMockData = true 
}: PostulacionesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  
  const postulaciones = useMockData ? MOCK_POSTULACIONES : realPostulaciones

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
    // Aquí irían las acciones reales
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-10"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Postulante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Contacto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Ciudad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Progreso
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase w-20">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y">
                {postulaciones.map((postulacion) => {
                  const isExpanded = expandedRows.has(postulacion.id)
                  
                  return (
                    <>
                      {/* Fila principal */}
                      <tr 
                        key={postulacion.id} 
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-4" onClick={() => toggleRow(postulacion.id)}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </td>
                        <td className="px-4 py-4" onClick={() => toggleRow(postulacion.id)}>
                          <div>
                            <div className="font-medium text-foreground">
                              {postulacion.fullName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              CI: {postulacion.cedula}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4" onClick={() => toggleRow(postulacion.id)}>
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
                        <td className="px-4 py-4" onClick={() => toggleRow(postulacion.id)}>
                          <div className="text-sm">
                            <div className="font-medium text-foreground">{postulacion.city}</div>
                            <div className="text-muted-foreground">{postulacion.department}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4" onClick={() => toggleRow(postulacion.id)}>
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
                        <td className="px-4 py-4" onClick={() => toggleRow(postulacion.id)}>
                          <StatusBadge status={postulacion.status} />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground" onClick={() => toggleRow(postulacion.id)}>
                          {new Date(postulacion.startedAt).toLocaleDateString('es-PY')}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleAction('ver', postulacion)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction('contactar', postulacion)}>
                                <Phone className="h-4 w-4 mr-2" />
                                Contactar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleAction('aprobar', postulacion)}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aprobar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleAction('rechazar', postulacion)}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Rechazar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>

                      {/* Fila expandida con detalles */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="px-4 py-4 bg-muted/20">
                            <div className="grid grid-cols-2 gap-6">
                              {/* Columna izquierda */}
                              <div className="space-y-4">
                                {/* Información Personal */}
                                <div>
                                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Información Personal
                                  </h4>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Nombre:</span>
                                      <p className="font-medium">{postulacion.firstName}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Apellido:</span>
                                      <p className="font-medium">{postulacion.lastName}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Cédula:</span>
                                      <p className="font-medium">{postulacion.cedula}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Teléfono:</span>
                                      <p className="font-medium">{postulacion.phoneNumber}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-muted-foreground">Email:</span>
                                      <p className="font-medium">{postulacion.email}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Ubicación */}
                                <div>
                                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Ubicación
                                  </h4>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Departamento:</span>
                                      <p className="font-medium">{postulacion.department}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Ciudad:</span>
                                      <p className="font-medium">{postulacion.city}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Barrio:</span>
                                      <p className="font-medium">{postulacion.neighborhood}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-muted-foreground">Dirección:</span>
                                      <p className="font-medium">{postulacion.address}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Vehículo */}
                                <div>
                                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                    <Car className="h-4 w-4" />
                                    Vehículo
                                  </h4>
                                  {postulacion.hasVehicle ? (
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Marca:</span>
                                        <p className="font-medium">{postulacion.vehicleBrand}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Modelo:</span>
                                        <p className="font-medium">{postulacion.vehicleModel}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Año:</span>
                                        <p className="font-medium">{postulacion.vehicleYear}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Placa:</span>
                                        <p className="font-medium">{postulacion.vehiclePlate}</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic">No posee vehículo</p>
                                  )}
                                </div>
                              </div>

                              {/* Columna derecha */}
                              <div className="space-y-4">
                                {/* Zona de Trabajo */}
                                {postulacion.workZone && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      Zonas de Trabajo
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {postulacion.workZone.split(',').map((zone: string, i: number) => (
                                        <Badge key={i} variant="secondary">
                                          {zone}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Contacto de Emergencia */}
                                {postulacion.emergencyName && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                      <Phone className="h-4 w-4" />
                                      Contacto de Emergencia
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Nombre:</span>
                                        <p className="font-medium">{postulacion.emergencyName}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Relación:</span>
                                        <p className="font-medium">{postulacion.emergencyRelationship}</p>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="text-muted-foreground">Teléfono:</span>
                                        <p className="font-medium">{postulacion.emergencyPhone}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Info Adicional */}
                                {postulacion.experience && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      Información Adicional
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Experiencia previa:</span>
                                        <p className="font-medium">{postulacion.experience === 'si' ? 'Sí' : 'No'}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Disponibilidad:</span>
                                        <p className="font-medium capitalize">
                                          {postulacion.whenCanStart?.replace('_', ' ') || 'No especificado'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Timeline */}
                                <div>
                                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Timeline
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Fecha de inicio:</span>
                                      <p className="font-medium">
                                        {new Date(postulacion.startedAt).toLocaleString('es-PY')}
                                      </p>
                                    </div>
                                    {postulacion.completedAt && (
                                      <div>
                                        <span className="text-muted-foreground">Fecha de completado:</span>
                                        <p className="font-medium">
                                          {new Date(postulacion.completedAt).toLocaleString('es-PY')}
                                        </p>
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-muted-foreground">Steps completados:</span>
                                      <p className="font-medium">
                                        {postulacion.completedSteps.join(', ')}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
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

          {/* Empty State */}
          {postulaciones.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-medium">No hay postulaciones</p>
            </div>
          )}
        </div>
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