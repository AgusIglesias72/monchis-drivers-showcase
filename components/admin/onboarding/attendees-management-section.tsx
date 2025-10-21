// components/admin/onboarding/attendees-management-section.tsx

"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CheckCircle,
  XCircle,
  Ban,
  MoreVertical,
  Eye,
  FileText,
  CreditCard,
  Loader2,
  AlertTriangle,
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

  const handleCancel = async (attendeeId: string) => {
    setLoading(attendeeId)
    const result = await cancelAttendee(attendeeId)
    if (result.success) {
      toast.success('Cancelado')
      onRefresh()
    } else {
      toast.error(result.error || 'Error')
    }
    setLoading(null)
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
    const { label, className } = config[status] || config.INVITED
    return <Badge variant="outline" className={className}>{label}</Badge>
  }

  const getDocsStatusBadge = (status: string) => {
    if (status === 'APPROVED') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs gap-1">
          <CheckCircle className="h-3 w-3" />
          OK
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs gap-1">
        <AlertTriangle className="h-3 w-3" />
        Pendiente
      </Badge>
    )
  }

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
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Participantes</CardTitle>
        <CardDescription>
          Gestiona la asistencia, documentos y pagos de cada driver
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Docs</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendees.map((attendee) => (
                <TableRow key={attendee.id}>
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
                    {getDocsStatusBadge(attendee.formDriver.documentsStatus)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {attendee.formDriver.equipmentPayments?.length > 0
                        ? 'Registrado'
                        : 'Sin pago'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={loading === attendee.id}
                        >
                          {loading === attendee.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/postulaciones/${attendee.formDriverId}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Postulación
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {(attendee.status === 'INVITED' || attendee.status === 'CONFIRMED') && (
                          <DropdownMenuItem onClick={() => handleCheckIn(attendee.id)}>
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            Marcar Asistencia
                          </DropdownMenuItem>
                        )}
                        {(attendee.status === 'INVITED' || attendee.status === 'CONFIRMED') && (
                          <DropdownMenuItem onClick={() => handleMarkNoShow(attendee.id)}>
                            <XCircle className="h-4 w-4 mr-2 text-red-600" />
                            No Asistió
                          </DropdownMenuItem>
                        )}
                        {attendee.status === 'INVITED' && (
                          <DropdownMenuItem onClick={() => handleConfirm(attendee.id)}>
                            <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                            Confirmar
                          </DropdownMenuItem>
                        )}
                        {(attendee.status === 'INVITED' || attendee.status === 'CONFIRMED') && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleCancel(attendee.id)}
                              className="text-destructive"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Cancelar Asistencia
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}