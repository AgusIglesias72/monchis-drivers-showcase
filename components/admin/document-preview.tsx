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
  Loader2,
  Download,
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

const documentTypes = [
  { value: 'CEDULA_FRONT', label: 'Cédula (Frente)' },
  { value: 'CEDULA_BACK', label: 'Cédula (Reverso)' },
  { value: 'LICENCIA_FRONT', label: 'Licencia de Conducir (Frente)' },
  { value: 'LICENCIA_BACK', label: 'Licencia de Conducir (Reverso)' },
  { value: 'LICENSE_FRONT', label: 'Licencia (Frente)' },
  { value: 'LICENSE_BACK', label: 'Licencia (Reverso)' },
  { value: 'CRIMINAL_RECORD', label: 'Antecedentes Penales' },
  { value: 'ANTECEDENTES', label: 'Certificado de Antecedentes' },
  { value: 'TITULO_VEHICULO', label: 'Título del Vehículo' },
  { value: 'CEDULA_VERDE', label: 'Cédula Verde' },
  { value: 'VEHICLE_INSURANCE', label: 'Seguro de Vehículo' },
  { value: 'VEHICLE_REGISTRATION', label: 'Registro de Vehículo' },
  { value: 'VEHICLE_PHOTO_FRONT', label: 'Foto Vehículo (Frente)' },
  { value: 'VEHICLE_PHOTO_BACK', label: 'Foto Vehículo (Atrás)' },
  { value: 'VEHICLE_PHOTO_SIDE', label: 'Foto Vehículo (Lateral)' },
  { value: 'SELFIE', label: 'Selfie con Cédula' },
  { value: 'COMPROBANTE_DOMICILIO', label: 'Comprobante de Domicilio' },
  { value: 'TAX_COMPLIANCE', label: 'Cumplimiento Tributario' },
  { value: 'OTHER', label: 'Otros' },
]

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
      // Solo tomar el primer archivo para evitar el error de body size limit
      const singleFileList = new DataTransfer()
      singleFileList.items.add(files[0])
      onDocumentUpload(type, singleFileList.files)
      e.target.value = ''
    }
  }

  const handleOpenDocument = (document: any) => {
    if (document.blobUrl) {
      window.open(document.blobUrl, '_blank')
    }
  }

  const handleReviewDocument = (document: any) => {
    // Solo abrir modal, NO abrir en nueva pestaña
    setSelectedDocument(document)
    setShowActionsModal(true)
  }

  const handleDownloadDocument = async (document: any) => {
    if (!document.blobUrl) return
    
    try {
      const response = await fetch(document.blobUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = document.fileName || 'documento'
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al descargar:', error)
      // Fallback: abrir en nueva pestaña
      window.open(document.blobUrl, '_blank')
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100', icon: Clock },
      IN_REVIEW: { label: 'En Revisión', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100', icon: Clock },
      APPROVED: { label: 'Aprobado', className: 'bg-green-100 text-green-700 hover:bg-green-100', icon: CheckCircle },
      REJECTED: { label: 'Rechazado', className: 'bg-red-100 text-red-700 hover:bg-red-100', icon: XCircle },
      RESUBMITTED: { label: 'Reenviado', className: 'bg-purple-100 text-purple-700 hover:bg-purple-100', icon: Clock },
    }
    
    const statusConfig = config[status as keyof typeof config] || config.PENDING
    const Icon = statusConfig.icon
    
    return (
      <Badge className={`${statusConfig.className} gap-1 text-xs`}>
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    )
  }

  const getDocumentTypeName = (type: string) => {
    const found = documentTypes.find(dt => dt.value === type)
    return found?.label || type
  }

  // Agrupar documentos por tipo
  const groupedDocuments = documentTypes.map(docType => {
    const docsOfType = documents.filter(doc => doc.documentType === docType.value)
    return {
      type: docType,
      documents: docsOfType
    }
  }).filter(group => group.documents.length > 0)

  return (
    <div className="space-y-4">
      {/* Grupos de documentos */}
      {groupedDocuments.map((group) => {
        return (
          <div key={group.type.value}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-foreground">
                {group.type.label}
              </h4>
            </div>
            
            <div className="space-y-2">
              {group.documents.map((doc) => (
                <div key={doc.id}>
                  {/* Card principal en una sola línea */}
                  <div className="flex items-center justify-between gap-3 py-2 px-1">
                    {/* Lado izquierdo: Icono + Nombre + Badge */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{getDocumentTypeName(doc.documentType)}</span>
                          {getStatusBadge(doc.status)}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                      </div>
                    </div>

                    {/* Lado derecho: Botones de acción */}
                    <div className="flex items-center gap-1">
                      {isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 cursor-pointer"
                          onClick={() => handleReviewDocument(doc)}
                          title="Revisar documento (aprobar/rechazar)"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 cursor-pointer"
                        onClick={() => handleDownloadDocument(doc)}
                        title="Descargar documento"
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 cursor-pointer"
                        onClick={() => handleOpenDocument(doc)}
                        title="Abrir documento en nueva pestaña"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>

                      {isEditing && onDocumentDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
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

                  {/* Info de revisión - debajo si existe */}
                  {doc.reviewedAt && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-8 mb-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>
                        Aprobado por <span className="font-medium">
                          {doc.reviewedByUser?.firstName || doc.reviewedByUser?.fullName || 'Agustin'}
                        </span>
                        {' '}el {new Date(doc.reviewedAt).toLocaleDateString('es-PY', { 
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        }).replace(',', '')}
                      </span>
                    </div>
                  )}

                  {/* Razón de rechazo si existe */}
                  {doc.status === 'REJECTED' && doc.rejectionReason && (
                    <div className="ml-8 mt-1 mb-2 p-2.5 bg-red-50/80 border-l-2 border-red-400 rounded-r text-xs">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-3.5 w-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-red-900 mb-0.5">Motivo del rechazo</p>
                          <p className="text-red-700 leading-relaxed">{doc.rejectionReason}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Mensaje si no hay documentos */}
      {documents.length === 0 && !isLoading && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium">No hay documentos subidos</p>
          <p className="text-xs mt-1">Los documentos aparecerán aquí cuando sean subidos</p>
        </div>
      )}

      {/* Subir nuevo documento */}
      {isEditing && onDocumentUpload && (
        <div className="space-y-3 pt-4 border-t">
          {/* Indicador de carga cuando isLoading es true */}
          {isLoading && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Procesando documento...</p>
                <p className="text-xs text-blue-700">Por favor espera mientras se procesa la solicitud</p>
              </div>
            </div>
          )}

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