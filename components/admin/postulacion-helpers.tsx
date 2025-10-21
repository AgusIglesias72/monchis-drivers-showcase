// components/admin/postulacion-helpers.tsx

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, CheckCircle, XCircle, Clock, Edit, Eye, AlertCircle, FileText, ExternalLink } from "lucide-react"

// ==================== BADGE DE ESTADO DE DOCUMENTOS ====================

export function DocumentsStatusBadge({ status }: { status?: string }) {
  const config = {
    PENDING: { 
      label: 'Pendiente', 
      className: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: Clock 
    },
    IN_REVIEW: { 
      label: 'En Revisión', 
      className: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: Clock 
    },
    APPROVED: { 
      label: 'Aprobado', 
      className: 'bg-green-100 text-green-700 border-green-200',
      icon: CheckCircle 
    },
    CORRECTIONS: { 
      label: 'Correcciones', 
      className: 'bg-red-100 text-red-700 border-red-200',
      icon: XCircle 
    },
  }
  
  const statusConfig = config[status as keyof typeof config] || config.PENDING
  const Icon = statusConfig.icon
  
  return (
    <Badge variant="outline" className={`${statusConfig.className} gap-1 text-xs`}>
      <Icon className="h-3 w-3" />
      {statusConfig.label}
    </Badge>
  )
}

// ==================== COMPONENTE DE INFO FIELD ====================

function InfoField({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      <p className="text-sm">{value || <span className="text-muted-foreground">-</span>}</p>
    </div>
  )
}

// ==================== SECCIÓN DE PAGO MEJORADA ====================

