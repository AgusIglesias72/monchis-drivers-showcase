// components/admin/onboarding/attendees-management-section.tsx

"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CheckCircle,
  XCircle,
  Ban,
  MoreVertical,
  Eye,
  Loader2,
  AlertTriangle,
  Clock,
  Check,
  X,
  CircleDashed,
  Search,
  FileText,
  DollarSign,
  UserCog,
  Filter,
  UserCheck,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react'
import { checkInAttendee, markAttendeeNoShow } from '@/lib/actions/onboarding.actions'
import { toast } from 'sonner'
import { CancelAttendeeDialog } from './cancel-attendee-dialog'
import { DriverManagementSheet } from './driver-management-sheet'

/** Segmented control / radio-group estilo pills.
 *  Reemplaza Select cuando hay pocas opciones y querés que estén visibles. */
function FilterPills({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Label className="text-xs text-muted-foreground whitespace-nowrap w-12 flex-shrink-0">
        {label}
      </Label>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex h-8 items-center justify-start rounded-md bg-muted p-[3px] text-muted-foreground overflow-x-auto"
      >
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={`inline-flex h-[calc(100%-2px)] items-center justify-center px-2.5 rounded text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface AttendeesManagementSectionProps {
  eventId: string
  event: {
    id: string
    title: string | null
    scheduledDate: string
    startTime: string
    endTime: string | null
    location: string | null
  }
  attendees: any[]
  onRefresh: () => void
}

export function AttendeesManagementSection({
  eventId,
  event,
  attendees,
  onRefresh,
}: AttendeesManagementSectionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [docsFilter, setDocsFilter] = useState<string>('all')
  
  // Estado para el dialog de cancelar
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [attendeeToCancel, setAttendeeToCancel] = useState<any>(null)

  // Estado para el sheet de gestión del driver
  const [driverManagementOpen, setDriverManagementOpen] = useState(false)
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)

  const handleCheckIn = async (attendeeId: string) => {
    setLoading(attendeeId)
    const result = await checkInAttendee(attendeeId)
    if (result.success) {
      toast.success('Check-in realizado')
      onRefresh()
    } else {
      toast.error(result.error || 'Error')
    }
    setLoading(null)
  }

  const handleMarkNoShow = async (attendeeId: string) => {
    setLoading(attendeeId)

    try {
      const result = await markAttendeeNoShow(attendeeId)

      if (!result.success) {
        toast.error(result.error || 'Error al marcar no-show')
        return
      }

      // Decisión de producto: NO notificamos al driver por WhatsApp cuando se
      // marca no-show. El portal le muestra el estado y le ofrece reagendar.
      toast.success('No-show registrado', {
        description: 'El driver puede volver al portal y elegir una nueva fecha.',
      })

      onRefresh()
    } catch (error) {
      toast.error('Error al procesar no-show')
      console.error('Error:', error)
    } finally {
      setLoading(null)
    }
  }


  const handleCancelClick = (attendee: any) => {
    setAttendeeToCancel(attendee)
    setCancelDialogOpen(true)
  }

  const handleCancelSuccess = () => {
    setCancelDialogOpen(false)
    setAttendeeToCancel(null)
    onRefresh()
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      INVITED: { label: 'Invitado', className: 'bg-gray-100 text-gray-800' },
      CONFIRMED: { label: 'Confirmado', className: 'bg-blue-100 text-blue-800' },
      ATTENDED: { label: 'Asistió', className: 'bg-green-100 text-green-800' },
      NO_SHOW: { label: 'No Asistió', className: 'bg-red-100 text-red-800' },
      CANCELLED: { label: 'Cancelado', className: 'bg-orange-100 text-orange-800' },
      RESCHEDULED: { label: 'Reagendado', className: 'bg-purple-100 text-purple-800' },
    }
    const { label, className} = config[status] || config.INVITED
    return <Badge variant="outline" className={className}>{label}</Badge>
  }

  const getAttendanceIcon = (status: string) => {
    switch (status) {
      case 'ATTENDED':
        return <Check className="h-5 w-5 text-green-600" />
      case 'NO_SHOW':
        return <X className="h-5 w-5 text-red-600" />
      case 'CONFIRMED':
        return <CheckCircle className="h-5 w-5 text-blue-600" />
      case 'CANCELLED':
        return <Ban className="h-5 w-5 text-orange-600" />
      case 'INVITED':
      default:
        return <CircleDashed className="h-5 w-5 text-gray-400" />
    }
  }

  const formatInvitedAt = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return date.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Devuelve el primer nombre capitalizado de quien asignó (admin) — o "Usuario" si fue self-served.
  const capitalize = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''
  const getAssignerFirstName = (user: { fullName?: string | null; email?: string | null } | null | undefined): string => {
    if (!user) return 'Admin'
    if (user.fullName) {
      const first = user.fullName.trim().split(/\s+/)[0] || ''
      if (first) return capitalize(first)
    }
    if (user.email) {
      const local = user.email.split('@')[0] || ''
      const part = local.split('.')[0] || local
      if (part) return capitalize(part)
    }
    return 'Admin'
  }

  const getDocumentsBadge = (status: string | null | undefined) => {
    if (!status) return null
    const config: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Docs pend.', className: 'bg-gray-100 text-gray-700' },
      IN_REVIEW: { label: 'Docs en revisión', className: 'bg-amber-100 text-amber-700' },
      APPROVED: { label: 'Docs OK', className: 'bg-green-100 text-green-700' },
      REJECTED: { label: 'Docs rech.', className: 'bg-red-100 text-red-700' },
    }
    const { label, className } = config[status] || config.PENDING
    return (
      <Badge variant="secondary" className={`text-[10px] font-normal px-1.5 py-0 ${className}`}>
        {label}
      </Badge>
    )
  }

  const getOnboardingStatusBadge = (status: string | null | undefined) => {
    if (!status) return null
    const config: Record<string, { label: string; className: string }> = {
      NOT_READY: { label: 'No listo', className: 'bg-gray-100 text-gray-700' },
      READY: { label: 'Listo', className: 'bg-blue-100 text-blue-700' },
      SCHEDULED: { label: 'Agendado', className: 'bg-indigo-100 text-indigo-700' },
      IN_PROGRESS: { label: 'En curso', className: 'bg-amber-100 text-amber-700' },
      COMPLETED: { label: 'Capacitado', className: 'bg-green-100 text-green-700' },
      NO_SHOW: { label: 'No asistió', className: 'bg-red-100 text-red-700' },
    }
    const cfg = config[status]
    if (!cfg) return null
    return (
      <Badge variant="secondary" className={`text-[10px] font-normal px-1.5 py-0 ${cfg.className}`}>
        <GraduationCap className="h-2.5 w-2.5 mr-0.5" />
        {cfg.label}
      </Badge>
    )
  }

  const getPaymentBadge = (driver: any) => {
    const hasPayment = driver.equipmentPayments?.length > 0
    const payment = driver.equipmentPayments?.[0]
    
    if (!hasPayment) {
      return (
        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
          Sin pago
        </Badge>
      )
    }

    if (payment.status === 'VERIFIED') {
      return (
        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
          Verificado
        </Badge>
      )
    }

    if (payment.status === 'REJECTED') {
      return (
        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
          Rechazado
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
        Pendiente
      </Badge>
    )
  }

  // Filtrado
  const filteredAttendees = attendees.filter((attendee) => {
    // Búsqueda por texto
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = 
      attendee.formDriver.fullName?.toLowerCase().includes(searchLower) ||
      attendee.formDriver.phoneNumber?.includes(searchLower) ||
      attendee.formDriver.email?.toLowerCase().includes(searchLower)

    if (!matchesSearch) return false

    // Filtro de estado de asistencia
    if (statusFilter !== 'all' && attendee.status !== statusFilter) {
      return false
    }

    // Filtro de documentos
    if (docsFilter !== 'all') {
      if (docsFilter === 'APPROVED' && attendee.formDriver.documentsStatus !== 'APPROVED') {
        return false
      }
      if (docsFilter === 'PENDING' && attendee.formDriver.documentsStatus === 'APPROVED') {
        return false
      }
    }

    // Filtro de pagos
    if (paymentFilter !== 'all') {
      const hasPayment = attendee.formDriver.equipmentPayments?.length > 0
      const payment = attendee.formDriver.equipmentPayments?.[0]
      
      if (paymentFilter === 'VERIFIED' && (!hasPayment || payment.status !== 'VERIFIED')) {
        return false
      }
      if (paymentFilter === 'PENDING' && (!hasPayment || payment.status === 'VERIFIED')) {
        return false
      }
      if (paymentFilter === 'NONE' && hasPayment) {
        return false
      }
    }

    return true
  })

  if (attendees.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No hay drivers asignados</p>
          <p className="text-sm mt-1">Ve a la pestaña &quot;Agregar Drivers&quot;</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Participantes ({attendees.length})
                {filteredAttendees.length !== attendees.length && (
                  <Badge variant="secondary" className="text-xs">
                    {filteredAttendees.length} filtrados
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Gestiona la asistencia y pagos de cada driver
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              {attendees.filter(a => a.status === 'ATTENDED').length} asistieron
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="space-y-3">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, teléfono o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtros como segmented controls (radio-group visual) */}
            <div className="flex flex-col gap-2.5">
              <FilterPills
                label="Estado"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'INVITED', label: 'Invitados' },
                  { value: 'CONFIRMED', label: 'Confirmados' },
                  { value: 'ATTENDED', label: 'Asistieron' },
                  { value: 'NO_SHOW', label: 'No Show' },
                  { value: 'CANCELLED', label: 'Cancelados' },
                ]}
              />
              <FilterPills
                label="Pago"
                value={paymentFilter}
                onChange={setPaymentFilter}
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'VERIFIED', label: 'Verificados' },
                  { value: 'PENDING', label: 'Pendientes' },
                  { value: 'NONE', label: 'Sin pago' },
                ]}
              />

              {(searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || docsFilter !== 'all') && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('all')
                      setPaymentFilter('all')
                      setDocsFilter('all')
                    }}
                    className="h-7 text-xs cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Tabla - SIN COLUMNA DE DOCUMENTOS */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">Asist.</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="whitespace-nowrap">Agendado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No se encontraron resultados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttendees.map((attendee) => {
                    const isSelfServed = !attendee.invitedBy
                    const docsBadge = getDocumentsBadge(attendee.formDriver.documentsStatus)
                    const onboardBadge = getOnboardingStatusBadge(attendee.formDriver.onboardingStatus)
                    return (
                    <TableRow key={attendee.id}>
                      {/* Columna de asistencia con ícono visual */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          {getAttendanceIcon(attendee.status)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="min-w-0">
                          <div className="font-medium capitalize">
                            {attendee.formDriver.fullName || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {attendee.formDriver.phoneNumber}
                          </div>
                          {/* Estados generales del driver */}
                          {(docsBadge || onboardBadge) && (
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {onboardBadge}
                              {docsBadge}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Agendado: cuándo + por quién */}
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm tabular-nums">
                          {formatInvitedAt(attendee.invitedAt)}
                        </div>
                        {isSelfServed ? (
                          <div
                            title="El driver se agendó por sí mismo desde el flow público"
                            className="inline-flex items-center gap-0.5 text-[11px] text-info font-medium mt-0.5"
                          >
                            <UserCheck className="h-3 w-3" /> Usuario
                          </div>
                        ) : (
                          <div
                            title={`Asignado por ${attendee.invitedByUser?.fullName || attendee.invitedByUser?.email || 'admin'}`}
                            className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground mt-0.5 capitalize"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            {getAssignerFirstName(attendee.invitedByUser)}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>{getStatusBadge(attendee.status)}</TableCell>

                      <TableCell>
                        {getPaymentBadge(attendee.formDriver)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Botón de Check-in (Marcar Asistencia) */}
                          {(attendee.status === 'INVITED' || attendee.status === 'CONFIRMED') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleCheckIn(attendee.id)}
                              disabled={loading === attendee.id}
                              title="Marcar asistencia"
                            >
                              {loading === attendee.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          )}

                          {/* Botón No Show (solo ícono) */}
                          {(attendee.status === 'INVITED' || attendee.status === 'CONFIRMED') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleMarkNoShow(attendee.id)}
                              disabled={loading === attendee.id}
                              title="Marcar no asistió"
                            >
                              {loading === attendee.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                          )}

                          {/* Botón Ver Detalles */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedDriverId(attendee.formDriver.id)
                              setDriverManagementOpen(true)
                            }}
                            title="Ver detalles del driver"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Menú de más opciones */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDriverId(attendee.formDriver.id)
                                  setDriverManagementOpen(true)
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/admin/postulaciones/${attendee.formDriver.id}`)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Ver postulación
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleCancelClick(attendee)}
                                className="text-red-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Cancelar asistencia
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de cancelación */}
      <CancelAttendeeDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        attendee={attendeeToCancel}
        onSuccess={handleCancelSuccess}
      />

      {/* Sheet de gestión del driver */}
      <DriverManagementSheet
        open={driverManagementOpen}
        onOpenChange={setDriverManagementOpen}
        driverId={selectedDriverId}
        onSuccess={onRefresh}
      />
    </>
  )
}