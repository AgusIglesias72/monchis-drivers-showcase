// components/admin/onboarding/attendees-management-section.tsx

"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
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
  DropdownMenuSeparator,
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
  Users,
  FileText,
  CreditCard,
} from 'lucide-react'
import { checkInAttendee, markAttendeeNoShow, cancelAttendee, confirmAttendee } from '@/lib/actions/onboarding.actions'
import { toast } from 'sonner'

interface AttendeesManagementSectionProps {
  eventId: string
  attendees: any[]
  onRefresh: () => void
}

export function AttendeesManagementSection({
  eventId,
  attendees,
  onRefresh,
}: AttendeesManagementSectionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Filtrar asistentes por búsqueda
  const filteredAttendees = attendees.filter(attendee => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      attendee.formDriver.fullName?.toLowerCase().includes(search) ||
      attendee.formDriver.phoneNumber?.toLowerCase().includes(search) ||
      attendee.formDriver.email?.toLowerCase().includes(search)
    )
  })

  const handleCheckIn = async (attendeeId: string) => {
    setLoading(attendeeId)
    const result = await checkInAttendee(attendeeId)
    if (result.success) {
      toast.success('Check-in realizado con éxito')
      onRefresh()
    } else {
      toast.error(result.error || 'Error al hacer check-in')
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
      toast.success('Asistencia confirmada')
      onRefresh()
    } else {
      toast.error(result.error || 'Error al confirmar')
    }
    setLoading(null)
  }

  const handleCancel = async (attendeeId: string) => {
    // TODO: Implementar modal de cancelar/reagendar
    if (!confirm('¿Cancelar esta asistencia? Próximamente podrás reagendar.')) return
    
    setLoading(attendeeId)
    const result = await cancelAttendee(attendeeId)
    if (result.success) {
      toast.success('Asistencia cancelada')
      onRefresh()
    } else {
      toast.error(result.error || 'Error al cancelar')
    }
    setLoading(null)
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      INVITED: { 
        label: 'Invitado', 
        className: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <CircleDashed className="h-3 w-3" />
      },
      CONFIRMED: { 
        label: 'Confirmado', 
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Check className="h-3 w-3" />
      },
      ATTENDED: { 
        label: 'Asistió', 
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="h-3 w-3" />
      },
      NO_SHOW: { 
        label: 'No Asistió', 
        className: 'bg-red-100 text-red-800 border-red-200',
        icon: <XCircle className="h-3 w-3" />
      },
      SCHEDULED: { 
        label: 'Agendado', 
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Clock className="h-3 w-3" />
      },
      CANCELLED: { 
        label: 'Cancelado', 
        className: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: <Ban className="h-3 w-3" />
      },
      RESCHEDULED: { 
        label: 'Reagendado', 
        className: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <AlertTriangle className="h-3 w-3" />
      },
    }

    const { label, className, icon } = config[status] || config.INVITED
    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        {icon}
        {label}
      </Badge>
    )
  }

  const getAttendanceIcon = (status: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      ATTENDED: <CheckCircle className="h-5 w-5 text-green-600" />,
      NO_SHOW: <XCircle className="h-5 w-5 text-red-600" />,
      CONFIRMED: <Check className="h-5 w-5 text-blue-600" />,
      INVITED: <Clock className="h-5 w-5 text-gray-400" />,
      SCHEDULED: <Clock className="h-5 w-5 text-yellow-600" />,
      CANCELLED: <Ban className="h-5 w-5 text-orange-600" />,
      RESCHEDULED: <AlertTriangle className="h-5 w-5 text-purple-600" />,
    }
    return iconMap[status] || <CircleDashed className="h-5 w-5 text-gray-400" />
  }

  const getPaymentIcon = (driver: any) => {
    if (!driver.equipmentPayments || driver.equipmentPayments.length === 0) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100" title="Sin pago">
          <CreditCard className="h-4 w-4 text-gray-400" />
        </div>
      )
    }
    
    const lastPayment = driver.equipmentPayments[0]
    const statusConfig: Record<string, { icon: React.ReactNode; title: string; bg: string }> = {
      PENDING: { 
        icon: <Clock className="h-4 w-4 text-yellow-600" />,
        title: 'Pago pendiente',
        bg: 'bg-yellow-100'
      },
      VERIFIED: { 
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
        title: 'Pago verificado',
        bg: 'bg-green-100'
      },
      REJECTED: { 
        icon: <XCircle className="h-4 w-4 text-red-600" />,
        title: 'Pago rechazado',
        bg: 'bg-red-100'
      },
    }
    
    const config = statusConfig[lastPayment.status] || statusConfig.PENDING
    return (
      <div 
        className={`flex items-center justify-center w-8 h-8 rounded-full ${config.bg}`}
        title={config.title}
      >
        {config.icon}
      </div>
    )
  }

  // Determinar la acción principal según el estado
  const getPrimaryAction = (attendee: any) => {
    switch (attendee.status) {
      case 'INVITED':
        return {
          icon: <Check className="h-4 w-4 " />,
          action: () => handleConfirm(attendee.id),
          variant: 'default' as const,
          className: 'bg-blue-600 hover:bg-blue-700 text-white rounded-full'
        }
      case 'CONFIRMED':
        return {
          label: 'Registrar',
          icon: <CheckCircle className="h-4 w-4" />,
          action: () => handleCheckIn(attendee.id),
          variant: 'default' as const,
          className: 'bg-green-600 hover:bg-green-700 text-white'
        }
      case 'ATTENDED':
        return {
          label: 'Asistió',
          icon: <CheckCircle className="h-4 w-4" />,
          action: null,
          variant: 'outline' as const,
          className: 'bg-green-50 text-green-700 border-green-200 cursor-default'
        }
      default:
        return null
    }
  }

  if (attendees.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16 border-2 border-dashed rounded-lg bg-muted/30"
      >
        <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-xl font-medium text-muted-foreground mb-2">
          No hay drivers asignados a este evento
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Ve a la pestaña &quot;Agregar Drivers&quot; para comenzar
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header con búsqueda y estadísticas */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, teléfono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {attendees.length} participantes
          </Badge>
          <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3" />
            {attendees.filter(a => a.status === 'ATTENDED').length} asistieron
          </Badge>
        </div>
      </div>

      {/* Tabla de asistentes */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12 text-center">Asistencia</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No se encontraron resultados para &quot;{searchTerm}&quot;
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendees.map((attendee, index) => (
                  <motion.tr
                    key={attendee.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {/* Columna de asistencia con ícono visual */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        {getAttendanceIcon(attendee.status)}
                      </div>
                    </TableCell>

                    {/* Driver con botón de documentos */}
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {attendee.formDriver.fullName || 'Sin nombre'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">
                            {attendee.formDriver.phoneNumber}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs cursor-pointer hover:bg-blue-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              // TODO: Abrir modal de documentos
                              toast.info('Modal de documentos próximamente')
                            }}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Docs
                          </Button>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>{getStatusBadge(attendee.status)}</TableCell>

                    <TableCell className="text-center">
                      {getPaymentIcon(attendee.formDriver)}
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botón de Ver Driver */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            // TODO: Abrir modal de driver
                            toast.info('Modal de driver próximamente')
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>

                        {/* Botón de acción principal según estado */}
                        {getPrimaryAction(attendee) && (
                          <Button
                            variant={getPrimaryAction(attendee)!.variant}
                            size="sm"
                            className={`h-8 cursor-pointer ${getPrimaryAction(attendee)!.className}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              getPrimaryAction(attendee)!.action?.()
                            }}
                            disabled={!getPrimaryAction(attendee)!.action || loading === attendee.id}
                          >
                            {loading === attendee.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                {getPrimaryAction(attendee)!.icon}
                                <span className="ml-1">{getPrimaryAction(attendee)!.label}</span>
                              </>
                            )}
                          </Button>
                        )}

                        {/* Botón de Cancelar/Reagendar (solo icono) */}
                        {attendee.status !== 'CANCELLED' && attendee.status !== 'ATTENDED' && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancel(attendee.id)
                            }}
                            disabled={loading === attendee.id}
                            title="Cancelar/Reagendar"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Menú de acciones adicionales */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer"
                              disabled={loading === attendee.id}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {attendee.status === 'INVITED' && (
                              <DropdownMenuItem
                                onClick={() => handleConfirm(attendee.id)}
                                className="cursor-pointer"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Confirmar
                              </DropdownMenuItem>
                            )}

                            {(attendee.status === 'INVITED' || attendee.status === 'CONFIRMED') && (
                              <DropdownMenuItem
                                onClick={() => handleCheckIn(attendee.id)}
                                className="cursor-pointer text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Registrar Asistencia
                              </DropdownMenuItem>
                            )}

                            {(attendee.status === 'INVITED' || attendee.status === 'CONFIRMED') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleMarkNoShow(attendee.id)}
                                  className="cursor-pointer text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  No Show
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}