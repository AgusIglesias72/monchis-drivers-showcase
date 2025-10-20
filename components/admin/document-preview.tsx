// components/admin/document-preview.tsx

"use client"

import { useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  FileText,
  Download,
  Eye,
  Trash2,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
  Loader2,
  User,
} from "lucide-react"

interface Document {
  id: string
  documentType: string
  fileName: string
  blobUrl: string
  status: string
  uploadedAt: Date
  fileSize?: number
  mimeType?: string
  reviewedAt?: Date
  reviewedBy?: string
  reviewedByUser?: {
    firstName?: string
    fullName?: string
    email?: string
  }
  rejectionReason?: string
  adminNotes?: string
}

interface DocumentPreviewProps {
  documents: Document[]
  isEditing: boolean
  onDocumentDelete?: (documentId: string) => void
  onDocumentUpload?: (documentType: string, files: FileList) => void
  onDocumentApprove?: (documentId: string) => Promise<void>
  onDocumentReject?: (documentId: string, reason: string) => Promise<void>
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CEDULA_FRONT: 'Cédula (Frente)',
  CEDULA_BACK: 'Cédula (Dorso)',
  CRIMINAL_RECORD: 'Antecedentes Penales',
  LICENSE_FRONT: 'Licencia (Frente)',
  LICENSE_BACK: 'Licencia (Dorso)',
  VEHICLE_PHOTO_FRONT: 'Vehículo (Frente)',
  VEHICLE_PHOTO_BACK: 'Vehículo (Atrás)',
  VEHICLE_PHOTO_SIDE: 'Vehículo (Lateral)',
  VEHICLE_INSURANCE: 'Seguro del Vehículo',
  VEHICLE_REGISTRATION: 'Registro del Vehículo',
  TAX_COMPLIANCE: 'Certificado de Cumplimiento Tributario',
  SELFIE: 'Selfie',
  OTHER: 'Otro Documento',
}

const DOCUMENT_TYPES = [
  { value: 'CEDULA_FRONT', label: 'Cédula (Frente)' },
  { value: 'CEDULA_BACK', label: 'Cédula (Dorso)' },
  { value: 'CRIMINAL_RECORD', label: 'Antecedentes Penales' },
  { value: 'LICENSE_FRONT', label: 'Licencia (Frente)' },
  { value: 'LICENSE_BACK', label: 'Licencia (Dorso)' },
  { value: 'VEHICLE_PHOTO_FRONT', label: 'Vehículo (Frente)' },
  { value: 'VEHICLE_PHOTO_BACK', label: 'Vehículo (Atrás)' },
  { value: 'VEHICLE_PHOTO_SIDE', label: 'Vehículo (Lateral)' },
  { value: 'VEHICLE_INSURANCE', label: 'Seguro del Vehículo' },
  { value: 'VEHICLE_REGISTRATION', label: 'Registro del Vehículo' },
  { value: 'TAX_COMPLIANCE', label: 'Certificado Tributario' },
  { value: 'SELFIE', label: 'Selfie' },
  { value: 'OTHER', label: 'Otro' },
]

