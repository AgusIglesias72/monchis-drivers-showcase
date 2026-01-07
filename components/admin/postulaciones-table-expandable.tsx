// components/admin/postulaciones-table-expandable.tsx

"use client"

import { useState, Fragment } from "react"
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
  ChevronLeft,
  Eye,
  Phone,
  MapPin,
  User,
  Clock,
  FileText,
  Bike,
  CreditCard,
  Calendar,
  CheckCircle,
  MoreVertical,
  XCircle,
  MessageSquare,
} from "lucide-react"
import { ScheduleOnboardingModal } from "@/components/admin/schedule-onboarding-modal"
import { ContactButton } from "@/components/admin/postulaciones/contact-button"
import { RejectButton } from "@/components/admin/postulaciones/reject-button"
import { useRouter } from "next/navigation"
import { formatBirthDateWithAge } from "@/lib/utils"
import { calculatePostulacionBadges } from "@/lib/utils/postulacion-badges.utils"
import { getPostulacionStatusBadge } from "@/lib/utils/postulacion-status-badge.utils"
import { AssistedCompletionButton } from "./postulaciones/assisted-completion-button"

interface PostulacionesTableProps {
  postulaciones: any[]
  currentPage: number
  totalPages: number
  total: number
  isPending: boolean
  onPageChange: (page: number) => void
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

// Helper function para determinar el label del badge
function getBadgeConfig(badgeType: string) {
  const configs: Record<string, { label: string; color: string }> = {
    'DOCUMENTOS_COMPLETOS': { label: 'Documentos Completos', color: 'bg-green-50 text-green-700' },
    'DOCUMENTOS_EN_REVISION': { label: 'Documentos en Revisión', color: 'bg-amber-50 text-amber-700' },
    'DOCUMENTOS_PENDIENTES': { label: 'Documentos Pendientes', color: 'bg-yellow-50 text-yellow-700' },
    'PAGO_COMPLETO': { label: 'Pago Completo', color: 'bg-green-50 text-green-700' },
    'PAGO_EN_VERIFICACION': { label: 'Pago en Verificación', color: 'bg-yellow-50 text-yellow-700' },
    'PAGO_PENDIENTE': { label: 'Pago Pendiente', color: 'bg-red-50 text-red-700' },
    'FACTURACION_COMPLETA': { label: 'Facturación Completa', color: 'bg-green-50 text-green-700' },
    'FACTURACION_NA': { label: 'Sin Facturación', color: 'bg-gray-50 text-gray-500' },
    'FACTURACION_PENDIENTE': { label: 'Facturación Pendiente', color: 'bg-orange-50 text-orange-700' },
    'PAGADO': { label: 'Pagado', color: 'bg-green-50 text-green-700' },
    'VERIFICAR_PAGO': { label: 'Verificar Pago', color: 'bg-purple-50 text-purple-700' },
  }
  return configs[badgeType] || { label: badgeType, color: 'bg-gray-50 text-gray-600' }
}

export function PostulacionesTableExpandable({
  postulaciones = [],
  currentPage,
  totalPages,
  total,
  isPending,
  onPageChange,
}: PostulacionesTableProps) {
  const router = useRouter()
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedDriverForOnboarding, setSelectedDriverForOnboarding] = useState<{
    id: string
    name: string
  } | null>(null)

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

  const handleScheduleOnboarding = (postulacion: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedDriverForOnboarding({
      id: postulacion.id,
      name: postulacion.fullName || `${postulacion.firstName} ${postulacion.lastName}`
    })
  }

  const handleOnboardingSuccess = () => {
    router.refresh()
  }

  const handlePageChange = (page: number) => {
    onPageChange(page)
  }

