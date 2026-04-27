// components/admin/document-preview.tsx
"use client"

import { useState } from "react"
import { WaiveRucButton } from "@/components/admin/postulaciones/waive-ruc-button"
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
  CreditCard,
  Car,
  IdCard,
  FileCheck,
  MoreVertical,
  FileEdit,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DocumentActionsModal } from "@/components/admin/document-actions-modal"
import { EditDocumentTypeModal } from "@/components/admin/edit-document-type-modal"

interface DocumentPreviewProps {
  documents: any[]
  isEditing?: boolean
  onDocumentDelete?: (documentId: string) => void
  onDocumentUpload?: (documentType: string, files: FileList) => void
  onDocumentApprove?: (documentId: string) => void
  onDocumentReject?: (documentId: string, reason: string) => void
  isLoading?: boolean
  // Datos del FormDriver para la excepción "RUC Inactivo"
  driverId?: string
  rucInactiveWaived?: boolean
  rucInactiveWaivedAt?: string | Date | null
  rucInactiveWaivedNote?: string | null
  onWaiveChange?: () => void
}

// ✅ Tipos de documento simplificados - solo opciones esenciales para subir
const documentTypes = [
  { value: 'CEDULA_FRONT', label: 'Cédula', group: 'CEDULA' },
  { value: 'LICENSE_FRONT', label: 'Licencia de Conducir', group: 'LICENSE' },
  { value: 'CRIMINAL_RECORD', label: 'Certificado de Antecedentes Penales', group: 'CRIMINAL_RECORD' },
  { value: 'VEHICLE_PHOTO_FRONT', label: 'Foto del Vehículo', group: 'VEHICLE' },
  { value: 'TAX_COMPLIANCE', label: 'Certificado Tributario', group: 'TAX_COMPLIANCE', special: true },
  { value: 'SELFIE', label: 'Selfie', group: 'SELFIE' },
  { value: 'OTHER', label: 'Otros', group: 'OTHER' },
]

// ✅ Mapeo para mostrar correctamente TODOS los tipos que pueden existir en la BD
const allDocumentLabels: Record<string, { label: string; group: string }> = {
  CEDULA_FRONT: { label: 'Cédula', group: 'CEDULA' },
  CEDULA_BACK: { label: 'Cédula', group: 'CEDULA' },
  LICENSE_FRONT: { label: 'Licencia', group: 'LICENSE' },
  LICENSE_BACK: { label: 'Licencia', group: 'LICENSE' },
  CRIMINAL_RECORD: { label: 'Antecedentes Penales', group: 'CRIMINAL_RECORD' },
  VEHICLE_INSURANCE: { label: 'Seguro del Vehículo', group: 'VEHICLE' },
  VEHICLE_REGISTRATION: { label: 'Registro del Vehículo', group: 'VEHICLE' },
  VEHICLE_PHOTO_FRONT: { label: 'Foto del Vehículo', group: 'VEHICLE' },
  VEHICLE_PHOTO_BACK: { label: 'Foto del Vehículo', group: 'VEHICLE' },
  VEHICLE_PHOTO_SIDE: { label: 'Foto del Vehículo', group: 'VEHICLE' },
  TAX_COMPLIANCE: { label: 'Certificado Tributario', group: 'TAX_COMPLIANCE' },
  PAYMENT_PROOF: { label: 'Comprobante de Pago', group: 'PAYMENT' },
  SELFIE: { label: 'Selfie', group: 'SELFIE' },
  OTHER: { label: 'Otros', group: 'OTHER' },
}

