// components/admin/onboarding/attendees-management-section.tsx

"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Ban,
  MoreVertical,
  Eye,
  Loader2,
  Check,
  X,
  CircleDashed,
  Search,
  FileText,
  UserCog,
  UserCheck,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react'
import { checkInAttendee, markAttendeeNoShow } from '@/lib/actions/onboarding.actions'
import { toast } from 'sonner'
import { CancelAttendeeDialog } from './cancel-attendee-dialog'
import { DriverManagementSheet } from './driver-management-sheet'

/** Segmented control / radio-group estilo pills, con count opcional por opción.
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
  options: { value: string; label: string; count?: number }[]
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Label className="text-xs text-muted-foreground whitespace-nowrap w-12 flex-shrink-0">
        {label}
      </Label>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex h-9 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground overflow-x-auto gap-0.5"
      >
        {options.map((opt) => {
          const active = value === opt.value
          const hasCount = opt.count !== undefined
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={`inline-flex h-full items-center justify-center gap-1.5 px-2.5 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                active
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                  : 'hover:bg-background/50 hover:text-foreground'
              }`}
            >
              <span>{opt.label}</span>
              {hasCount && (
                <span
                  className={`tabular-nums text-[10px] font-semibold rounded px-1.5 py-0.5 ${
                    active
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-background/70 text-muted-foreground'
                  }`}
                >
                  {opt.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface AttendeesManagementSectionProps {
  attendees: any[]
  onRefresh: () => void
}

export function AttendeesManagementSection({
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
      INVITED: { label: 'Invitado', className: 'bg-muted text-foreground' },
      CONFIRMED: { label: 'Confirmado', className: 'bg-info-soft text-info' },
      ATTENDED: { label: 'Asistió', className: 'bg-success-soft text-success' },
      NO_SHOW: { label: 'No Asistió', className: 'bg-danger-soft text-destructive' },
      CANCELLED: { label: 'Cancelado', className: 'bg-warning-soft text-warning' },
      RESCHEDULED: { label: 'Reagendado', className: 'bg-purple-100 text-purple-800' },
    }
    const { label, className} = config[status] || config.INVITED
    return <Badge variant="outline" className={className}>{label}</Badge>
  }

  const getAttendanceIcon = (status: string) => {
    switch (status) {
      case 'ATTENDED':
        return <Check className="h-5 w-5 text-success" />
      case 'NO_SHOW':
        return <X className="h-5 w-5 text-destructive" />
      case 'CONFIRMED':
        return <CheckCircle className="h-5 w-5 text-info" />
      case 'CANCELLED':
        return <Ban className="h-5 w-5 text-warning" />
      case 'INVITED':
      default:
        return <CircleDashed className="h-5 w-5 text-ink-subtle" />
    }
  }

  // Formato fecha + hora forzado a UTC-3 (zona horaria de Paraguay).
  const formatInvitedAt = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return date.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Asuncion',
    })
  }
  const formatInvitedTime = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return date.toLocaleTimeString('es-PY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Asuncion',
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
      PENDING: { label: 'Docs pend.', className: 'bg-muted text-muted-foreground' },
      IN_REVIEW: { label: 'Docs en revisión', className: 'bg-warning-soft text-warning' },
      APPROVED: { label: 'Docs OK', className: 'bg-success-soft text-success' },
      REJECTED: { label: 'Docs rech.', className: 'bg-danger-soft text-destructive' },
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
      NOT_READY: { label: 'No listo', className: 'bg-muted text-muted-foreground' },
      READY: { label: 'Listo', className: 'bg-info-soft text-info' },
      SCHEDULED: { label: 'Agendado', className: 'bg-info-soft text-info' },
      IN_PROGRESS: { label: 'En curso', className: 'bg-warning-soft text-warning' },
      COMPLETED: { label: 'Capacitado', className: 'bg-success-soft text-success' },
      NO_SHOW: { label: 'No asistió', className: 'bg-danger-soft text-destructive' },
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
        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
          Sin pago
        </Badge>
      )
    }

    if (payment.status === 'VERIFIED') {
      return (
        <Badge variant="outline" className="text-xs bg-success-soft text-success border-success">
          Verificado
        </Badge>
      )
    }

    if (payment.status === 'REJECTED') {
      return (
        <Badge variant="outline" className="text-xs bg-danger-soft text-destructive border-destructive">
          Rechazado
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="text-xs bg-warning-soft text-warning border-warning">
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

  // Counts por filtro — para mostrar dentro de cada pill.
  const statusCounts = attendees.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1
    return acc
  }, {})

  const paymentCounts = attendees.reduce<Record<string, number>>(
    (acc, a) => {
      const payments = a.formDriver?.equipmentPayments || []
      const payment = payments[0]
      if (!payment) acc.NONE++
      else if (payment.status === 'VERIFIED') acc.VERIFIED++
      else acc.PENDING++
      return acc
    },
    { VERIFIED: 0, PENDING: 0, NONE: 0 }
  )

  if (attendees.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Participantes
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona la asistencia y pagos de cada driver
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed rounded-lg">
          <p className="text-lg font-medium">No hay drivers asignados</p>
          <p className="text-sm mt-1">Ve a la pestaña &quot;Agregar Drivers&quot;</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header — mismo patrón que "Agregar Participantes" */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Participantes ({attendees.length})
              {filteredAttendees.length !== attendees.length && (
                <Badge variant="secondary" className="text-xs">
                  {filteredAttendees.length} filtrados
                </Badge>
              )}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona la asistencia y pagos de cada driver
            </p>
          </div>
          <Badge variant="outline" className="gap-1 flex-shrink-0">
            <CheckCircle className="h-3 w-3 text-success" />
            {attendees.filter(a => a.status === 'ATTENDED').length} asistieron
          </Badge>
        </div>

        {/* Filtros + tabla */}
        <div className="space-y-4">
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
                  { value: 'all', label: 'Todos', count: attendees.length },
                  { value: 'INVITED', label: 'Invitados', count: statusCounts.INVITED || 0 },
                  { value: 'CONFIRMED', label: 'Confirmados', count: statusCounts.CONFIRMED || 0 },
                  { value: 'ATTENDED', label: 'Asistieron', count: statusCounts.ATTENDED || 0 },
                  { value: 'NO_SHOW', label: 'No Show', count: statusCounts.NO_SHOW || 0 },
                ]}
              />
              <FilterPills
                label="Pago"
                value={paymentFilter}
                onChange={setPaymentFilter}
                options={[
                  { value: 'all', label: 'Todos', count: attendees.length },
                  { value: 'VERIFIED', label: 'Verificados', count: paymentCounts.VERIFIED },
                  { value: 'PENDING', label: 'Pendientes', count: paymentCounts.PENDING },
                  { value: 'NONE', label: 'Sin pago', count: paymentCounts.NONE },
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

                      {/* Agendado: cuándo (fecha + hora UTC-3) + por quién */}
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm tabular-nums">
                          {formatInvitedAt(attendee.invitedAt)}
                          <span className="text-muted-foreground"> · </span>
                          <span className="text-muted-foreground">{formatInvitedTime(attendee.invitedAt)}</span>
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
                              className="h-8 w-8 text-success hover:text-success hover:bg-success-soft"
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
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-danger-soft"
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
                                onClick={() => router.push(`/admin/postulaciones/${attendee.formDriver.slug ?? attendee.formDriver.id}`)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Ver postulación
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleCancelClick(attendee)}
                                className="text-destructive"
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
        </div>
      </div>

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