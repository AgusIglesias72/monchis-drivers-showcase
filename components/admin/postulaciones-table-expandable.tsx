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
  CreditCard,
  Calendar,
} from "lucide-react"

type SortField = 'fullName' | 'city' | 'status' | 'startedAt'
type SortOrder = 'asc' | 'desc' | null

interface PostulacionesTableProps {
  postulaciones: any[]
}

export function PostulacionesTableExpandable({ 
  postulaciones = []
}: PostulacionesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

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
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 cursor-pointer"
                            onClick={() => toggleRow(postulacion.id)}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-foreground text-sm">
                              {postulacion.fullName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              CI: {postulacion.cedula}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-1 text-foreground">
                              <Phone className="h-3 w-3" />
                              <span className="text-xs">{postulacion.phoneNumber}</span>
                            </div>
                            {postulacion.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="text-xs truncate max-w-[180px]">{postulacion.email}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div className="font-medium text-foreground">{postulacion.city || '-'}</div>
                            <div className="text-xs text-muted-foreground">{postulacion.department || '-'}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden max-w-[100px]">
                              <div
                                className="bg-primary h-full transition-all"
                                style={{ width: `${(postulacion.currentStep / 6) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                              {postulacion.currentStep}/6
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={postulacion.status} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(postulacion.startedAt).toLocaleDateString('es-PY')}
                        </td>
                        <td className="px-4 py-3 text-right">
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

                      {/* Fila expandida - COMPACTA CON PAGO Y ONBOARDING */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-muted/20">
                            <div className="space-y-4">
                              {/* Grid de 4 columnas - MUY COMPACTO */}
                              <div className="grid grid-cols-4 gap-6">
                                {/* Info Personal */}
                                <div className="space-y-2">
                                  <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5" />
                                    INFO PERSONAL
                                  </h5>
                                  <div className="space-y-1.5">
                                    <InfoRow label="Nombre" value={postulacion.fullName} />
                                    <InfoRow label="Cédula" value={postulacion.cedula} />
                                    {postulacion.birthDate && (
                                      <InfoRow 
                                        label="F. Nacimiento" 
                                        value={new Date(postulacion.birthDate).toLocaleDateString('es-PY')} 
                                      />
                                    )}
                                    <InfoRow label="Teléfono" value={postulacion.phoneNumber} />
                                    {postulacion.emergencyName && (
                                      <div className="pt-1.5 border-t">
                                        <InfoRow label="Emergencia" value={postulacion.emergencyName} />
                                        <InfoRow label="Tel. Emergencia" value={postulacion.emergencyPhone} />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Vehículo */}
                                <div className="space-y-2">
                                  <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <Bike className="h-3.5 w-3.5" />
                                    VEHÍCULO
                                  </h5>
                                  {postulacion.hasVehicle ? (
                                    <div className="space-y-1.5">
                                      <InfoRow label="Marca" value={postulacion.vehicleBrand} />
                                      <InfoRow label="Modelo" value={postulacion.vehicleModel} />
                                      <InfoRow label="Placa" value={postulacion.vehiclePlate || '-'} />
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground italic">Sin vehículo</p>
                                  )}
                                  {postulacion.workZone && (
                                    <div className="pt-1.5 border-t">
                                      <span className="text-xs text-muted-foreground block mb-1">Zonas</span>
                                      <div className="flex flex-wrap gap-1">
                                        {postulacion.workZone.split(',').slice(0, 2).map((zone: string, i: number) => (
                                          <Badge key={i} variant="secondary" className="text-xs py-0 px-1.5">
                                            {zone}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Pago - NUEVO */}
                                <div className="space-y-2">
                                  <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <CreditCard className="h-3.5 w-3.5" />
                                    PAGO EQUIPO
                                  </h5>
                                  {postulacion.equipmentPayments?.[0] ? (
                                    <div className="space-y-1.5">
                                      <InfoRow 
                                        label="Método" 
                                        value={postulacion.equipmentPayments[0].paymentMethod || "N/A"} 
                                      />
                                      <InfoRow 
                                        label="Monto" 
                                        value={postulacion.equipmentPayments[0].amount 
                                          ? `${postulacion.equipmentPayments[0].amount.toLocaleString()} Gs`
                                          : ""} 
                                      />
                                      <div>
                                        <span className="text-xs text-muted-foreground block">Estado</span>
                                        <PaymentStatusBadge status={postulacion.equipmentPayments[0].status} />
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground italic">Sin info de pago</p>
                                  )}
                                </div>

                                {/* Onboarding - NUEVO */}
                                <div className="space-y-2">
                                  <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    ONBOARDING
                                  </h5>
                                  {postulacion.onboardingAttendances?.[0] ? (
                                    <div className="space-y-1.5">
                                      <div>
                                        <span className="text-xs text-muted-foreground block">Estado</span>
                                        <OnboardingStatusBadge status={postulacion.onboardingAttendances[0].status} />
                                      </div>
                                      <InfoRow 
                                        label="Fecha" 
                                        value={new Date(postulacion.onboardingAttendances[0].event.scheduledDate).toLocaleDateString("es-PY")} 
                                      />
                                      {postulacion.onboardingAttendances[0].event.location && (
                                        <InfoRow 
                                          label="Lugar" 
                                          value={postulacion.onboardingAttendances[0].event.location} 
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      <div>
                                        <span className="text-xs text-muted-foreground block">Estado</span>
                                        <OnboardingStatusBadge status={postulacion.onboardingStatus || "NOT_READY"} />
                                      </div>
                                      <p className="text-xs text-muted-foreground italic">No agendado</p>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Ubicación compacta - Fila inferior */}
                              <div className="pt-3 border-t">
                                <div className="flex items-center gap-6 text-xs">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    <span>{postulacion.city}, {postulacion.department}</span>
                                    {postulacion.neighborhood && <span className="text-muted-foreground/70">• {postulacion.neighborhood}</span>}
                                  </div>
                                  {postulacion.experience && (
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <FileText className="h-3 w-3" />
                                      <span>Exp: {postulacion.experience}</span>
                                    </div>
                                  )}
                                  {postulacion.availability?.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span>{postulacion.availability.join(', ')}</span>
                                    </div>
                                  )}
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
              Mostrando {startIndex + 1}-{Math.min(endIndex, sortedPostulaciones.length)} de {sortedPostulaciones.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="cursor-pointer"
              >
                Anterior
              </Button>
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
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0 cursor-pointer"
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="cursor-pointer"
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
    COMPLETED: { label: 'Completada', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
    IN_PROGRESS: { label: 'En Progreso', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
    ABANDONED: { label: 'Abandonada', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  }
  const { label, className } = config[status as keyof typeof config] || config.IN_PROGRESS
  return <Badge className={className}>{label}</Badge>
}

function PaymentStatusBadge({ status }: { status: string }) {
  const config = {
    VERIFIED: { label: 'Verificado', variant: 'default' as const },
    PENDING: { label: 'Pendiente', variant: 'secondary' as const },
    REJECTED: { label: 'Rechazado', variant: 'destructive' as const },
    PARTIAL: { label: 'Parcial', variant: 'outline' as const },
  }
  const { label, variant } = config[status as keyof typeof config] || { label: 'N/A', variant: 'outline' as const }
  return <Badge variant={variant} className="text-xs">{label}</Badge>
}

function OnboardingStatusBadge({ status }: { status: string }) {
  const config = {
    COMPLETED: { label: 'Completado', variant: 'default' as const },
    SCHEDULED: { label: 'Agendado', variant: 'secondary' as const },
    IN_PROGRESS: { label: 'En Proceso', variant: 'outline' as const },
    NOT_READY: { label: 'No Listo', variant: 'destructive' as const },
    READY: { label: 'Listo', variant: 'outline' as const },
  }
  const { label, variant } = config[status as keyof typeof config] || { label: 'N/A', variant: 'outline' as const }
  return <Badge variant={variant} className="text-xs">{label}</Badge>
}

function SortIcon({ field, currentField, order }: { field: string; currentField: string | null; order: SortOrder }) {
  if (currentField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
  if (order === 'asc') return <ArrowUp className="h-3.5 w-3.5 text-foreground" />
  if (order === 'desc') return <ArrowDown className="h-3.5 w-3.5 text-foreground" />
  return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground block">{label}</span>
      <span className="font-medium text-xs">{value || '-'}</span>
    </div>
  )
}