// ✅ Configuración de grupos para la visualización
const documentGroups = {
  CEDULA: {
    title: 'Cédula de Identidad',
    icon: IdCard,
    description: 'Documento de identificación personal',
    special: false
  },
  LICENSE: {
    title: 'Licencia de Conducir',
    icon: CreditCard,
    description: 'Licencia de conducir vigente',
    special: false
  },
  CRIMINAL_RECORD: {
    title: 'Antecedentes Penales',
    icon: FileCheck,
    description: 'Certificado de antecedentes penales',
    special: false
  },
  VEHICLE: {
    title: 'Documentos del Vehículo',
    icon: Car,
    description: 'Documentación y fotos del vehículo',
    special: false
  },
  TAX_COMPLIANCE: {
    title: 'Certificado Tributario',
    icon: FileText,
    description: 'Sincronizado con registro de facturación',
    special: true
  },
  PAYMENT: {
    title: 'Comprobantes de Pago',
    icon: CreditCard,
    description: 'Comprobantes de pago de equipamiento',
    special: false
  },
  SELFIE: {
    title: 'Selfie',
    icon: Eye,
    description: 'Foto de verificación',
    special: false
  },
  OTHER: {
    title: 'Otros Documentos',
    icon: FileText,
    description: 'Documentos adicionales',
    special: false
  },
}

