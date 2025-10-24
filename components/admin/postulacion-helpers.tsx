// components/admin/postulacion-helpers.tsx
"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Edit, 
  FileText,
  Calendar as CalendarIcon,
} from "lucide-react"

// ==================== HELPER FUNCTIONS ====================

function InfoField({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      <p className="text-sm">{value || <span className="text-muted-foreground">-</span>}</p>
    </div>
  )
}

// ==================== STATUS BADGES COMPONENT ====================

export function StatusBadges({ 
  formStatus, 
  paymentStatus, 
  onboardingStatus 
}: { 
  formStatus: string
  paymentStatus?: string
  onboardingStatus?: string
}) {
  // Determinar si cada badge está activo
  const isCompleted = formStatus === 'COMPLETED'
  const isPaymentVerified = paymentStatus === 'VERIFIED'
  const isOnboardingConfirmed = ['CONFIRMED', 'ATTENDED', 'CHECKED_IN'].includes(onboardingStatus || '')

  return (
    <div className="flex flex-wrap gap-2">
      {/* Badge 1: Completada */}
      <Badge 
        variant="outline" 
        className={`gap-1.5 ${
          isCompleted 
            ? 'bg-green-50 text-green-700 border-green-200' 
            : 'bg-gray-50 text-gray-500 border-gray-200'
        }`}
      >
        <CheckCircle className="h-3.5 w-3.5" />
        Completada
      </Badge>

      {/* Badge 2: Pago Verificado */}
      <Badge 
        variant="outline" 
        className={`gap-1.5 ${
          isPaymentVerified 
            ? 'bg-green-50 text-green-700 border-green-200' 
            : 'bg-gray-50 text-gray-500 border-gray-200'
        }`}
      >
        <CheckCircle className="h-3.5 w-3.5" />
        Pago Verificado
      </Badge>

      {/* Badge 3: Onboarding Confirmado */}
      <Badge 
        variant="outline" 
        className={`gap-1.5 ${
          isOnboardingConfirmed 
            ? 'bg-blue-50 text-blue-700 border-blue-200' 
            : 'bg-gray-50 text-gray-500 border-gray-200'
        }`}
      >
        <CheckCircle className="h-3.5 w-3.5" />
        Onboarding Confirmado
      </Badge>
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

      {/* Información del pago */}
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

        {/* Comprobante y Factura */}
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

        {/* Verificado por - CON NOMBRE COMPLETO DEL USUARIO */}
        {payment.verifiedAt && payment.verifiedBy && (
          <InfoField 
            label="Verificado" 
            value={`${new Date(payment.verifiedAt).toLocaleDateString('es-PY', {
              day: '2-digit',
              month: 'short'
            })} por ${payment.verifiedByUser?.fullName || payment.verifiedByUser?.firstName || 'Admin'}`}
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
      
      {/* Botón de gestionar */}
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
  if (!attendance) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <CalendarIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Sin onboarding agendado</p>
            <p className="text-xs text-muted-foreground mt-1">
              {status === 'READY' 
                ? 'El conductor está listo para agendar'
                : 'El conductor aún no está listo'}
            </p>
          </div>
        </div>
        
        {status === 'READY' && (
          <Button 
            size="sm" 
            variant="default" 
            className="w-full cursor-pointer" 
            onClick={onSchedule}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Agendar Onboarding
          </Button>
        )}
        
        {status !== 'READY' && (
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full" 
            disabled
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            No Listo para Agendar
          </Button>
        )}
      </div>
    )
  }

  const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
    INVITED: { 
      label: 'Invitado', 
      className: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: CalendarIcon 
    },
    CONFIRMED: { 
      label: 'Confirmado', 
      className: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: CheckCircle 
    },
    ATTENDED: { 
      label: 'Asistió', 
      className: 'bg-green-50 text-green-700 border-green-200',
      icon: CheckCircle 
    },
    NO_SHOW: { 
      label: 'No Asistió', 
      className: 'bg-red-50 text-red-700 border-red-200',
      icon: XCircle 
    },
    CANCELLED: { 
      label: 'Cancelado', 
      className: 'bg-gray-50 text-gray-700 border-gray-200',
      icon: XCircle 
    },
  }

  const config = statusConfig[attendance.status] || statusConfig.INVITED
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
      <div className="space-y-3">
        <InfoField 
          label="Fecha" 
          value={new Date(attendance.event.scheduledDate).toLocaleDateString('es-PY', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            weekday: 'long'
          })}
        />
        
        <InfoField 
          label="Horario" 
          value={`${attendance.event.startTime} - ${attendance.event.endTime}`}
        />

        {attendance.event.location && (
          <InfoField 
            label="Ubicación" 
            value={attendance.event.location}
          />
        )}
      </div>

      {/* Botón de gestionar */}
      <div className="pt-3 border-t">
        <Button 
          size="sm" 
          variant="default" 
          className="w-full cursor-pointer" 
          onClick={onSchedule}
        >
          <Edit className="h-4 w-4 mr-2" />
          Gestionar Onboarding
        </Button>
      </div>
    </div>
  )
}