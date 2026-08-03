// components/admin/onboarding/attendees-table.tsx

"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  MoreVertical, 
  CheckCircle, 
  XCircle, 
  Ban, 
  Calendar,
  Eye,
  Mail,
  Phone,
  Loader2,
} from 'lucide-react'
import { getAttendeeStatusLabel, getAttendeeStatusColor } from '@/types/onboarding'
import type { OnboardingAttendeeWithRelations } from '@/types/onboarding'

interface AttendeesTableProps {
  attendees: OnboardingAttendeeWithRelations[]
  onCheckIn: (attendeeId: string) => Promise<void>
  onMarkNoShow: (attendeeId: string) => Promise<void>
  onCancel: (attendeeId: string) => Promise<void>
  onConfirm: (attendeeId: string) => Promise<void>
  onViewDriver: (driverId: string) => void
}

export function AttendeesTable({
  attendees,
  onCheckIn,
  onMarkNoShow,
  onCancel,
  onConfirm,
  onViewDriver,
}: AttendeesTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    action: () => Promise<void>
  } | null>(null)

  const handleAction = async (action: () => Promise<void>) => {
    setConfirmDialog(null)
    setActionLoading('processing')
    try {
      await action()
    } catch (error) {
      console.error('Error executing action:', error)
      alert('Error al ejecutar la acción')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: OnboardingAttendeeWithRelations['status']) => {
    const colorClass = getAttendeeStatusColor(status)
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-800 border-gray-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
    }

    return (
      <Badge variant="outline" className={colorMap[colorClass]}>
        {getAttendeeStatusLabel(status)}
      </Badge>
    )
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (attendees.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">No hay drivers asignados a este evento</p>
        <p className="text-sm mt-1">Usa el botón &quot;Agregar Drivers&quot; para comenzar</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Driver</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Invitado</TableHead>
            <TableHead>Confirmado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendees.map((attendee) => (
            <TableRow key={attendee.id}>
              <TableCell className="font-medium">
                {attendee.formDriver.fullName || 'Sin nombre'}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 text-sm">
                  {attendee.formDriver.email && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {attendee.formDriver.email}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {attendee.formDriver.phoneNumber}
                  </div>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(attendee.status)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(attendee.invitedAt)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(attendee.confirmedAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onViewDriver(attendee.formDriverId)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={actionLoading === attendee.id}
                      >
                        {actionLoading === attendee.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreVertical className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(attendee.status === 'INVITED' || attendee.status === 'CONFIRMED') && (
                        <>
                          <DropdownMenuItem
                            onClick={() => {
                              setConfirmDialog({
                                open: true,
                                title: 'Confirmar Check-in',
                                description: `¿Confirmar que ${attendee.formDriver.fullName} asistió al evento?`,
                                action: () => onCheckIn(attendee.id),
                              })
                            }}
                          >
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            Check-in
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setConfirmDialog({
                                open: true,
                                title: 'Marcar como No Show',
                                description: `¿Marcar a ${attendee.formDriver.fullName} como no presentado?`,
                                action: () => onMarkNoShow(attendee.id),
                              })
                            }}
                          >
                            <XCircle className="mr-2 h-4 w-4 text-red-600" />
                            Marcar No Show
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      
                      {attendee.status === 'INVITED' && (
                        <>
                          <DropdownMenuItem onClick={() => onConfirm(attendee.id)}>
                            <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
                            Confirmar Manualmente
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}

                      {(attendee.status === 'INVITED' || attendee.status === 'CONFIRMED') && (
                        <DropdownMenuItem
                          onClick={() => {
                            setConfirmDialog({
                              open: true,
                              title: 'Cancelar Asistencia',
                              description: `¿Cancelar la asistencia de ${attendee.formDriver.fullName}?`,
                              action: () => onCancel(attendee.id),
                            })
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Cancelar Asistencia
                        </DropdownMenuItem>
                      )}

                      {attendee.status === 'NO_SHOW' && (
                        <DropdownMenuItem>
                          <Calendar className="mr-2 h-4 w-4" />
                          Reagendar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleAction(confirmDialog.action)}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}