export function DocumentPreview({
  documents,
  isEditing,
  onDocumentDelete,
  onDocumentUpload,
  onDocumentApprove,
  onDocumentReject,
}: DocumentPreviewProps) {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [selectedDocType, setSelectedDocType] = useState<string>('')
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [processingDocId, setProcessingDocId] = useState<string | null>(null)

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: {
        label: 'Pendiente',
        icon: <Clock className="h-3 w-3" />,
        className: 'bg-amber-100 text-amber-800 border-amber-200',
      },
      IN_REVIEW: {
        label: 'En Revisión',
        icon: <Eye className="h-3 w-3" />,
        className: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      APPROVED: {
        label: 'Aprobado',
        icon: <CheckCircle className="h-3 w-3" />,
        className: 'bg-green-100 text-green-800 border-green-200',
      },
      REJECTED: {
        label: 'Rechazado',
        icon: <XCircle className="h-3 w-3" />,
        className: 'bg-red-100 text-red-800 border-red-200',
      },
      RESUBMITTED: {
        label: 'Re-subido',
        icon: <Upload className="h-3 w-3" />,
        className: 'bg-purple-100 text-purple-800 border-purple-200',
      },
    }

    const { label, icon, className } = config[status as keyof typeof config] || config.PENDING

    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        {icon}
        {label}
      </Badge>
    )
  }

  const handlePreview = (doc: Document) => {
    setSelectedDoc(doc)
    setShowPreview(true)
  }

  const handleUploadClick = () => {
    setShowUploadDialog(true)
    setSelectedDocType('')
    setSelectedFiles(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files)
    }
  }

  const handleConfirmUpload = async () => {
    if (!selectedDocType || !selectedFiles || !onDocumentUpload) return

    setIsUploading(true)
    try {
      await onDocumentUpload(selectedDocType, selectedFiles)
      setShowUploadDialog(false)
      setSelectedDocType('')
      setSelectedFiles(null)
    } catch (error) {
      console.error('Error uploading:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleApprove = async (docId: string) => {
    if (!onDocumentApprove) return
    setProcessingDocId(docId)
    try {
      await onDocumentApprove(docId)
      setShowPreview(false)
    } finally {
      setProcessingDocId(null)
    }
  }

  const handleReject = async (docId: string) => {
    if (!onDocumentReject) return
    const reason = prompt('Razón del rechazo:')
    if (!reason) return
    
    setProcessingDocId(docId)
    try {
      await onDocumentReject(docId, reason)
      setShowPreview(false)
    } finally {
      setProcessingDocId(null)
    }
  }

  // Agrupar documentos por tipo
  const groupedDocs = documents.reduce((acc, doc) => {
    if (!acc[doc.documentType]) {
      acc[doc.documentType] = []
    }
    acc[doc.documentType].push(doc)
    return acc
  }, {} as Record<string, Document[]>)

  return (
    <div className="space-y-4">
      {documents.length === 0 ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No hay documentos subidos
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Los documentos aparecerán aquí cuando el postulante los suba
            </p>
          </div>
    
          {isEditing && onDocumentUpload && (
            <Button
              type="button"
              onClick={handleUploadClick}
              variant="outline"
              className="w-full gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Agregar Documento
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedDocs).map(([docType, docs]) => (
            <div key={docType} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  {DOCUMENT_TYPE_LABELS[docType] || docType}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {docs.length} archivo{docs.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {doc.fileName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(doc.fileSize)}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(doc.uploadedAt).toLocaleDateString('es-PY')}
                            </span>
                          </div>
                        </div>
                        {getStatusBadge(doc.status)}
                      </div>

                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer"
                          onClick={() => handlePreview(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer"
                          onClick={() => window.open(doc.blobUrl, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {isEditing && onDocumentDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                            onClick={() => onDocumentDelete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Mostrar quién revisó el documento */}
                    {(doc.status === 'APPROVED' || doc.status === 'REJECTED') && (
                      <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>
                          {doc.status === 'APPROVED' ? 'Aprobado' : 'Rechazado'} por{' '}
                          <span className="font-medium">
                            {doc.reviewedByUser?.firstName || doc.reviewedByUser?.fullName || doc.reviewedByUser?.email || 'Admin'}
                          </span>
                        </span>
                        {doc.reviewedAt && (
                          <>
                            <span>•</span>
                            <span>{new Date(doc.reviewedAt).toLocaleDateString('es-PY')}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Razón de rechazo si existe */}
                    {doc.status === 'REJECTED' && doc.rejectionReason && (
                      <div className="flex items-start gap-2 pt-2 border-t text-xs bg-red-50 p-2 rounded">
                        <AlertCircle className="h-3 w-3 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-red-900">Razón del rechazo:</span>
                          <p className="text-red-700 mt-1">{doc.rejectionReason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {isEditing && onDocumentUpload && (
            <Button
              type="button"
              onClick={handleUploadClick}
              variant="outline"
              className="w-full gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Agregar Documento
            </Button>
          )}
        </div>
      )}

      {/* Dialog para preview de documento */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedDoc && DOCUMENT_TYPE_LABELS[selectedDoc.documentType]}
            </DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <div className="flex items-center justify-center bg-muted/50 rounded-lg p-4 min-h-[500px]">
                {selectedDoc.mimeType?.startsWith('image/') ? (
                  <Image
                    src={selectedDoc.blobUrl}
                    alt={selectedDoc.fileName}
                    width={1000}
                    height={1000}
                    className="max-w-full max-h-[500px] object-contain"
                    style={{ height: 'auto', width: 'auto' }}
                  />
                ) : selectedDoc.mimeType === 'application/pdf' ? (
                  <iframe
                    src={selectedDoc.blobUrl}
                    className="w-full h-[500px] border-0"
                    title={selectedDoc.fileName}
                  />
                ) : (
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Vista previa no disponible para este tipo de archivo
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => window.open(selectedDoc.blobUrl, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar archivo
                    </Button>
                  </div>
                )}
              </div>

              {/* Acciones de revisión con loading */}
              {selectedDoc.status === 'PENDING' && onDocumentApprove && onDocumentReject && (
                <div className="flex items-center gap-2 pt-4 border-t">
                  <Button
                    variant="default"
                    className="flex-1 bg-green-600 hover:bg-green-700 cursor-pointer"
                    onClick={() => handleApprove(selectedDoc.id)}
                    disabled={processingDocId === selectedDoc.id}
                  >
                    {processingDocId === selectedDoc.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Aprobando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprobar Documento
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 cursor-pointer"
                    onClick={() => handleReject(selectedDoc.id)}
                    disabled={processingDocId === selectedDoc.id}
                  >
                    {processingDocId === selectedDoc.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Rechazando...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Rechazar Documento
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para subir documento */}
      <Dialog 
        open={showUploadDialog} 
        onOpenChange={(open) => {
          setShowUploadDialog(open)
          if (!open) {
            setSelectedDocType('')
            setSelectedFiles(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Documento</label>
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Archivo</label>
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {selectedFiles && (
                <p className="text-xs text-muted-foreground">
                  {selectedFiles.length} archivo{selectedFiles.length !== 1 ? 's' : ''} seleccionado{selectedFiles.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
                className="flex-1 cursor-pointer"
                disabled={isUploading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmUpload}
                className="flex-1 cursor-pointer"
                disabled={!selectedDocType || !selectedFiles || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}