  return (
    <>
      <Card className="rounded-t-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestión de Postulaciones</CardTitle>
            <div className="text-xs flex items-center gap-1.5 text-muted-foreground">
              <span>Mostrando</span>
              <span className="font-semibold text-foreground">{postulaciones.length}</span>
              <span>de</span>
              <span className="font-semibold text-foreground">{total.toLocaleString()}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4">
              <div className="text-xs text-muted-foreground">
                Página <span className="font-semibold text-foreground">{currentPage}</span> de <span className="font-semibold text-foreground">{totalPages}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isPending}
                  className="h-8"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline text-xs">Anterior</span>
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
                        disabled={isPending}
                        className="w-8 h-8 p-0 text-xs"
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
                  disabled={currentPage === totalPages || isPending}
                  className="h-8"
                >
                  <span className="hidden sm:inline text-xs">Siguiente</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            {/* Contenedor con scroll horizontal para pantallas pequeñas */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 py-3 text-left w-10"></th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase min-w-[180px]">
                      Postulante
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase min-w-[120px]">
                      Ciudad
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase min-w-[130px]">
                      Postulación
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase min-w-[100px]">
                      Estados
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase min-w-[120px]">
                      Onboarding
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase min-w-[110px]">
                      Fecha
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase w-32">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y">
                  {postulaciones.map((postulacion) => {
                    const isExpanded = expandedRows.has(postulacion.id)
                    const isCompleted = postulacion.status === 'COMPLETED'
                    const hasOnboarding = postulacion.onboardingAttendances?.[0]
                    const onboardingStatus = postulacion.onboardingStatus
                    const canSchedule = isCompleted && (!onboardingStatus || ['NOT_READY', 'READY'].includes(onboardingStatus))

                    // Calcular badges
                    const { badges } = calculatePostulacionBadges(postulacion)

                    // Badge de estado de postulación
                    const statusBadgeConfig = getPostulacionStatusBadge(
                      postulacion.status,
                      postulacion.currentStep,
                      postulacion.assistedCompletion
                    )

                    // ✅ LÓGICA CORREGIDA DE DOCUMENTOS
                    const getDocumentIcon = () => {
                      const documents = postulacion.documents || []

                      // Documentos de cédula
                      const cedulaDocs = documents.filter((doc: any) =>
                        doc.documentType === 'CEDULA' ||
                        doc.documentType === 'CEDULA_FRONT' ||
                        doc.documentType === 'CEDULA_BACK'
                      )

                      // Documentos de antecedentes
                      const antecedentesDocs = documents.filter((doc: any) =>
                        doc.documentType === 'CRIMINAL_RECORD' ||
                        doc.documentType === 'ANTECEDENTES'
                      )

                      // Certificado tributario
                      const taxDoc = documents.find((doc: any) => doc.documentType === 'TAX_COMPLIANCE')

                      // Verificar si existen
                      const hasCedulaDocs = cedulaDocs.length > 0
                      const hasAntecedentesDocs = antecedentesDocs.length > 0

                      // ⚪ GRIS: Documentos faltantes (no hay Cédula o no hay Antecedentes)
                      if (!hasCedulaDocs || !hasAntecedentesDocs) {
                        return {
                          icon: FileText,
                          bg: 'bg-gray-100',
                          text: 'text-gray-500',
                          tooltip: 'Documentos Faltantes'
                        }
                      }

                      // Verificar si hay AL MENOS UNO aprobado en cada categoría
                      const hasCedulaApproved = cedulaDocs.some((doc: any) => doc.status === 'APPROVED')
                      const hasAntecedentesApproved = antecedentesDocs.some((doc: any) => doc.status === 'APPROVED')

                      // 🟡 AMARILLO: No hay ninguno aprobado aún (están en revisión o pendientes)
                      if (!hasCedulaApproved || !hasAntecedentesApproved) {
                        // Verificar si hay rechazados SIN aprobados
                        const hasRejectedCedula = cedulaDocs.some((doc: any) => doc.status === 'REJECTED')
                        const hasRejectedAntecedentes = antecedentesDocs.some((doc: any) => doc.status === 'REJECTED')

                        // 🔴 ROJO: Hay rechazados pero NO hay aprobados en alguna categoría
                        if ((hasRejectedCedula && !hasCedulaApproved) || (hasRejectedAntecedentes && !hasAntecedentesApproved)) {
                          return {
                            icon: FileText,
                            bg: 'bg-red-100',
                            text: 'text-red-700',
                            tooltip: 'Documentos Rechazados'
                          }
                        }

                        // Sino, están en revisión
                        return {
                          icon: FileText,
                          bg: 'bg-yellow-100',
                          text: 'text-yellow-700',
                          tooltip: 'Documentos en Revisión'
                        }
                      }

                      // ✅ En este punto: Cédula + Antecedentes tienen AL MENOS uno APROBADO cada uno
                      // Ahora verificamos el Certificado Tributario

                      // 🟢 VERDE: Cédula + Antecedentes + Cert. Tributario todos APROBADOS
                      if (taxDoc && taxDoc.status === 'APPROVED') {
                        return {
                          icon: FileText,
                          bg: 'bg-green-100',
                          text: 'text-green-700',
                          tooltip: 'Documentos Completos'
                        }
                      }

                      // 🔵 AZUL: Cédula + Antecedentes APROBADOS, pero falta Cert. Tributario
                      return {
                        icon: FileText,
                        bg: 'bg-blue-100',
                        text: 'text-blue-700',
                        tooltip: 'Falta Certificado Tributario'
                      }
                    }

                    const getPaymentIcon = () => {
                      const payment = postulacion.equipmentPayments?.[0]
                      
                      if (!payment) {
                        return {
                          icon: CreditCard,
                          bg: 'bg-red-100',
                          text: 'text-red-700',
                          tooltip: 'Pago pendiente'
                        }
                      }
                      
                      if (payment.status === 'VERIFIED') {
                        return {
                          icon: CreditCard,
                          bg: 'bg-green-100',
                          text: 'text-green-700',
                          tooltip: 'Pago verificado'
                        }
                      }
                      
                      // 🔵 AZUL: Tiene archivo cargado
                      if (payment.receiptUrl) { // O el campo que corresponda
                        return {
                          icon: CreditCard,
                          bg: 'bg-blue-100',
                          text: 'text-blue-700',
                          tooltip: 'Pago cargado, en verificación'
                        }
                      }
                      
                      // 🟡 AMARILLO: Completó paso pero sin archivo
                      return {
                        icon: CreditCard,
                        bg: 'bg-yellow-100',
                        text: 'text-yellow-700',
                        tooltip: 'Pago en proceso, falta comprobante'
                      }
                    }

                    const docIcon = getDocumentIcon()
                    const payIcon = getPaymentIcon()

                    const DocIcon = docIcon.icon
                    const PayIcon = payIcon.icon

                    return (
                      <Fragment key={postulacion.id}>
                        <tr
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
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-sm">
                                  {postulacion.fullName || `${postulacion.firstName} ${postulacion.lastName}`}
                                </div>
                                {postulacion.workZone?.includes('San Bernardino') && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          variant="outline"
                                          className="text-xs px-1.5 py-0 h-5 bg-purple-50 text-purple-700 border-purple-300 font-semibold"
                                        >
                                          SB
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">Zona preferida: San Bernardino</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {postulacion.notes && postulacion.notes.length > 0 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          variant="outline"
                                          className="text-xs px-1.5 py-0 h-5 bg-blue-50 text-blue-700 border-blue-300 font-semibold flex items-center gap-1"
                                        >
                                          <MessageSquare className="h-3 w-3" />
                                          {postulacion.notes.length}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">
                                          {postulacion.notes.length} nota{postulacion.notes.length > 1 ? 's' : ''} interna{postulacion.notes.length > 1 ? 's' : ''}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>CI: {postulacion.cedula}</span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {postulacion.phoneNumber}
                                </span>
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
                            <div className="flex flex-row items-center gap-1">
                              <Badge
                                variant={statusBadgeConfig.variant}
                                className={`text-xs ${statusBadgeConfig.className}`}
                              >
                                {statusBadgeConfig.label}
                              </Badge>
                              {postulacion.status === 'IN_PROGRESS' && (
                                <span className="text-xs text-muted-foreground">
                                  {' '}{postulacion.currentStep}/6
                                </span>
                              )}
                            </div>
                          </td>

                          {/* ESTADOS - ✅ SOLO 2 ICONOS AHORA */}
                          <td className="px-3 py-3">
                            <TooltipProvider>
                              <div className="flex items-center justify-center gap-2">
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
                              </div>
                            </TooltipProvider>
                          </td>

                          {/* ONBOARDING */}
                          <td className="px-3 py-3 text-center">
  {hasOnboarding ? (
    <div className="flex flex-col items-center gap-1">
      <Badge
        variant="outline"
        className={`text-xs ${
          hasOnboarding.status === 'ATTENDED' || hasOnboarding.status === 'CONFIRMED'
            ? 'bg-green-50 text-green-700 border-green-200'
            : hasOnboarding.status === 'SCHEDULED' || hasOnboarding.status === 'INVITED'
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : hasOnboarding.status === 'NO_SHOW' || hasOnboarding.status === 'ABSENT'
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}
      >
        {hasOnboarding.status === 'ATTENDED' ? 'Capacitado' :
          hasOnboarding.status === 'CONFIRMED' ? 'Capacitado' :
          hasOnboarding.status === 'SCHEDULED' || hasOnboarding.status === 'INVITED' ? 'Agendado' :
          hasOnboarding.status === 'NO_SHOW' || hasOnboarding.status === 'ABSENT' ? 'No Asistió' :
          'Pendiente'}
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
  ) : onboardingStatus === 'SCHEDULED' ? (
    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
      Agendado
    </Badge>
  ) : onboardingStatus === 'READY' ? (
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
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => handleViewDetails(postulacion.id, e)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <ContactButton
                                driverId={postulacion.id}
                                driverName={postulacion.fullName || `${postulacion.firstName} ${postulacion.lastName}`}
                                phoneNumber={postulacion.phoneNumber}
                                contactStatus={postulacion.contactStatus}
                              />

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

                                  <RejectButton
                                    driverId={postulacion.id}
                                    driverName={postulacion.fullName || `${postulacion.firstName} ${postulacion.lastName}`}
                                    isRejected={postulacion.status === 'REJECTED'}
                                    onSuccess={() => window.location.reload()}
                                  />

                                  <DropdownMenuSeparator />

                                  <AssistedCompletionButton
                                    driverId={postulacion.id}
                                    driverName={postulacion.fullName || `${postulacion.firstName} ${postulacion.lastName}`}
                                    isAssisted={postulacion.assistedCompletion || false}
                                    onSuccess={() => window.location.reload()}
                                  />
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
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
                                        value={`${postulacion.currentStep}/6 pasos`}
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
                      </Fragment>
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

          {/* Paginación dentro de la tabla */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t">
              <div className="text-xs text-muted-foreground">
                Página <span className="font-semibold text-foreground">{currentPage}</span> de <span className="font-semibold text-foreground">{totalPages}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isPending}
                  className="h-8"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline text-xs">Anterior</span>
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
                        disabled={isPending}
                        className="w-8 h-8 p-0 text-xs"
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
                  disabled={currentPage === totalPages || isPending}
                  className="h-8"
                >
                  <span className="hidden sm:inline text-xs">Siguiente</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
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