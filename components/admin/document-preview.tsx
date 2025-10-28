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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  FileText, 
  Upload, 
  Download,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
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

// ✅ SIMPLIFICADO - Solo documentos esenciales
const documentTypes = [
  { value: 'CEDULA_FRONT', label: 'Cédula (Frente)' },
  { value: 'CRIMINAL_RECORD', label: 'Antecedentes Penales' },
  { value: 'LICENCIA_FRONT', label: 'Licencia de Conducir' },
  { value: 'VEHICLE_PHOTO_FRONT', label: 'Foto del Vehículo' },
  { value: 'TAX_COMPLIANCE', label: 'Certificado Tributario', special: true }, // ← Especial
  { value: "OTHER", label: 'Otros' },
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
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = e.target.files
    if (files && files.length > 0 && onDocumentUpload) {
      onDocumentUpload(type, files)
      e.target.value = ''
      setUploadType('')
    }
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Error al descargar:', error)
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    return documentTypes.find(dt => dt.value === type)?.label || type
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3" />Pendiente</Badge>,
      IN_REVIEW: <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200"><Eye className="h-3 w-3" />En Revisión</Badge>,
      APPROVED: <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3" />Aprobado</Badge>,
      REJECTED: <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3" />Rechazado</Badge>,
    }
    return badges[status as keyof typeof badges] || badges.PENDING
  }

  // Agrupar documentos por tipo base
  const groupedDocuments: Record<string, { title: string; documents: any[] }> = documents.reduce((acc, doc) => {
    const baseType = doc.documentType
    
    if (!acc[baseType]) {
      acc[baseType] = {
        title: baseType,
        documents: []
      }
    }
    acc[baseType].documents.push(doc)
    return acc
  }, {} as Record<string, { title: string; documents: any[] }>)

  const getSectionTitle = (type: string) => {
    const titles: Record<string, string> = {
      'CEDULA_FRONT': 'Cédula',
      'CRIMINAL_RECORD': 'Antecedentes Penales',
      'LICENCIA_FRONT': 'Licencia de Conducir',
      'VEHICLE_PHOTO_FRONT': 'Foto del Vehículo',
      'TAX_COMPLIANCE': 'Certificado Tributario',
    }
    return titles[type] || type
  }

  // ✅ Identificar si es TAX_COMPLIANCE
  const isTaxCompliance = (type: string) => type === 'TAX_COMPLIANCE'

  return (
    <div className="space-y-6">
      {documents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hay documentos adjuntos</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedDocuments).map(([type, group], groupIndex) => (
            <div key={type}>
              {groupIndex > 0 && <div className="border-t border-border mb-6" />}
              
              {/* Título de sección con badge especial para TAX_COMPLIANCE */}
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-semibold text-foreground">
                  {getSectionTitle(type)}
                </h4>
                {isTaxCompliance(type) && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Sincronizado con Facturación
                  </Badge>
                )}
              </div>

              {/* Documentos de esta sección */}
              <div className="space-y-2">
                {group.documents.map((doc: any) => (
                  <div key={doc.id} className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {getDocumentTypeLabel(doc.documentType)}
                          </span>
                          {getStatusBadge(doc.status)}
                        </div>

                        <p className="text-xs text-muted-foreground mb-1">
                          {doc.fileName}
                        </p>

                        {/* Info especial para TAX_COMPLIANCE */}
                        {isTaxCompliance(doc.documentType) && (
                          <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3 w-3" />
                            Este documento actualiza automáticamente el registro de facturación
                          </p>
                        )}

                        {doc.status === 'APPROVED' && doc.reviewedBy && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Aprobado por {doc.reviewedByUser?.firstName || 'Admin'} el{' '}
                            {new Date(doc.reviewedAt).toLocaleDateString('es-PY', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}

                        {doc.status === 'REJECTED' && doc.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1">
                            Motivo: {doc.rejectionReason}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(doc.blobUrl, '_blank')}
                          className="h-8 w-8 cursor-pointer"
                          title="Ver"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDownload(doc.blobUrl, doc.fileName)}
                          className="h-8 w-8 cursor-pointer"
                          title="Descargar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>

                        {isEditing && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedDocument(doc)
                                setShowActionsModal(true)
                              }}
                              className="h-8 w-8 cursor-pointer"
                              title="Revisar"
                              disabled={isLoading}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>

                            {onDocumentDelete && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeleteDocumentId(doc.id)}
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                title="Eliminar"
                                disabled={isLoading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sección de upload */}
      {isEditing && onDocumentUpload && (
        <div className="space-y-3 pt-4 border-t">
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
                    {type.special && (
                      <span className="text-xs text-blue-600 ml-2">
                        (Sincroniza con Facturación)
                      </span>
                    )}
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
          
          {/* ✅ Warning especial para TAX_COMPLIANCE */}
          {uploadType === 'TAX_COMPLIANCE' && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700">
                <p className="font-medium">Nota importante:</p>
                <p>Este documento se sincronizará automáticamente con el registro de facturación del conductor.</p>
              </div>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            Formatos aceptados: JPG, PNG, PDF • Tamaño máximo: 5MB
          </p>
        </div>
      )}

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

      <AlertDialog open={!!deleteDocumentId} onOpenChange={(open) => !open && setDeleteDocumentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El documento será eliminado permanentemente del sistema.
              {deleteDocumentId && documents.find(d => d.id === deleteDocumentId)?.documentType === 'TAX_COMPLIANCE' && (
                <span className="block mt-2 text-blue-600 font-medium">
                  Nota: También se eliminará la referencia en el registro de facturación.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDocumentId && onDocumentDelete) {
                  onDocumentDelete(deleteDocumentId)
                  setDeleteDocumentId(null)
                }
              }}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}