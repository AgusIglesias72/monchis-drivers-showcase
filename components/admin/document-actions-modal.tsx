// components/admin/document-actions-modal.tsx
"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ExternalLink,
  FileText,
  Calendar,
} from "lucide-react"
import { toast } from "sonner"

interface DocumentActionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: any
  onApprove: (documentId: string) => void
  onReject: (documentId: string, reason: string) => void
  isLoading?: boolean
}

export function DocumentActionsModal({
  open,
  onOpenChange,
  document,
  onApprove,
  onReject,
  isLoading = false,
}: DocumentActionsModalProps) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleOpenDocument = () => {
    if (document?.blobUrl) {
      window.open(document.blobUrl, '_blank')
    }
  }

  const handleConfirmApprove = async () => {
    setIsProcessing(true)
    try {
      await onApprove(document.id)
      setShowApproveConfirm(false)
      onOpenChange(false)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Debes indicar el motivo del rechazo')
      return
    }
    
    setIsProcessing(true)
    try {
      await onReject(document.id, rejectionReason)
      setRejectionReason('')
      setShowRejectForm(false)
      onOpenChange(false)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    setShowApproveConfirm(false)
    setShowRejectForm(false)
    setRejectionReason('')
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CEDULA: 'Cédula',
      LICENCIA_FRONT: 'Licencia (Frente)',
      LICENCIA_BACK: 'Licencia (Reverso)',
      LICENSE_FRONT: 'Licencia (Frente)',
      LICENSE_BACK: 'Licencia (Reverso)',
      CRIMINAL_RECORD: 'Antecedentes Penales',
      ANTECEDENTES: 'Antecedentes Penales',
      VEHICLE_INSURANCE: 'Seguro de Vehículo',
      VEHICLE_REGISTRATION: 'Registro de Vehículo',
      VEHICLE_PHOTO_FRONT: 'Foto Vehículo (Frente)',
      VEHICLE_PHOTO_BACK: 'Foto Vehículo (Atrás)',
      VEHICLE_PHOTO_SIDE: 'Foto Vehículo (Lateral)',
      TAX_COMPLIANCE: 'Cumplimiento Tributario',
      PAYMENT_PROOF: 'Comprobante de Pago',
      SELFIE: 'Selfie con Cédula',
      COMPROBANTE_DOMICILIO: 'Comprobante de Domicilio',
      TITULO_VEHICULO: 'Título del Vehículo',
      CEDULA_VERDE: 'Cédula Verde',
      OTHER: 'Otro',
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
      IN_REVIEW: { label: 'En Revisión', className: 'bg-blue-50 text-blue-700 border-blue-200' },
      APPROVED: { label: 'Aprobado', className: 'bg-green-50 text-green-700 border-green-200' },
      REJECTED: { label: 'Rechazado', className: 'bg-red-50 text-red-700 border-red-200' },
    }
    const { label, className } = config[status as keyof typeof config] || config.PENDING
    return <Badge variant="outline" className={className}>{label}</Badge>
  }

  if (!document) return null

  // Si está mostrando confirmación de aprobación
  if (showApproveConfirm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Aprobar documento
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas aprobar este documento?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium">{getDocumentTypeLabel(document.documentType)}</p>
              <p className="text-xs text-muted-foreground mt-1">{document.fileName}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading || isProcessing}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmApprove}
              className="bg-green-600 hover:bg-green-700 cursor-pointer"
              disabled={isLoading || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aprobando...
                </>
              ) : (
                'Confirmar Aprobación'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Si está mostrando formulario de rechazo
  if (showRejectForm) {
    // Verificar si es un documento de Antecedentes Penales
    const isCriminalRecord = document.documentType === 'CRIMINAL_RECORD'

    // Motivos rápidos predefinidos para Antecedentes Penales
    const quickRejectionReasons = [
      'Documento Vencido',
      'No corresponde a lo solicitado'
    ]

    const handleQuickReject = (reason: string) => {
      setRejectionReason(reason)
    }

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              Rechazar documento
            </DialogTitle>
            <DialogDescription>
              Indica el motivo del rechazo. Este mensaje será visible para el conductor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium">{getDocumentTypeLabel(document.documentType)}</p>
              <p className="text-xs text-muted-foreground mt-1">{document.fileName}</p>
            </div>

            {/* Botones de rechazo rápido para Antecedentes Penales */}
            {isCriminalRecord && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Motivos rápidos
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {quickRejectionReasons.map((reason) => (
                    <Button
                      key={reason}
                      type="button"
                      variant={rejectionReason === reason ? "default" : "outline"}
                      onClick={() => handleQuickReject(reason)}
                      className={`w-full justify-start text-left cursor-pointer ${
                        rejectionReason === reason
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'hover:bg-muted'
                      }`}
                      disabled={isLoading || isProcessing}
                    >
                      {reason}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="rejection-reason" className="text-sm font-medium">
                {isCriminalRecord ? 'O escribe un motivo personalizado' : 'Motivo del rechazo'} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej: La imagen está borrosa, no se pueden leer los datos claramente."
                rows={4}
                disabled={isLoading}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading || isProcessing}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmReject}
              variant="destructive"
              className="cursor-pointer"
              disabled={isLoading || isProcessing || !rejectionReason.trim()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rechazando...
                </>
              ) : (
                'Confirmar Rechazo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Vista principal - selección de acción
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Revisión de Documento</DialogTitle>
          <DialogDescription>
            Revisa el documento y decide si aprobarlo o rechazarlo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info del documento */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">
                    {getDocumentTypeLabel(document.documentType)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{document.fileName}</p>
              </div>
              {getStatusBadge(document.status)}
            </div>

            {document.uploadedAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Subido el {new Date(document.uploadedAt).toLocaleDateString('es-PY', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}

            {document.fileSize && (
              <p className="text-xs text-muted-foreground">
                Tamaño: {(document.fileSize / 1024).toFixed(2)} KB
              </p>
            )}
          </div>

          {/* Botón para abrir documento */}
          <Button
            onClick={handleOpenDocument}
            variant="outline"
            className="w-full gap-2 cursor-pointer"
            disabled={!document.blobUrl}
          >
            <ExternalLink className="h-4 w-4" />
            Abrir documento en nueva pestaña
          </Button>

          {/* Mostrar razón de rechazo anterior si existe */}
          {document.status === 'REJECTED' && document.rejectionReason && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-semibold text-red-700 mb-1">
                Motivo de rechazo anterior:
              </p>
              <p className="text-sm text-red-600">{document.rejectionReason}</p>
            </div>
          )}

          {/* Botones de acción */}
          {document.status !== 'APPROVED' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                onClick={() => setShowApproveConfirm(true)}
                className="gap-2 bg-green-600 hover:bg-green-700 cursor-pointer"
                disabled={isLoading || isProcessing}
              >
                <CheckCircle className="h-4 w-4" />
                Aprobar
              </Button>
              <Button
                onClick={() => setShowRejectForm(true)}
                variant="destructive"
                className="gap-2 cursor-pointer"
                disabled={isLoading || isProcessing}
              >
                <XCircle className="h-4 w-4" />
                Rechazar
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading || isProcessing}
            className="cursor-pointer"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}