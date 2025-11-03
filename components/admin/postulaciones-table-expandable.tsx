// components/admin/postulaciones-table-expandable-improved.tsx

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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ChevronDown,
  ChevronRight,
  Eye,
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
  CheckCircle,
  MoreVertical,
  XCircle,
  Receipt,
} from "lucide-react"
import { ScheduleOnboardingModal } from "@/components/admin/schedule-onboarding-modal"
import { useRouter } from "next/navigation"
import { formatBirthDateWithAge } from "@/lib/utils"
import { calculatePostulacionBadges } from "@/lib/utils/postulacion-badges.utils"

type SortField = 'fullName' | 'city' | 'status' | 'startedAt'
type SortOrder = 'asc' | 'desc' | null

interface PostulacionesTableProps {
  postulaciones: any[]
}

// Componente para el icono de ordenamiento
function SortIcon({ field, currentField, order }: { field: SortField, currentField: SortField | null, order: SortOrder }) {
  if (currentField !== field) {
    return <ArrowUpDown className="h-3 w-3 opacity-40" />
  }
  if (order === 'asc') {
    return <ArrowUp className="h-3 w-3" />
  }
  if (order === 'desc') {
    return <ArrowDown className="h-3 w-3" />
  }
  return <ArrowUpDown className="h-3 w-3 opacity-40" />
}

// Componente para filas de información
function InfoRow({ label, value }: { label: string, value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-words">{value}</span>
    </div>
  )
}

