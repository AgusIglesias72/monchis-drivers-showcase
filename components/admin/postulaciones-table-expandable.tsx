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
                    
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted/80 transition-colors select-none"
                      onClick={() => handleSort('city')}
                    >
                      <div className="flex items-center gap-2">
                        Ciudad
                        <SortIcon field="city" currentField={sortField} order={sortOrder} />
                      </div>
                    </th>
                    
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted/80 transition-colors select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        Postulación
                        <SortIcon field="status" currentField={sortField} order={sortOrder} />
                      </div>
                    </th>
                    
                    {/* ✅ COLUMNA: Estados (máximo 3 iconos) */}
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
                      Estados
                    </th>
                    
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
                      Onboarding
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
                    
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase w-16">
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
                    
                    // 🎯 Calcular badges
                    const { badges } = calculatePostulacionBadges(postulacion)
                    
                    return (
                      <>
                        <tr
                          key={postulacion.id}
                          className="hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => toggleRow(postulacion.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </div>
                          </td>
                          
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-foreground text-sm">
                                {postulacion.fullName}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <span>CI: {postulacion.cedula}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {postulacion.phoneNumber}
                                </span>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              <div className="font-medium text-foreground">{postulacion.city || '-'}</div>
                              <div className="text-xs text-muted-foreground">{postulacion.department || '-'}</div>
                            </div>
                          </td>
                          
                          <td className="px-4 py-3">
                            {isCompleted ? (
                              <StatusBadge status="COMPLETED" />
                            ) : (
                              <div className="flex items-center gap-2">
                                <StatusBadge status="IN_PROGRESS" />
                                <span className="text-xs text-muted-foreground">
                                  {postulacion.currentStep || 1}/6
                                </span>
                              </div>
                            )}
                          </td>
                          
                          {/* ✅ COLUMNA ESTADOS CON 3 ICONOS ÚNICOS */}
                          <td className="px-4 py-3">
                            <TooltipProvider>
                              <div className="flex items-center justify-center gap-2">
                                {badges.length > 0 ? (
                                  badges.map((badge) => <StatusIcon key={badge} type={badge} />)
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                            </TooltipProvider>
                          </td>
                          
                          <td className="px-4 py-3 text-center">
                            {hasOnboarding ? (
                              <div className="flex flex-col items-center gap-1">
                                <OnboardingStatusBadge status={hasOnboarding.status} />
                                {hasOnboarding.event?.scheduledDate && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {new Date(hasOnboarding.event.scheduledDate).toLocaleDateString('es-PY', {
                                        day: '2-digit',
                                        month: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : onboardingStatus ? (
                              <OnboardingStatusBadge status={onboardingStatus} />
                            ) : (
                              <span className="text-xs text-muted-foreground">Sin agendar</span>
                            )}
                          </td>
                          
                          <td className="px-4 py-3">
                            <div className="text-xs text-muted-foreground">
                              {new Date(postulacion.startedAt).toLocaleDateString('es-PY')}
                            </div>
                          </td>
                          
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleViewDetails(postulacion.id, e)}
                                className="h-8 w-8 p-0 cursor-pointer hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950"
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
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => handleContact(postulacion, e)}
                                    className="cursor-pointer"
                                  >
                                    <Phone className="h-4 w-4 mr-2" />
                                    Contactar
                                  </DropdownMenuItem>
                                  
                                  {canSchedule && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={(e) => handleScheduleOnboarding(postulacion, e)}
                                        className="cursor-pointer text-green-600"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Agendar Onboarding
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => handleReject(postulacion, e)}
                                    className="cursor-pointer text-red-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Rechazar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>

                        {/* ✅ Expandable (colSpan=8) */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="px-6 py-4 bg-muted/20">
                              <div className="space-y-4">
                                <div className="grid grid-cols-4 gap-6">
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
                                          value={`${postulacion.vehicleBrand || ''} ${postulacion.vehicleModel || ''}`}
                                        />
                                        <InfoRow label="Año" value={postulacion.vehicleYear || '-'} />
                                        <InfoRow label="Placa" value={postulacion.vehiclePlate || '-'} />
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">Sin vehículo</p>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                      <CreditCard className="h-3.5 w-3.5" />
                                      PAGO EQUIPO
                                    </h5>
                                    {postulacion.equipmentPayments?.[0] ? (
                                      <div className="space-y-1.5">
                                        <div>
                                          <span className="text-xs text-muted-foreground block">Estado</span>
                                          <PaymentStatusBadge status={postulacion.equipmentPayments[0].status} />
                                        </div>
                                        <InfoRow
                                          label="Método"
                                          value={postulacion.equipmentPayments[0].paymentMethod || '-'}
                                        />
                                        {postulacion.equipmentPayments[0].amount && (
                                          <InfoRow
                                            label="Monto"
                                            value={`${postulacion.equipmentPayments[0].amount.toLocaleString()} Gs`}
                                          />
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">Sin info de pago</p>
                                    )}
                                  </div>

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
                        key={`page-${page}`}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0 cursor-pointer"
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
                  className="cursor-pointer"
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
        onOpenChange={(open) => !open && setSelectedDriverForOnboarding(null)}
        driverId={selectedDriverForOnboarding?.id || ''}
        driverName={selectedDriverForOnboarding?.name || ''}
        onSuccess={handleOnboardingSuccess}
      />
    </>
  )
}

// ✅ Componente de icono con 3 categorías únicas
function StatusIcon({ type }: { type: string }) {
  // 📄 DOCUMENTOS
  if (type === 'DOCUMENTOS_PENDIENTES') {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
            <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Documentos Pendientes</p>
        </TooltipContent>
      </Tooltip>
    )
  }
  
  if (type === 'DOCUMENTOS_EN_REVISION') {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="h-7 w-7 rounded-full bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center">
            <FileText className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Documentos en Revisión</p>
        </TooltipContent>
      </Tooltip>
    )
  }
  
  if (type === 'DOCUMENTOS_COMPLETOS') {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
            <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Documentos Completos</p>
        </TooltipContent>
      </Tooltip>
    )
  }
  
  // 💳 PAGO
  if (type === 'PAGO_PENDIENTE') {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Pago Pendiente</p>
        </TooltipContent>
      </Tooltip>
    )
  }
  
  if (type === 'PAGO_EN_VERIFICACION') {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Pago en Verificación</p>
        </TooltipContent>
      </Tooltip>
    )
  }
  
  if (type === 'PAGO_COMPLETO') {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Pago Completo</p>
        </TooltipContent>
      </Tooltip>
    )
  }
  
  // 📋 FACTURACIÓN
  if (type === 'FACTURACION_PENDIENTE') {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="h-7 w-7 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
            <Receipt className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Facturación Pendiente</p>
        </TooltipContent>
      </Tooltip>
    )
  }
  
  if (type === 'FACTURACION_COMPLETA') {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
            <Receipt className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Facturación Completa</p>
        </TooltipContent>
      </Tooltip>
    )
  }
  
  if (type === 'FACTURACION_NA') {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Receipt className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">No Factura</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return null
}

// Helper components
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

export function OnboardingStatusBadge({ status }: { status: string }) {
  const config = {
    COMPLETED: { label: 'Completado', variant: 'default' as const },
    ATTENDED: { label: 'Asistió', variant: 'default' as const },
    SCHEDULED: { label: 'Agendado', variant: 'secondary' as const },
    CONFIRMED: { label: 'Confirmado', variant: 'secondary' as const },
    INVITED: { label: 'Invitado', variant: 'outline' as const },
    IN_PROGRESS: { label: 'En Proceso', variant: 'outline' as const },
    NOT_READY: { label: 'No Listo', variant: 'destructive' as const },
    READY: { label: 'Listo', variant: 'outline' as const },
    NO_SHOW: { label: 'No Asistió', variant: 'destructive' as const },
    CANCELLED: { label: 'Cancelado', variant: 'destructive' as const },
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