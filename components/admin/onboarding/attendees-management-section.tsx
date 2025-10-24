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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
} from 'lucide-react'
import { checkInAttendee, markAttendeeNoShow, confirmAttendee } from '@/lib/actions/onboarding.actions'
import { toast } from 'sonner'
import { CancelAttendeeDialog } from './cancel-attendee-dialog'
import { DriverManagementSheet } from './driver-management-sheet'

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
    const result = await markAttendeeNoShow(attendeeId)
    if (result.success) {
      toast.success('Marcado como no show')
      onRefresh()
    } else {
      toast.error(result.error || 'Error')
    }
    setLoading(null)
  }

  const handleConfirm = async (attendeeId: string) => {
    setLoading(attendeeId)
    const result = await confirmAttendee(attendeeId)
    if (result.success) {
      toast.success('Confirmado')
      onRefresh()
    } else {
      toast.error(result.error || 'Error')
    }
    setLoading(null)
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

            {/* Filtros en una línea */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro de Estado */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Estado:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="INVITED">Invitados</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmados</SelectItem>
                    <SelectItem value="ATTENDED">Asistieron</SelectItem>
                    <SelectItem value="NO_SHOW">No Show</SelectItem>
                    <SelectItem value="CANCELLED">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Pago */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Pago:</Label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="VERIFIED">Verificados</SelectItem>
                    <SelectItem value="PENDING">Pendientes</SelectItem>
                    <SelectItem value="NONE">Sin pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Botón para limpiar filtros */}
              {(searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || docsFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                    setPaymentFilter('all')
                    setDocsFilter('all')
                  }}
                  className="h-9 ml-auto"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          {/* Tabla - SIN COLUMNA DE DOCUMENTOS */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">Asistencia</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No se encontraron resultados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttendees.map((attendee) => (
                    <TableRow key={attendee.id}>
                      {/* Columna de asistencia con ícono visual */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          {getAttendanceIcon(attendee.status)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {attendee.formDriver.fullName || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {attendee.formDriver.phoneNumber}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>{getStatusBadge(attendee.status)}</TableCell>

                      <TableCell>
                        {getPaymentBadge(attendee.formDriver)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Botón de Confirmar (solo ícono) */}
                          {attendee.status === 'INVITED' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleConfirm(attendee.id)}
                              disabled={loading === attendee.id}
                              title="Confirmar asistencia"
                            >
                              {loading === attendee.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                          )}

                          {/* Botón de Check-in (solo ícono) */}
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
                  ))
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