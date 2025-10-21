// components/admin/document-preview.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  FileText, 
  Upload, 
  ExternalLink,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react"
import { DocumentActionsModal } from "@/components/admin/document-actions-modal"

interface DocumentPreviewProps {
  documents: any[]
  isEditing?: boolean
  onDocumentDelete?: (documentId: string) => void
  onDocumentUpload?: (documentType: string, files: FileList) => void
  onDocumentApprove?: (documentId: string) => void
  onDocumentReject?: (documentId: string, reason: string) => void
  isLoading?: boolean
}

export function DocumentPreview({
  documents = [],
  isEditing = false,
  onDocumentDelete,
  onDocumentUpload,
  onDocumentApprove,
  onDocumentReject,
  isLoading = false,
}: DocumentPreviewProps) {
  const [selectedDocument, setSelectedDocument] = useState<any>(null)
  const [showActionsModal, setShowActionsModal] = useState(false)
  const [uploadType, setUploadType] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = e.target.files
    if (files && files.length > 0 && onDocumentUpload) {
      onDocumentUpload(type, files)
      e.target.value = ''
    }
  }

  const handleOpenDocument = (document: any) => {
    if (document.blobUrl) {
      window.open(document.blobUrl, '_blank')
    }
  }

  const handleReviewDocument = (document: any) => {
    // Abrir documento en nueva pestaña
    if (document.blobUrl) {
      window.open(document.blobUrl, '_blank')
    }
    // Abrir modal
    setSelectedDocument(document)
    setShowActionsModal(true)
  }

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
      IN_REVIEW: { label: 'En Revisión', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
      APPROVED: { label: 'Aprobado', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
      REJECTED: { label: 'Rechazado', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
      RESUBMITTED: { label: 'Reenviado', className: 'bg-purple-100 text-purple-700 hover:bg-purple-100' },
    }
    const { label, className } = config[status as keyof typeof config] || config.PENDING
    return <Badge className={className}>{label}</Badge>
  }

  // Agrupar documentos por categoría
  const documentGroups = [
    {
      title: 'Documentos de Identidad',
      types: ['CEDULA_FRONT', 'CEDULA_BACK'],
    },
    {
      title: 'Licencia de Conducir',
      types: ['LICENSE_FRONT', 'LICENSE_BACK'],
    },
    {
      title: 'Antecedentes',
      types: ['CRIMINAL_RECORD'],
    },
    {
      title: 'Documentos del Vehículo',
      types: ['VEHICLE_INSURANCE', 'VEHICLE_REGISTRATION', 'VEHICLE_PHOTO_FRONT', 'VEHICLE_PHOTO_BACK', 'VEHICLE_PHOTO_SIDE'],
    },
    {
      title: 'Otros Documentos',
      types: ['TAX_COMPLIANCE', 'SELFIE', 'PAYMENT_PROOF', 'OTHER'],
    },
  ]

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

  const documentTypes = [
    { value: 'CEDULA_FRONT', label: 'Cédula (Frente)' },
    { value: 'CEDULA_BACK', label: 'Cédula (Dorso)' },
    { value: 'LICENSE_FRONT', label: 'Licencia (Frente)' },
    { value: 'LICENSE_BACK', label: 'Licencia (Dorso)' },
    { value: 'CRIMINAL_RECORD', label: 'Antecedentes Penales' },
    { value: 'VEHICLE_INSURANCE', label: 'Seguro de Vehículo' },
    { value: 'VEHICLE_REGISTRATION', label: 'Registro de Vehículo' },
    { value: 'VEHICLE_PHOTO_FRONT', label: 'Foto Vehículo (Frente)' },
    { value: 'VEHICLE_PHOTO_BACK', label: 'Foto Vehículo (Atrás)' },
    { value: 'VEHICLE_PHOTO_SIDE', label: 'Foto Vehículo (Lateral)' },
    { value: 'SELFIE', label: 'Selfie' },
    { value: 'TAX_COMPLIANCE', label: 'Cumplimiento Tributario' },
    { value: 'OTHER', label: 'Otro' },
  ]

  return (
    <div className="space-y-6">
      {/* Documentos agrupados por categoría */}
      {documentGroups.map((group) => {
        const groupDocs = documents.filter(doc => group.types.includes(doc.documentType))
        
        if (groupDocs.length === 0) return null

        return (
          <div key={group.title} className="space-y-3">
            {/* Título de la sección */}
            <div className="pb-2 border-b">
              <h4 className="font-semibold text-sm text-foreground">{group.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{groupDocs.length} documento{groupDocs.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Documentos de esta categoría */}
            <div className="space-y-2">
              {groupDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleReviewDocument(doc)}
                  className="flex items-start justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-muted cursor-pointer"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">
                          {getDocumentTypeLabel(doc.documentType)}
                        </p>
                        {getStatusBadge(doc.status)}
                      </div>
                      
                      <p className="text-xs text-muted-foreground truncate">
                        {doc.fileName}
                      </p>
                      
                      {/* Info de revisión */}
                      {doc.reviewedAt && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {doc.status === 'APPROVED' ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : doc.status === 'REJECTED' ? (
                            <XCircle className="h-3 w-3 text-red-600" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          <span>
                            {doc.status === 'APPROVED' ? 'Aprobado' : doc.status === 'REJECTED' ? 'Rechazado' : 'Revisado'} 
                            {' por '}
                            <span className="font-medium">
                              {doc.reviewedByUser?.firstName || doc.reviewedByUser?.fullName || doc.reviewedBy || 'Admin'}
                            </span>
                            {' el '}
                            {new Date(doc.reviewedAt).toLocaleDateString('es-PY', { 
                              day: '2-digit', 
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}

                      {/* Razón de rechazo si existe */}
                      {doc.status === 'REJECTED' && doc.rejectionReason && (
                        <div className="mt-2 p-2.5 bg-red-50/80 border-l-2 border-red-400 rounded-r text-xs">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-3.5 w-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-red-900 mb-0.5">Motivo del rechazo</p>
                              <p className="text-red-700 leading-relaxed">{doc.rejectionReason}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Notas del admin si existen */}
                      {doc.adminNotes && (
                        <div className="mt-1.5 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                          <span className="font-semibold">Nota: </span>
                          {doc.adminNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    {/* Abrir */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenDocument(doc)
                      }}
                      title="Abrir documento en nueva pestaña"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>

                    {/* Revisar */}
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReviewDocument(doc)
                        }}
                        title="Revisar documento (aprobar/rechazar)"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Eliminar */}
                    {isEditing && onDocumentDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('¿Eliminar este documento?')) {
                            onDocumentDelete(doc.id)
                          }
                        }}
                        title="Eliminar documento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Mensaje si no hay documentos */}
      {documents.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium">No hay documentos subidos</p>
          <p className="text-xs mt-1">Los documentos aparecerán aquí cuando sean subidos</p>
        </div>
      )}

      {/* Subir nuevo documento */}
      {isEditing && onDocumentUpload && (
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-sm font-semibold">Subir nuevo documento</Label>
          <div className="flex gap-2">
            <Select value={uploadType} onValueChange={setUploadType}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Seleccionar tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label
              htmlFor="file-upload"
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                uploadType
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <Upload className="h-4 w-4" />
              Seleccionar archivo
            </Label>
            <Input
              id="file-upload"
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => uploadType && handleFileChange(e, uploadType)}
              disabled={!uploadType || isLoading}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Formatos aceptados: JPG, PNG, PDF • Tamaño máximo: 10MB
          </p>
        </div>
      )}

      {/* Modal de acciones */}
      <DocumentActionsModal
        open={showActionsModal}
        onOpenChange={setShowActionsModal}
        document={selectedDocument}
        onApprove={(id) => {
          if (onDocumentApprove) {
            onDocumentApprove(id)
          }
        }}
        onReject={(id, reason) => {
          if (onDocumentReject) {
            onDocumentReject(id, reason)
          }
        }}
        isLoading={isLoading}
      />
    </div>
  )
}