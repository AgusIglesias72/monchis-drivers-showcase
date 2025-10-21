// components/admin/postulacion-helpers.tsx

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, CheckCircle, XCircle, Clock, Edit, Eye, AlertCircle } from "lucide-react"

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

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-0.5">{label}</label>
      <p className="text-sm font-medium">{value || '-'}</p>
    </div>
  )
}

// ==================== SECCIÓN DE PAGO ====================

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
      <div className="space-y-3 text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/30" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">Sin información de pago</p>
          <p className="text-xs text-muted-foreground mt-1">
            El conductor aún no ha registrado un pago
          </p>
        </div>
      </div>
    )
  }

  const statusConfig = {
    PENDING: { 
      label: 'Pendiente', 
      className: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: Clock 
    },
    VERIFIED: { 
      label: 'Verificado', 
      className: 'bg-green-100 text-green-700 border-green-200',
      icon: CheckCircle 
    },
    REJECTED: { 
      label: 'Rechazado', 
      className: 'bg-red-100 text-red-700 border-red-200',
      icon: XCircle 
    },
  }
  
  const config = statusConfig[payment.status as keyof typeof statusConfig] || statusConfig.PENDING
  const StatusIcon = config.icon

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b">
        <span className="text-xs text-muted-foreground">Estado</span>
        <Badge variant="outline" className={`${config.className} gap-1`}>
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <InfoField 
          label="Método" 
          value={payment.paymentMethod === 'POS' ? 'POS' : 
                 payment.paymentMethod === 'BANK_TRANSFER' ? 'Transferencia' : 
                 payment.paymentMethod === 'CASH' ? 'Efectivo' : 
                 payment.paymentMethod} 
        />
        <InfoField label="Monto" value={payment.amount ? `Gs. ${Number(payment.amount).toLocaleString()}` : undefined} />
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        {payment.paymentMethod === 'POS' && payment.paymentNumber && (
          <InfoField label="Nro. Comprobante" value={payment.paymentNumber} />
        )}
      </div>
      
      {payment.invoiceNumber ? (
        <InfoField label="Nro. Factura" value={payment.invoiceNumber} />
      ) : (
        <div>
          <label className="text-xs text-muted-foreground block mb-0.5">Nro. Factura</label>
          <Badge variant="outline" className="text-xs">Pendiente</Badge>
        </div>
      )}
      
      {payment.adminNotes && (
        <div className="pt-2 border-t">
          <label className="text-xs text-muted-foreground block mb-1">Notas Admin</label>
          <p className="text-xs bg-muted/50 p-2 rounded">{payment.adminNotes}</p>
        </div>
      )}
      
      {payment.rejectionReason && (
        <div className="pt-2 border-t">
          <label className="text-xs text-muted-foreground block mb-1">Razón de Rechazo</label>
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{payment.rejectionReason}</p>
        </div>
      )}

      {/* Comprobante de pago si existe */}
      {payment.paymentProofUrl && (
        <div className="pt-2 border-t space-y-2">
          <label className="text-xs text-muted-foreground block">Comprobante de Pago</label>
          <Button size="sm" variant="outline" className="w-full" onClick={onViewProof}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Comprobante
          </Button>
        </div>
      )}
      
      {/* Botón de gestionar al final */}
      <div className="pt-2 border-t">
        <Button size="sm" variant="outline" className="w-full" onClick={onManage}>
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
  onSchedule?: () => void
}) {
  // Si no hay attendance ni status
  if (!attendance && !status) {
    return (
      <div className="space-y-3 text-center py-8">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">Sin capacitación agendada</p>
          <p className="text-xs text-muted-foreground mt-1">
            No hay onboarding agendado
          </p>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          className="w-full mt-2" 
          onClick={onSchedule}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Agendar Capacitación
        </Button>
      </div>
    )
  }

  // Si hay attendance, mostrar detalles
  if (attendance?.event) {
    const event = attendance.event
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b">
          <span className="text-xs text-muted-foreground">Estado</span>
          <OnboardingStatusBadge status={attendance.status} />
        </div>
        
        <div className="space-y-2 text-xs">
          <InfoField 
            label="Fecha" 
            value={new Date(event.scheduledDate).toLocaleDateString('es-PY', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} 
          />
          <InfoField label="Ubicación" value={event.location} />
          {event.description && (
            <div>
              <label className="text-xs text-muted-foreground block mb-0.5">Descripción</label>
              <p className="text-xs bg-muted/50 p-2 rounded">{event.description}</p>
            </div>
          )}
        </div>

        {attendance.status === 'CONFIRMED' && (
          <div className="pt-2 border-t">
            <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">
              ✓ Confirmado el {new Date(attendance.confirmedAt).toLocaleDateString('es-PY')}
            </div>
          </div>
        )}

        {attendance.status === 'CHECKED_IN' && (
          <div className="pt-2 border-t">
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
              ✓ Asistió el {new Date(attendance.checkedInAt).toLocaleDateString('es-PY')}
            </div>
          </div>
        )}

        {attendance.status === 'NO_SHOW' && (
          <div className="pt-2 border-t">
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
              ✗ No asistió
            </div>
          </div>
        )}

        {attendance.status === 'CANCELLED' && (
          <div className="pt-2 border-t">
            <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-700">
              Cancelado el {new Date(attendance.cancelledAt).toLocaleDateString('es-PY')}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Si solo hay status sin attendance
  return (
    <div className="space-y-3 text-center py-8">
      <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">Sin información de onboarding</p>
      </div>
      {onSchedule && (
        <Button 
          size="sm" 
          variant="outline" 
          className="w-full mt-2" 
          onClick={onSchedule}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Agendar Capacitación
        </Button>
      )}
    </div>
  )
}

// ==================== BADGE DE ESTADO DE ONBOARDING ====================

function OnboardingStatusBadge({ status }: { status?: string }) {
  const config = {
    INVITED: { 
      label: 'Invitado', 
      className: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: Clock 
    },
    CONFIRMED: { 
      label: 'Confirmado', 
      className: 'bg-purple-100 text-purple-700 border-purple-200',
      icon: CheckCircle 
    },
    CHECKED_IN: { 
      label: 'Asistió', 
      className: 'bg-green-100 text-green-700 border-green-200',
      icon: CheckCircle 
    },
    NO_SHOW: { 
      label: 'No asistió', 
      className: 'bg-red-100 text-red-700 border-red-200',
      icon: XCircle 
    },
    CANCELLED: { 
      label: 'Cancelado', 
      className: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: XCircle 
    },
  }
  
  const statusConfig = config[status as keyof typeof config] || config.INVITED
  const Icon = statusConfig.icon
  
  return (
    <Badge variant="outline" className={`${statusConfig.className} gap-1 text-xs`}>
      <Icon className="h-3 w-3" />
      {statusConfig.label}
    </Badge>
  )
}