export function DocumentPreview({
  documents = [],
  isEditing = false,
  onDocumentDelete,
  onDocumentUpload,
  onDocumentApprove,
  onDocumentReject,
  isLoading = false,
  driverId,
  rucInactiveWaived = false,
  rucInactiveWaivedAt,
  rucInactiveWaivedNote,
  onWaiveChange,
}: DocumentPreviewProps) {
  const [selectedDocument, setSelectedDocument] = useState<any>(null)
  const [showActionsModal, setShowActionsModal] = useState(false)
  const [showEditTypeModal, setShowEditTypeModal] = useState(false)
  const [documentToEdit, setDocumentToEdit] = useState<any>(null)
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
    return allDocumentLabels[type]?.label || type
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

  // ✅ Agrupar documentos por grupo base (no por tipo individual)
  type GroupKey = keyof typeof documentGroups
  type GroupedDocs = Record<string, { info: typeof documentGroups.CEDULA; documents: any[] }>
  
  const groupedDocuments = documents.reduce<GroupedDocs>((acc, doc) => {
    const docInfo = allDocumentLabels[doc.documentType]
    const group = (docInfo?.group || 'OTHER') as GroupKey
    
    if (!acc[group]) {
      acc[group] = {
        info: documentGroups[group] || documentGroups.OTHER,
        documents: []
      }
    }
    acc[group].documents.push(doc)
    return acc
  }, {})

  // ✅ Secciones que siempre deben aparecer (aunque no haya documentos)
  const permanentSections: GroupKey[] = ['CEDULA', 'CRIMINAL_RECORD', 'TAX_COMPLIANCE']
  
  // ✅ Asegurar que las secciones permanentes existan
  permanentSections.forEach(section => {
    if (!groupedDocuments[section]) {
      groupedDocuments[section] = {
        info: documentGroups[section],
        documents: []
      }
    }
  })

  // ✅ Ordenar grupos según prioridad
  const groupOrder = ['CEDULA', 'LICENSE', 'CRIMINAL_RECORD', 'VEHICLE', 'TAX_COMPLIANCE', 'PAYMENT', 'SELFIE', 'OTHER']
  const sortedGroups = Object.entries(groupedDocuments).sort((a, b) => {
    return groupOrder.indexOf(a[0]) - groupOrder.indexOf(b[0])
  })

  return (
    <div className="space-y-6">
      {documents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hay documentos adjuntos</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(([groupKey, group], groupIndex) => {
            const GroupIcon = group.info.icon
            const isSpecialGroup = group.info.special

            return (
              <div key={groupKey}>
                {groupIndex > 0 && <div className="border-t border-border my-6" />}
                
                {/* ✅ Header del grupo con icono y descripción */}
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                      <GroupIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          {group.info.title}
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {group.info.description}
                      </p>
                    </div>
                    {groupKey === 'TAX_COMPLIANCE' && driverId && (
                      <WaiveRucButton
                        driverId={driverId}
                        waived={rucInactiveWaived}
                        waivedAt={rucInactiveWaivedAt}
                        waivedNote={rucInactiveWaivedNote}
                        onSuccess={onWaiveChange}
                      />
                    )}
                  </div>
                </div>

                {/* ✅ Lista de documentos del grupo */}
                <div className="space-y-2">
                  {group.documents.length === 0 ? (
                    // Mensaje cuando no hay documentos en sección permanente
                    <div className="border border-dashed border-border rounded-lg p-4 text-center">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                      <p className="text-sm text-muted-foreground">
                        {isSpecialGroup 
                          ? 'No hay certificado tributario adjunto. Este documento es necesario para la facturación.'
                          : 'No hay documentos adjuntos en esta categoría'}
                      </p>
                      {isEditing && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Usa el selector de abajo para subir un documento
                        </p>
                      )}
                    </div>
                  ) : (
                    group.documents.map((doc: any) => (
                    <div 
                      key={doc.id} 
                      className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                    >
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

                          <p className="text-xs text-muted-foreground mb-1 truncate">
                            {doc.fileName}
                            {doc.fileSize && (
                              <span className="ml-2 text-gray-400">
                                ({(doc.fileSize / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            )}
                          </p>

                          {doc.status === 'APPROVED' && doc.reviewedBy && (
                            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
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
                            <p className="text-xs text-red-600 mt-1 flex items-start gap-1">
                              <XCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              <span>Motivo: {doc.rejectionReason}</span>
                            </p>
                          )}
                        </div>

                        {/* ✅ Botones de acción */}
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(doc.blobUrl, '_blank')}
                            className="h-8 w-8"
                            title="Ver"
                          >
                            <Eye className="h-4 w-4" />
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
                                className="h-8 w-8"
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
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Eliminar"
                                  disabled={isLoading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Botón de tres puntos con más acciones */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    title="Más acciones"
                                    disabled={isLoading}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleDownload(doc.blobUrl, doc.fileName)}
                                    className="cursor-pointer"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Descargar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setDocumentToEdit(doc)
                                      setShowEditTypeModal(true)
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <FileEdit className="h-4 w-4 mr-2" />
                                    Modificar tipo
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ✅ Sección de carga de documentos */}
      {isEditing && onDocumentUpload && (
        <div className="space-y-4 pt-6 border-t">
          {isLoading && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Procesando documento...</p>
                <p className="text-xs text-blue-700">Por favor espera mientras se sube y procesa el archivo</p>
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm font-semibold mb-3 block">Subir nuevo documento</Label>
            <div className="flex gap-2">
              <Select value={uploadType} onValueChange={setUploadType} disabled={isLoading}>
                <SelectTrigger className="flex-1 cursor-pointer">
                  <SelectValue placeholder="Seleccionar tipo de documento" />
                </SelectTrigger>
                <SelectContent >
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="cursor-pointer">
                      <div className="flex items-center gap-2 ">
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Label
                htmlFor="file-upload"
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  uploadType && !isLoading
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
          </div>
          
          {/* ✅ Warning especial para TAX_COMPLIANCE */}
          {uploadType === 'TAX_COMPLIANCE' && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Certificado Tributario
                  </p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Se actualizará automáticamente el registro de facturación del conductor</li>
                    {/* <li>• Se extraerá el RUC del documento para el sistema de facturación</li> */}
                    {/* <li>• Cualquier cambio en este documento afectará los datos de facturación</li> */}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            <strong>Formatos aceptados:</strong> JPG, PNG, PDF · <strong>Tamaño máximo:</strong> 5MB
          </p>
        </div>
      )}

      {/* ✅ Modal de acciones de documento */}
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

      {/* ✅ Modal de edición de tipo de documento */}
      <EditDocumentTypeModal
        open={showEditTypeModal}
        onOpenChange={setShowEditTypeModal}
        document={documentToEdit}
        onSuccess={() => {
          // Recargar la página para ver los cambios
          window.location.reload()
        }}
      />

      {/* ✅ Dialog de confirmación de eliminación */}
      <AlertDialog open={!!deleteDocumentId} onOpenChange={(open) => !open && setDeleteDocumentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El documento será eliminado permanentemente del sistema.
              {deleteDocumentId && documents.find(d => d.id === deleteDocumentId)?.documentType === 'TAX_COMPLIANCE' && (
                <span className="block mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm font-medium">
                  ⚠️ Advertencia: También se eliminará la referencia en el registro de facturación del conductor.
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
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}