export function PostulacionesTableExpandable({
  postulaciones = []
}: PostulacionesTableProps) {
  const router = useRouter()
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedDriverForOnboarding, setSelectedDriverForOnboarding] = useState<{
    id: string
    name: string
  } | null>(null)
  
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

  const handleViewDetails = (postulacionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `/admin/postulaciones/${postulacionId}`
  }

  const handleContact = (postulacion: any, e: React.MouseEvent) => {
    e.stopPropagation()
    const phone = postulacion.phoneNumber.replace(/\D/g, '')
    window.open(`https://wa.me/595${phone}`, '_blank')
  }

  const handleScheduleOnboarding = (postulacion: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedDriverForOnboarding({
      id: postulacion.id,
      name: postulacion.fullName || `${postulacion.firstName} ${postulacion.lastName}`
    })
  }

  const handleReject = (postulacion: any, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`¿Estás seguro de rechazar la postulación de ${postulacion.fullName}?`)) {
      console.log('Rechazar postulación:', postulacion.id)
      alert('Función de rechazo en desarrollo')
    }
  }

  const handleOnboardingSuccess = () => {
    router.refresh()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Postulaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            {/* Contenedor con scroll horizontal para pantallas pequeñas */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 py-3 text-left w-10"></th>
                    
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted/80 transition-colors select-none min-w-[180px]"
                      onClick={() => handleSort('fullName')}
                    >
                      <div className="flex items-center gap-2">
                        Postulante
                        <SortIcon field="fullName" currentField={sortField} order={sortOrder} />
                      </div>
                    </th>
                    
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted/80 transition-colors select-none min-w-[120px]"
                      onClick={() => handleSort('city')}
                    >
                      <div className="flex items-center gap-2">
                        Ciudad
                        <SortIcon field="city" currentField={sortField} order={sortOrder} />
                      </div>
                    </th>
                    
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted/80 transition-colors select-none min-w-[130px]"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        Postulación
                        <SortIcon field="status" currentField={sortField} order={sortOrder} />
                      </div>
                    </th>
                    
                    <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase min-w-[120px]">
                      Estados
                    </th>
                    
                    <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase min-w-[120px]">
                      Onboarding
                    </th>
                    
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted/80 transition-colors select-none min-w-[110px]"
                      onClick={() => handleSort('startedAt')}
                    >
                      <div className="flex items-center gap-2">
                        Fecha
                        <SortIcon field="startedAt" currentField={sortField} order={sortOrder} />
                      </div>
                    </th>
                    
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase w-16">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y">
                  {paginatedPostulaciones.map((postulacion) => {
                    const isExpanded = expandedRows.has(postulacion.id)
                    const isCompleted = postulacion.status === 'COMPLETED'
                    const hasOnboarding = postulacion.onboardingAttendances?.[0]
                    const onboardingStatus = postulacion.onboardingStatus
                    const canSchedule = isCompleted && (!onboardingStatus || ['NOT_READY', 'READY'].includes(onboardingStatus))
                    
                    // Calcular badges para TODAS las postulaciones
                    const { badges } = calculatePostulacionBadges(postulacion)
                    
                    // SIEMPRE mostrar estos 3 iconos (el color cambia según estado)
                    const getDocumentIcon = () => {
                      const docBadge = badges.find(b => b.includes('DOCUMENTO'))
                      if (docBadge === 'DOCUMENTOS_COMPLETOS') {
                        return { icon: FileText, bg: 'bg-green-100', text: 'text-green-700', tooltip: 'Documentos completos' }
                      } else if (docBadge === 'DOCUMENTOS_EN_REVISION') {
                        return { icon: FileText, bg: 'bg-amber-100', text: 'text-amber-700', tooltip: 'Documentos en revisión' }
                      } else {
                        return { icon: FileText, bg: 'bg-yellow-100', text: 'text-yellow-700', tooltip: 'Documentos pendientes' }
                      }
                    }
                    
                    const getPaymentIcon = () => {
                      const payBadge = badges.find(b => b.includes('PAGO') || b === 'PAGADO' || b === 'VERIFICAR_PAGO')
                      if (payBadge === 'PAGADO' || payBadge === 'PAGO_COMPLETO') {
                        return { icon: CreditCard, bg: 'bg-green-100', text: 'text-green-700', tooltip: 'Pago completo' }
                      } else if (payBadge === 'PAGO_EN_VERIFICACION' || payBadge === 'VERIFICAR_PAGO') {
                        return { icon: CreditCard, bg: 'bg-purple-100', text: 'text-purple-700', tooltip: 'Pago en verificación' }
                      } else {
                        return { icon: CreditCard, bg: 'bg-red-100', text: 'text-red-700', tooltip: 'Pago pendiente' }
                      }
                    }
                    
                    const getInvoiceIcon = () => {
                      const invBadge = badges.find(b => b.includes('FACTURACION'))
                      if (invBadge === 'FACTURACION_COMPLETA') {
                        return { icon: Receipt, bg: 'bg-green-100', text: 'text-green-700', tooltip: 'Facturación completa' }
                      } else if (invBadge === 'FACTURACION_NA') {
                        return { icon: Receipt, bg: 'bg-gray-100', text: 'text-gray-500', tooltip: 'No aplica facturación' }
                      } else {
                        return { icon: Receipt, bg: 'bg-orange-100', text: 'text-orange-700', tooltip: 'Facturación pendiente' }
                      }
                    }
                    
                    const docIcon = getDocumentIcon()
                    const payIcon = getPaymentIcon()
                    const invIcon = getInvoiceIcon()
                    
                    const DocIcon = docIcon.icon
                    const PayIcon = payIcon.icon
                    const InvIcon = invIcon.icon
                    
                    return (
                      <>
                        <tr
                          key={postulacion.id}
                          className="hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => toggleRow(postulacion.id)}
                        >
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </td>

                          {/* POSTULANTE */}
                          <td className="px-3 py-3">
                            <div className="space-y-0.5">
                              <div className="font-medium text-sm">
                                {postulacion.fullName || `${postulacion.firstName} ${postulacion.lastName}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                CI: {postulacion.cedula}
                              </div>
                            </div>
                          </td>

                          {/* CIUDAD Y DEPARTAMENTO */}
                          <td className="px-3 py-3">
                            <div className="text-sm space-y-0.5">
                              <div className="font-medium">{postulacion.city || '-'}</div>
                              <div className="text-xs text-muted-foreground">{postulacion.department || '-'}</div>
                            </div>
                          </td>

                          {/* POSTULACIÓN STATUS */}
                          <td className="px-3 py-3">
                            <Badge
                              variant="outline"
                              className={`text-xs
                                ${postulacion.status === 'COMPLETED' 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : postulacion.status === 'IN_PROGRESS'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-gray-50 text-gray-500 border-gray-200'
                                }`}
                            >
                              {postulacion.status === 'COMPLETED' 
                                ? 'Completada' 
                                : postulacion.status === 'IN_PROGRESS'
                                ? 'En Progreso'
                                : 'Abandonada'}
                            </Badge>
                          </td>

                          {/* ESTADOS - SIEMPRE 3 ICONOS FIJOS */}
                          <td className="px-3 py-3">
                            <TooltipProvider>
                              <div className="flex items-center justify-center gap-1.5">
                                {/* 1. DOCUMENTOS */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${docIcon.bg} ${docIcon.text}`}>
                                      <DocIcon className="h-4 w-4" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{docIcon.tooltip}</p>
                                  </TooltipContent>
                                </Tooltip>

                                {/* 2. PAGO */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${payIcon.bg} ${payIcon.text}`}>
                                      <PayIcon className="h-4 w-4" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{payIcon.tooltip}</p>
                                  </TooltipContent>
                                </Tooltip>

                                {/* 3. FACTURACIÓN */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${invIcon.bg} ${invIcon.text}`}>
                                      <InvIcon className="h-4 w-4" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{invIcon.tooltip}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </td>

                          {/* ONBOARDING MEJORADO */}
                          <td className="px-3 py-3 text-center">
                            {hasOnboarding ? (
                              <div className="flex flex-col items-center gap-1">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    hasOnboarding.status === 'ATTENDED' || hasOnboarding.status === 'CONFIRMED'
                                      ? 'bg-green-50 text-green-700 border-green-200'
                                      : hasOnboarding.status === 'SCHEDULED'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {hasOnboarding.status === 'ATTENDED' ? 'Capacitado' : 
                                   hasOnboarding.status === 'CONFIRMED' ? 'Capacitado' :
                                   hasOnboarding.status === 'SCHEDULED' ? 'Agendado' : 'Pendiente'}
                                </Badge>
                                {hasOnboarding.event?.scheduledDate && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(hasOnboarding.event.scheduledDate).toLocaleDateString('es-ES', {
                                      day: '2-digit',
                                      month: 'short'
                                    })}
                                  </span>
                                )}
                              </div>
                            ) : onboardingStatus === 'READY' || onboardingStatus === 'SCHEDULED' ? (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                Pendiente
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Sin agendar</span>
                            )}
                          </td>

                          {/* FECHA */}
                          <td className="px-3 py-3">
                            <div className="text-xs text-muted-foreground">
                              {new Date(postulacion.startedAt).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </div>
                          </td>

                          {/* ACCIONES */}
                          <td className="px-3 py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => handleViewDetails(postulacion.id, e)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver detalles
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => handleContact(postulacion, e)}>
                                  <Phone className="mr-2 h-4 w-4" />
                                  Contactar
                                </DropdownMenuItem>
                                {canSchedule && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={(e) => handleScheduleOnboarding(postulacion, e)}>
                                      <Calendar className="mr-2 h-4 w-4" />
                                      Agendar Onboarding
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={(e) => handleReject(postulacion, e)}
                                  className="text-red-600"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Rechazar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>

                        {/* FILA EXPANDIDA */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="px-6 py-4 bg-muted/20">
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                                          value={formatBirthDateWithAge(postulacion.birthDate)}
                                        />
                                      )}
                                      <InfoRow label="Teléfono" value={postulacion.phoneNumber} />
                                      {postulacion.email && (
                                        <InfoRow label="Email" value={postulacion.email} />
                                      )}
                                      {postulacion.emergencyName && (
                                        <div className="pt-1.5 border-t">
                                          <InfoRow label="Emergencia" value={postulacion.emergencyName} />
                                          <InfoRow label="Tel. Emergencia" value={postulacion.emergencyPhone} />
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                      <Bike className="h-3.5 w-3.5" />
                                      VEHÍCULO
                                    </h5>
                                    {postulacion.hasVehicle ? (
                                      <div className="space-y-1.5">
                                        <InfoRow 
                                          label="Vehículo" 
                                          value={`${postulacion.vehicleBrand} ${postulacion.vehicleModel}`} 
                                        />
                                        <InfoRow label="Año" value={postulacion.vehicleYear?.toString()} />
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground italic">Sin vehículo</p>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                      <MapPin className="h-3.5 w-3.5" />
                                      UBICACIÓN
                                    </h5>
                                    <div className="space-y-1.5">
                                      <InfoRow label="Ciudad" value={postulacion.city} />
                                      <InfoRow label="Departamento" value={postulacion.department} />
                                      {postulacion.address && (
                                        <InfoRow label="Dirección" value={postulacion.address} />
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                      <Clock className="h-3.5 w-3.5" />
                                      ESTADO
                                    </h5>
                                    <div className="space-y-1.5">
                                      <InfoRow 
                                        label="Progreso" 
                                        value={`${postulacion.currentStep}/7 pasos`} 
                                      />
                                      <InfoRow 
                                        label="Fecha inicio" 
                                        value={new Date(postulacion.startedAt).toLocaleDateString('es-ES')} 
                                      />
                                      {postulacion.completedAt && (
                                        <InfoRow 
                                          label="Fecha completado" 
                                          value={new Date(postulacion.completedAt).toLocaleDateString('es-ES')} 
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Lista completa de badges */}
                                {badges.length > 0 && (
                                  <div className="pt-3 border-t">
                                    <h5 className="text-xs font-semibold text-muted-foreground mb-2">
                                      ESTADOS Y DOCUMENTACIÓN
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      {badges.map((badgeType, idx) => {
                                        const config = getBadgeConfig(badgeType)
                                        return (
                                          <Badge
                                            key={idx}
                                            variant="outline"
                                            className={`text-xs ${config.color} border`}
                                          >
                                            {config.label}
                                          </Badge>
                                        )
                                      })}
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

          {/* Paginación local de la tabla */}
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
                        key={`page-${page}`}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    )
                  }).filter(Boolean)}
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

      <ScheduleOnboardingModal
        open={!!selectedDriverForOnboarding}
        onOpenChange={(open) => {
          if (!open) setSelectedDriverForOnboarding(null)
        }}
        driverId={selectedDriverForOnboarding?.id || ''}
        driverName={selectedDriverForOnboarding?.name || ''}
        onSuccess={handleOnboardingSuccess}
      />
    </>
  )
}