export function PaymentSection({ 
  payment, 
  postulacionId,
  onManage,
  onViewProof 
}: { 
  payment?: any
  postulacionId: string
  onManage: () => void
  onViewProof: () => void
}) {
  if (!payment) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Sin información de pago</p>
            <p className="text-xs text-muted-foreground mt-1">
              El conductor aún no ha registrado un pago
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="w-full cursor-pointer" onClick={onManage}>
          <Edit className="h-4 w-4 mr-2" />
          Registrar Pago
        </Button>
      </div>
    )
  }

  const statusConfig = {
    PENDING: { 
      label: 'Pendiente', 
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock 
    },
    VERIFIED: { 
      label: 'Verificado', 
      className: 'bg-green-50 text-green-700 border-green-200',
      icon: CheckCircle 
    },
    REJECTED: { 
      label: 'Rechazado', 
      className: 'bg-red-50 text-red-700 border-red-200',
      icon: XCircle 
    },
  }
  
  const config = statusConfig[payment.status as keyof typeof statusConfig] || statusConfig.PENDING
  const StatusIcon = config.icon

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      'POS': 'POS',
      'BANK_TRANSFER': 'Transferencia',
      'CASH': 'Efectivo'
    }
    return methods[method] || method
  }

  return (
    <div className="space-y-4">
      {/* Estado del pago */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Estado</span>
        <Badge variant="outline" className={`${config.className} gap-1.5`}>
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </Badge>
      </div>

      {/* Información del pago - SIEMPRE MOSTRAR TODOS LOS CAMPOS */}
      <div className="space-y-3">
        {/* Método y Monto */}
        <div className="grid grid-cols-2 gap-3">
          <InfoField 
            label="Método" 
            value={payment.paymentMethod ? getPaymentMethodLabel(payment.paymentMethod) : undefined}
          />
          <InfoField 
            label="Monto" 
            value={payment.amount ? `Gs. ${Number(payment.amount).toLocaleString('es-PY')}` : undefined}
          />
        </div>

        {/* Comprobante y Factura - SIEMPRE MOSTRAR */}
        <div className="grid grid-cols-2 gap-3">
          <InfoField 
            label="Nro. Comprobante" 
            value={payment.paymentNumber}
          />
          <InfoField 
            label="Nro. Factura" 
            value={payment.invoiceNumber}
          />
        </div>

        {/* Fecha de Pago */}
        {payment.paidAt && (
          <InfoField 
            label="Fecha de Pago" 
            value={new Date(payment.paidAt).toLocaleDateString('es-PY', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          />
        )}

        {/* Verificado por */}
        {payment.verifiedAt && payment.verifiedBy && (
          <InfoField 
            label="Verificado" 
            value={`${new Date(payment.verifiedAt).toLocaleDateString('es-PY', {
              day: '2-digit',
              month: 'short'
            })} por ${payment.verifiedByUser?.firstName || 'Admin'}`}
          />
        )}
      </div>

      {/* Notas y razón de rechazo */}
      {payment.adminNotes && (
        <div className="pt-3 border-t space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground block">Notas Administrativas</label>
          <p className="text-xs bg-muted/50 p-2.5 rounded-md">{payment.adminNotes}</p>
        </div>
      )}
      
      {payment.rejectionReason && (
        <div className="pt-3 border-t space-y-1.5">
          <label className="text-xs font-medium text-red-600 block">Motivo de Rechazo</label>
          <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-md border border-red-100">
            {payment.rejectionReason}
          </p>
        </div>
      )}

      {/* Comprobante de pago */}
      {payment.paymentProofUrl && (
        <div className="pt-3 border-t">
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full cursor-pointer" 
            onClick={onViewProof}
          >
            <FileText className="h-4 w-4 mr-2" />
            Ver Comprobante
          </Button>
        </div>
      )}
      
      {/* Botón de gestionar - SIEMPRE AL FINAL */}
      <div className="pt-3 border-t">
        <Button 
          size="sm" 
          variant="default" 
          className="w-full cursor-pointer" 
          onClick={onManage}
        >
          <Edit className="h-4 w-4 mr-2" />
          Gestionar Pago
        </Button>
      </div>
    </div>
  )
}

// ==================== SECCIÓN DE ONBOARDING ====================

export function OnboardingSection({ 
  attendance, 
  status,
  postulacionId,
  onSchedule,
}: { 
  attendance?: any
  status?: string
  postulacionId: string
  onSchedule: () => void
}) {
  // Si no hay attendance ni status relevante
  if (!attendance && status !== 'SCHEDULED' && status !== 'COMPLETED' && status !== 'IN_PROGRESS') {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Sin onboarding programado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Aún no se ha agendado el onboarding
            </p>
          </div>
        </div>
        <Button 
          size="sm" 
          variant="default" 
          className="w-full bg-green-600 hover:bg-green-700 cursor-pointer" 
          onClick={onSchedule}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Agendar Onboarding
        </Button>
      </div>
    )
  }

  const statusConfig = {
    INVITED: {
      label: 'Invitado',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Calendar
    },
    CONFIRMED: {
      label: 'Confirmado',
      className: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: CheckCircle
    },
    SCHEDULED: {
      label: 'Programado',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Calendar
    },
    IN_PROGRESS: {
      label: 'En Progreso',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock
    },
    ATTENDED: {
      label: 'Asistió',
      className: 'bg-green-50 text-green-700 border-green-200',
      icon: CheckCircle
    },
    COMPLETED: {
      label: 'Completado',
      className: 'bg-green-50 text-green-700 border-green-200',
      icon: CheckCircle
    },
    CANCELLED: {
      label: 'Cancelado',
      className: 'bg-red-50 text-red-700 border-red-200',
      icon: XCircle
    },
    NO_SHOW: {
      label: 'No Asistió',
      className: 'bg-orange-50 text-orange-700 border-orange-200',
      icon: XCircle
    }
  }

  const attendanceStatus = attendance?.status || status
  const config = statusConfig[attendanceStatus as keyof typeof statusConfig] || statusConfig.SCHEDULED
  const StatusIcon = config.icon

  return (
    <div className="space-y-4">
      {/* Estado */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Estado</span>
        <Badge variant="outline" className={`${config.className} gap-1.5`}>
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </Badge>
      </div>

      {/* Información del evento */}
      {attendance?.event && (
        <div className="space-y-3">
          {/* Fecha Programada */}
          <InfoField 
            label="Fecha Programada" 
            value={new Date(attendance.event.scheduledDate).toLocaleDateString('es-PY', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          />

          {/* Hora */}
          {attendance.event.startTime && (
            <InfoField 
              label="Hora" 
              value={`${attendance.event.startTime}${attendance.event.endTime ? ` - ${attendance.event.endTime}` : ''}`}
            />
          )}

          {/* Ubicación */}
          {attendance.event.location && (
            <InfoField 
              label="Ubicación" 
              value={attendance.event.location}
            />
          )}

          {/* Título del evento */}
          {attendance.event.title && (
            <InfoField 
              label="Evento" 
              value={attendance.event.title}
            />
          )}

          {/* Notas del asistente */}
          {attendance.attendeeNotes && (
            <div className="pt-3 border-t space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground block">Notas</label>
              <p className="text-xs bg-muted/50 p-2.5 rounded-md">{attendance.attendeeNotes}</p>
            </div>
          )}

          {/* Fecha de confirmación */}
          {attendance.confirmedAt && (
            <div className="pt-3 border-t">
              <InfoField 
                label="Confirmó el" 
                value={new Date(attendance.confirmedAt).toLocaleDateString('es-PY', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              />
            </div>
          )}

          {/* Check-in */}
          {attendance.checkedInAt && (
            <div className="pt-3 border-t">
              <InfoField 
                label="Check-in" 
                value={new Date(attendance.checkedInAt).toLocaleDateString('es-PY', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              />
            </div>
          )}
        </div>
      )}

      {/* Botones de acción */}
      <div className="pt-3 border-t space-y-2">
        {/* Botón para ir al evento */}
        {attendance?.event && (
          <Button 
            size="sm" 
            variant="outline"
            className="w-full cursor-pointer gap-2"
            onClick={() => window.open(`/admin/onboarding/${attendance.event.id}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            Ver Evento de Onboarding
          </Button>
        )}

        {/* Botón de reprogramar */}
        <Button 
          size="sm" 
          variant={attendanceStatus === 'COMPLETED' || attendanceStatus === 'ATTENDED' ? 'outline' : 'default'}
          className={
            attendanceStatus === 'COMPLETED' || attendanceStatus === 'ATTENDED'
              ? 'w-full cursor-pointer' 
              : 'w-full bg-green-600 hover:bg-green-700 cursor-pointer'
          }
          onClick={onSchedule}
        >
          <Calendar className="h-4 w-4 mr-2" />
          {attendanceStatus === 'COMPLETED' || attendanceStatus === 'ATTENDED' 
            ? 'Agendar Nuevo Onboarding' 
            : 'Reprogramar'}
        </Button>
      </div>
    </div>
  )
}