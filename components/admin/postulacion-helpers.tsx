// components/admin/postulacion-helpers.tsx

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Clock, Eye, Plus, MapPin, Edit } from "lucide-react"

// ==================== BADGES ====================

export function DocumentsStatusBadge({ status }: { status: string }) {
  const config = {
    INCOMPLETE: { label: 'Incompleto', className: 'bg-gray-100 text-gray-800 border-gray-200' },
    PENDING: { label: 'Pendiente Revisión', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    IN_REVIEW: { label: 'En Revisión', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    CORRECTIONS: { label: 'Requiere Correcciones', className: 'bg-red-100 text-red-800 border-red-200' },
    APPROVED: { label: 'Aprobado', className: 'bg-green-100 text-green-800 border-green-200' },
  }
  const { label, className } = config[status as keyof typeof config] || config.INCOMPLETE
  return <Badge variant="outline" className={className}>{label}</Badge>
}

// ==================== CAMPOS EDITABLES ====================

export function EditableField({ 
  label, 
  value, 
  icon, 
  isEditing, 
  onChange,
  className = ""
}: { 
  label: string; 
  value: any; 
  icon?: React.ReactNode; 
  isEditing: boolean; 
  onChange: (value: string) => void; 
  className?: string 
}) {
  const displayValue = label === "Fecha de Nacimiento" && value && !isEditing ? value : value;

  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground mb-1">{label}</Label>
      {isEditing ? (
        <Input 
          type="text" 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)} 
          className="h-8 text-xs"
          placeholder={label === "Fecha de Nacimiento" ? "dd/mm/yyyy" : ""}
        />
      ) : (
        <div className="flex items-center gap-1.5 min-h-[32px]">
          {icon}
          <span className="text-xs font-medium">{displayValue || '-'}</span>
        </div>
      )}
    </div>
  )
}

export function InfoField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-0.5">{label}</label>
      <span className="font-medium text-xs">{value || '-'}</span>
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
  payment: any; 
  postulacionId: string;
  onManage: () => void;
  onViewProof: () => void;
}) {
  if (!payment) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground italic mb-3">Sin información de pago registrada</p>
        <Button size="sm" variant="outline" className="w-full" onClick={onManage}>
          <Plus className="h-4 w-4 mr-2" />
          Registrar Pago
        </Button>
      </div>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const config = {
      VERIFIED: { label: 'Verificado', variant: 'default' as const },
      PENDING: { label: 'Pendiente', variant: 'secondary' as const },
      REJECTED: { label: 'Rechazado', variant: 'destructive' as const },
      PARTIAL: { label: 'Parcial', variant: 'secondary' as const },
    }
    const { label, variant} = config[status as keyof typeof config] || config.PENDING
    return <Badge variant={variant} className="text-xs">{label}</Badge>
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <InfoField label="Método" value={payment.paymentMethod || 'Sin especificar'} />
        <div>
          <label className="text-xs text-muted-foreground block mb-0.5">Estado</label>
          {getPaymentStatusBadge(payment.status)}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {payment.amount && (
          <InfoField label="Monto" value={`${payment.amount.toLocaleString('es-PY')} Gs`} />
        )}
        {payment.paymentNumber && (
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
      
      {payment.paymentProofUrl && (
        <div className="pt-2 border-t">
          <Button size="sm" variant="outline" className="w-full" onClick={onViewProof}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Comprobante
          </Button>
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
      
      <Button size="sm" className="w-full mt-2" onClick={onManage}>
        <Edit className="h-4 w-4 mr-2" />
        Gestionar Pago
      </Button>
    </div>
  )
}

// ==================== SECCIÓN DE ONBOARDING ====================

export function OnboardingSection({ 
  attendance, 
  status,
  postulacionId,
  onSchedule, // 🆕 Nueva prop
}: { 
  attendance?: any
  status?: string
  postulacionId: string
  onSchedule?: () => void // 🆕 Callback para abrir modal
}) {
  if (attendance) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Estado</span>
          <OnboardingStatusBadge status={attendance.status} />
        </div>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {new Date(attendance.event.scheduledDate).toLocaleDateString('es-PY', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>
          
          {attendance.event.startTime && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{attendance.event.startTime}</span>
            </div>
          )}
          
          {attendance.event.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="line-clamp-2">{attendance.event.location}</span>
            </div>
          )}
          
          {attendance.event.title && (
            <div className="pt-2 border-t">
              <span className="text-xs font-medium block mb-1">Evento</span>
              <span className="text-xs text-muted-foreground">{attendance.event.title}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 🆕 Si no tiene attendance pero puede agendar
  const canSchedule = !status || ['NOT_READY', 'READY'].includes(status)
  
  if (canSchedule && onSchedule) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Estado</span>
          <OnboardingStatusBadge status={status || 'NOT_READY'} />
        </div>
        
        <Button 
          onClick={onSchedule}
          className="w-full gap-2 cursor-pointer bg-green-600 hover:bg-green-700"
          size="sm"
        >
          <Calendar className="h-4 w-4" />
          Agendar Capacitación
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          No hay onboarding agendado
        </p>
      </div>
    )
  }

  // Estado por defecto
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Estado</span>
        <OnboardingStatusBadge status={status || 'NOT_READY'} />
      </div>
      
      <p className="text-xs text-muted-foreground text-center py-4">
        No hay onboarding agendado
      </p>
    </div>
  )
}

// Badge helper
function OnboardingStatusBadge({ status }: { status: string }) {
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

// ==================== FUNCIONES AUXILIARES ====================

export function getDocumentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    INCOMPLETE: 'Incompleto',
    PENDING: 'Pendiente de revisión',
    IN_REVIEW: 'En revisión',
    CORRECTIONS: 'Requiere correcciones',
    APPROVED: 'Aprobado',
  }
  return labels[status] || status
}

export function getPaymentStatusLabel(status?: string): string {
  if (!status) return 'Sin registrar'
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    VERIFIED: 'Verificado',
    REJECTED: 'Rechazado',
    PARTIAL: 'Parcial',
  }
  return labels[status] || status
}