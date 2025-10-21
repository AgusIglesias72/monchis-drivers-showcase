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
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)

  const handleOpenDocument = () => {
    if (document?.blobUrl) {
      window.open(document.blobUrl, '_blank')
    }
  }

  const handleApprove = () => {
    if (confirm('¿Aprobar este documento?')) {
      onApprove(document.id)
      onOpenChange(false)
    }
  }

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Debes indicar el motivo del rechazo')
      return
    }
    
    if (confirm('¿Rechazar este documento?')) {
      onReject(document.id, rejectionReason)
      setRejectionReason('')
      setAction(null)
      onOpenChange(false)
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CEDULA_FRONT: 'Cédula (Frente)',
      CEDULA_BACK: 'Cédula (Dorso)',
      LICENSE_FRONT: 'Licencia (Frente)',
      LICENSE_BACK: 'Licencia (Dorso)',
      CRIMINAL_RECORD: 'Antecedentes Penales',
      VEHICLE_INSURANCE: 'Seguro de Vehículo',
      VEHICLE_REGISTRATION: 'Registro de Vehículo',
      VEHICLE_PHOTO_FRONT: 'Foto Vehículo (Frente)',
      VEHICLE_PHOTO_BACK: 'Foto Vehículo (Atrás)',
      VEHICLE_PHOTO_SIDE: 'Foto Vehículo (Lateral)',
      TAX_COMPLIANCE: 'Cumplimiento Tributario',
      PAYMENT_PROOF: 'Comprobante de Pago',
      SELFIE: 'Selfie',
      OTHER: 'Otro',
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
      IN_REVIEW: { label: 'En Revisión', className: 'bg-blue-100 text-blue-700' },
      APPROVED: { label: 'Aprobado', className: 'bg-green-100 text-green-700' },
      REJECTED: { label: 'Rechazado', className: 'bg-red-100 text-red-700' },
    }
    const { label, className } = config[status as keyof typeof config] || config.PENDING
    return <Badge className={className}>{label}</Badge>
  }

  if (!document) return null

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

          {/* Selector de acción */}
          {!action && document.status !== 'APPROVED' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                onClick={() => setAction('approve')}
                className="gap-2 bg-green-600 hover:bg-green-700 cursor-pointer"
                disabled={isLoading}
              >
                <CheckCircle className="h-4 w-4" />
                Aprobar
              </Button>
              <Button
                onClick={() => setAction('reject')}
                variant="destructive"
                className="gap-2 cursor-pointer"
                disabled={isLoading}
              >
                <XCircle className="h-4 w-4" />
                Rechazar
              </Button>
            </div>
          )}

          {/* Formulario de aprobación */}
          {action === 'approve' && (
            <div className="space-y-4 p-4 border border-green-200 bg-green-50/50 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Aprobar documento</span>
              </div>
              <p className="text-sm text-muted-foreground">
                ¿Estás seguro de que deseas aprobar este documento?
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700 cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Aprobando...
                    </>
                  ) : (
                    'Confirmar Aprobación'
                  )}
                </Button>
                <Button
                  onClick={() => setAction(null)}
                  variant="outline"
                  disabled={isLoading}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Formulario de rechazo */}
          {action === 'reject' && (
            <div className="space-y-4 p-4 border border-red-200 bg-red-50/50 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                <span className="font-semibold">Rechazar documento</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rejection-reason" className="text-sm font-medium">
                  Motivo del rechazo <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ej: La imagen está borrosa, no se pueden leer los datos claramente. Por favor, suba una foto más nítida."
                  rows={4}
                  disabled={isLoading}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Este mensaje será visible para el usuario. Sé claro y específico sobre qué debe corregir.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleReject}
                  variant="destructive"
                  className="flex-1 cursor-pointer"
                  disabled={isLoading || !rejectionReason.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Rechazando...
                    </>
                  ) : (
                    'Confirmar Rechazo'
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setAction(null)
                    setRejectionReason('')
                  }}
                  variant="outline"
                  disabled={isLoading}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Mostrar razón de rechazo anterior si existe */}
          {document.status === 'REJECTED' && document.rejectionReason && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-semibold text-red-700 mb-1">
                Motivo de rechazo anterior:
              </p>
              <p className="text-sm text-red-600">{document.rejectionReason}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setAction(null)
              setRejectionReason('')
              onOpenChange(false)
            }}
            disabled={isLoading}
            className="cursor-pointer"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}