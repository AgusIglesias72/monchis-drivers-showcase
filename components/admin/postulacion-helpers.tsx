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
  Eye,
  Download,
  Loader2,
  Upload,
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
            ? 'bg-success-soft text-success border-success'
            : 'bg-muted text-muted-foreground border-border'
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
            ? 'bg-success-soft text-success border-success'
            : 'bg-muted text-muted-foreground border-border'
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
            ? 'bg-info-soft text-info border-info'
            : 'bg-muted text-muted-foreground border-border'
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
  onViewProof,
  onUploadProof 
}: { 
  payment?: any
  postulacionId: string
  onManage: () => void
  onViewProof?: () => void
  onUploadProof?: (file: File) => Promise<void>
}) {
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUploadProof) return

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      alert('Solo se permiten imágenes (JPG, PNG, WebP) o PDF')
      return
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo no debe superar 5MB')
      return
    }

    setUploading(true)
    try {
      await onUploadProof(file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error al subir comprobante:', error)
    } finally {
      setUploading(false)
    }
  }

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
      className: 'bg-warning-soft text-warning border-warning',
      icon: Clock
    },
    VERIFIED: {
      label: 'Verificado',
      className: 'bg-success-soft text-success border-success',
      icon: CheckCircle
    },
    REJECTED: {
      label: 'Rechazado',
      className: 'bg-danger-soft text-destructive border-destructive',
      icon: XCircle
    },
  }
  
  const config = statusConfig[payment.status as keyof typeof statusConfig] || statusConfig.PENDING
  const StatusIcon = config.icon

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      'POS': 'POS',
      'BANK_TRANSFER': 'Transferencia',
      'TRANSFERENCIA': 'Transferencia',
      'CASH': 'Efectivo',
      'OTROS': 'Otros'
    }
    return methods[method] || method
  }

  // ✅ Extraer información del archivo si existe
  const proofFileInfo = payment.paymentProofUrl ? {
    url: payment.paymentProofUrl,
    fileName: payment.paymentProofUrl.split('/').pop()?.split('?')[0] || 'comprobante.pdf',
    // Estimar tipo de archivo por extensión
    type: payment.paymentProofUrl.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Imagen'
  } : null

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
        {payment.paymentDate && (
          <InfoField 
            label="Fecha de Pago" 
            value={new Date(payment.paymentDate).toLocaleDateString('es-PY', {
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
            })} por ${payment.verifiedByUser?.fullName || payment.verifiedByUser?.firstName || 'Admin'}`}
          />
        )}
      </div>

      {/* ✅ COMPROBANTE DE PAGO - CON INFO DEL ARCHIVO */}
      {proofFileInfo ? (
        <div className="pt-3 border-t space-y-2">
          <label className="text-xs font-medium text-muted-foreground block">
            Comprobante de Pago
          </label>
          
          {/* Card del archivo */}
          <div className="border border-border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  Comprobante de Pago
                </p>
                <p className="text-xs text-muted-foreground">
                  {proofFileInfo.type}
                </p>
              </div>
              <div className="flex gap-2">
                {onViewProof && (
                  <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => window.open(proofFileInfo.url, '_blank')}
                  title="Ver"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                )}
              
              </div>
            </div>
          </div>

          {/* Opción para reemplazar */}
          {onUploadProof && (
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4     w-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Reemplazar Comprobante
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      ) : (
        // Si no hay comprobante, mostrar botón para subir
        onUploadProof && (
          <div className="pt-3 border-t">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Comprobante
                </>
              )}
            </Button>
          </div>
        )
      )}

      {/* Notas y razón de rechazo */}
      {payment.adminNotes && (
        <div className="pt-3 border-t space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground block">Notas Administrativas</label>
          <p className="text-xs bg-muted/50 p-2.5 rounded-md">{payment.adminNotes}</p>
        </div>
      )}
      
      {payment.rejectionReason && (
        <div className="pt-3 border-t space-y-1.5">
          <label className="text-xs font-medium text-destructive block">Motivo de Rechazo</label>
          <p className="text-xs text-destructive bg-danger-soft p-2.5 rounded-md border border-destructive">
            {payment.rejectionReason}
          </p>
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
              Podés agendar el onboarding en cualquier momento
            </p>
          </div>
        </div>
        
        {/* ✅ SIEMPRE ACTIVO - Sin validación de estado */}
        <Button 
          size="sm" 
          variant="default" 
          className="w-full cursor-pointer" 
          onClick={onSchedule}
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          Agendar Onboarding
        </Button>
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
      className: 'bg-info-soft text-info border-info',
      icon: CheckCircle
    },
    ATTENDED: {
      label: 'Asistió',
      className: 'bg-success-soft text-success border-success',
      icon: CheckCircle
    },
    NO_SHOW: {
      label: 'No Asistió',
      className: 'bg-danger-soft text-destructive border-destructive',
      icon: XCircle
    },
    CANCELLED: {
      label: 'Cancelado',
      className: 'bg-muted text-foreground border-border',
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
          value={attendance.event.endTime 
            ? `${attendance.event.startTime} - ${attendance.event.endTime}`
            : attendance.event.startTime
          }
        />

        {attendance.event.location && (
          <InfoField 
            label="Ubicación" 
            value={attendance.event.location}
          />
        )}
      </div>

      {/* Botón de gestionar - SIEMPRE ACTIVO */}
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
