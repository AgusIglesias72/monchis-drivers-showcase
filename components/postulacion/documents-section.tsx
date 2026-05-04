// components/postulacion/documents-section.tsx
'use client'

import { useState, useRef } from 'react'
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  ShieldCheck,
  Receipt,
  Eye,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { toast } from 'sonner'
import type { DocumentWithStatus } from '@/lib/types/portal.types'
import type { FormDocumentsStatus, DocumentType } from '@prisma/client'
import { DocumentUploadDialog } from './document-upload-dialog'

const MONCHIS_RED = '#e7243f'

interface DocumentsSectionProps {
  token: string
  documents: DocumentWithStatus[]
  documentsStatus: FormDocumentsStatus
  onUpdate: () => void
}

interface DocSectionDef {
  key: string
  title: string
  icon: typeof CreditCard
  types: DocumentType[]
  description: string
  /** Si true, el postulante puede subir N imágenes para la sección (caso típico: cédula
   *  frente + dorso, o varias fotos). Si false, solo 1 (criminal record, tributario). */
  allowMultiple?: boolean
}

const DOC_SECTIONS: DocSectionDef[] = [
  {
    key: 'cedula',
    title: 'Cédula de Identidad',
    icon: CreditCard,
    types: ['CEDULA'],
    description: 'Foto de tu cédula de identidad (podés subir una o más imágenes)',
    allowMultiple: true,
  },
  {
    key: 'antecedentes',
    title: 'Cert. Antecedentes Policiales',
    icon: ShieldCheck,
    types: ['CRIMINAL_RECORD'],
    description: 'Certificado de antecedentes policiales',
  },
  {
    key: 'tributario',
    title: 'Certificado Tributario',
    icon: Receipt,
    types: ['TAX_COMPLIANCE'],
    description: 'Certificado de cumplimiento tributario (RUC)',
  },
]

type SectionStatus = 'approved' | 'review' | 'rejected' | 'none'

function getSectionStatus(docs: DocumentWithStatus[], requiredTypes: DocumentType[]): SectionStatus {
  const relevantDocs = docs.filter((d) => requiredTypes.includes(d.documentType))

  if (relevantDocs.length === 0) return 'none'

  // Si al menos uno está aprobado, la sección está aprobada
  if (relevantDocs.some((d) => d.status === 'APPROVED')) return 'approved'

  if (relevantDocs.some((d) => d.status === 'REJECTED')) return 'rejected'

  if (relevantDocs.some((d) => d.status === 'IN_REVIEW' || d.status === 'PENDING' || d.status === 'RESUBMITTED'))
    return 'review'

  return 'none'
}

const STATUS_CONFIG: Record<SectionStatus, { borderColor: string; bg: string; badge: string; badgeText: string }> = {
  approved: {
    borderColor: 'border-l-green-500',
    bg: 'bg-green-50/50',
    badge: 'bg-green-100 text-green-800',
    badgeText: 'Aprobado',
  },
  review: {
    borderColor: 'border-l-yellow-500',
    bg: 'bg-yellow-50/50',
    badge: 'bg-yellow-100 text-yellow-800',
    badgeText: 'En Revisión',
  },
  rejected: {
    borderColor: 'border-l-red-500',
    bg: 'bg-red-50/50',
    badge: 'bg-red-100 text-red-800',
    badgeText: 'Requiere Corrección',
  },
  none: {
    borderColor: 'border-l-gray-300',
    bg: 'bg-gray-50/50',
    badge: 'bg-gray-100 text-gray-600',
    badgeText: 'Pendiente',
  },
}

export function DocumentsSection({
  token,
  documents,
  documentsStatus,
  onUpdate,
}: DocumentsSectionProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingDocType = useRef<DocumentType | null>(null)

  // Direct file upload (no dialog) for section-specific buttons
  const handleDirectUpload = (docType: DocumentType) => {
    pendingDocType.current = docType
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const docType = pendingDocType.current
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file || !docType) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten archivos JPG, PNG o PDF')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 5MB')
      return
    }

    try {
      setUploadingType(docType)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', docType)

      const response = await fetch(`/api/postulacion/${token}/documents`, {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al subir documento')
      }

      toast.success('Documento subido correctamente')
      onUpdate()
    } catch (err: any) {
      toast.error(err.message || 'No se pudo subir el documento')
    } finally {
      setUploadingType(null)
      pendingDocType.current = null
    }
  }

  const handleDelete = async (docId: string) => {
    try {
      setDeletingId(docId)
      const response = await fetch(`/api/postulacion/${token}/documents/${docId}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar documento')
      }

      toast.success('Documento eliminado')
      onUpdate()
    } catch (err: any) {
      toast.error(err.message || 'No se pudo eliminar el documento')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Hidden file input for direct uploads */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/jpg,application/pdf"
        onChange={handleFileSelected}
      />

      <p className="text-sm text-gray-500">
        Subí los documentos requeridos. Nuestro equipo los revisará en 24-48 horas.
        Si te rechazan un documento, podés subir otro nuevamente para que lo revisemos.
      </p>

      <Accordion type="single" collapsible className="w-full space-y-2">
        {DOC_SECTIONS.map((section) => {
          const sectionDocs = documents.filter((d) => section.types.includes(d.documentType))
          const status = getSectionStatus(documents, section.types)
          const config = STATUS_CONFIG[status]
          const Icon = section.icon

          return (
            <AccordionItem
              key={section.key}
              value={section.key}
              className={`border-l-4 rounded-2xl border ${config.borderColor} ${config.bg} overflow-hidden border-r-0 border-t-0 border-b-0`}
            >
              <AccordionTrigger className="hover:no-underline px-4 py-3">
                <div className="flex items-center justify-between w-full mr-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white shadow-sm">
                      <Icon className="w-4 h-4 text-gray-700" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-800 text-sm">{section.title}</h3>
                      <p className="text-xs text-gray-500">{section.description}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${config.badge}`}>
                    {config.badgeText}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4">
                {/* Uploaded documents */}
                {sectionDocs.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {sectionDocs.map((doc) => (
                      <DocRow
                        key={doc.id}
                        doc={doc}
                        onDelete={() => handleDelete(doc.id)}
                        isDeleting={deletingId === doc.id}
                      />
                    ))}
                  </div>
                )}

                {/* Upload buttons per type — direct file picker.
                    Para secciones allowMultiple (cédula): mientras no esté aprobada, el
                    postulante puede agregar más imágenes (ej. frente, dorso, foto extra).
                    Para single (criminal_record, tributario): solo si no hay subida o si
                    la actual está rechazada. */}
                <div className="flex flex-wrap gap-2 mt-1">
                  {section.types.map((type) => {
                    const docsOfType = sectionDocs.filter((d) => d.documentType === type)
                    const hasDoc = docsOfType.length > 0
                    const isApproved = docsOfType.some((d) => d.status === 'APPROVED')
                    const rejectedDoc = docsOfType.find((d) => d.status === 'REJECTED')
                    const isUploading = uploadingType === type
                    const typeLabel = section.title

                    let label: string | null = null
                    if (section.allowMultiple) {
                      // Mientras no esté aprobada, el postulante puede seguir agregando.
                      if (!isApproved) {
                        label = hasDoc ? `Subir otra imagen` : `Subir ${typeLabel}`
                      }
                    } else if (!hasDoc) {
                      label = `Subir ${typeLabel}`
                    } else if (rejectedDoc) {
                      label = `Resubir ${typeLabel}`
                    }

                    if (!label) return null

                    return (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={isUploading}
                        onClick={() => handleDirectUpload(type)}
                      >
                        {isUploading ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {isUploading ? 'Subiendo...' : label}
                      </Button>
                    )
                  })}
                </div>

                {sectionDocs.length === 0 && (
                  <p className="text-xs text-gray-400 mt-2">No hay documentos subidos aún.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* General upload button (opens dialog with type selector) */}
      <div className="pt-2">
        <Button
          onClick={() => setUploadDialogOpen(true)}
          className="w-full hover:opacity-90 text-white"
          style={{ backgroundColor: MONCHIS_RED }}
        >
          <Upload className="h-4 w-4 mr-2" />
          Subir Otro Documento
        </Button>
      </div>

      {/* Info */}
      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
        <p>• Formatos aceptados: JPG, PNG o PDF (máx. 5MB)</p>
        <p>• Si te rechazan un documento, podés subir otro para que lo revisemos nuevamente</p>
        <p>• Una vez aprobados, los documentos no pueden ser modificados</p>
      </div>

      {/* Upload Dialog — only for "Subir Otro Documento" */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        token={token}
        onUploadSuccess={onUpdate}
      />
    </div>
  )
}

// Individual document row
function DocRow({
  doc,
  onDelete,
  isDeleting,
}: {
  doc: DocumentWithStatus
  onDelete: () => void
  isDeleting: boolean
}) {
  const statusIcon = {
    APPROVED: <CheckCircle className="w-4 h-4 text-green-600" />,
    REJECTED: <XCircle className="w-4 h-4 text-red-600" />,
    IN_REVIEW: <Clock className="w-4 h-4 text-yellow-600" />,
    PENDING: <Clock className="w-4 h-4 text-gray-400" />,
    RESUBMITTED: <Clock className="w-4 h-4 text-blue-500" />,
  }

  return (
    <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm">
      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700 truncate">{doc.documentTypeName}</p>
        <p className="text-xs text-gray-400 truncate">{doc.fileName}</p>
        {doc.status === 'REJECTED' && doc.rejectionReason && (
          <div className="flex items-start gap-1 mt-1">
            <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">{doc.rejectionReason}</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {statusIcon[doc.status] || statusIcon.PENDING}
        {doc.blobUrl && (
          <a href={doc.blobUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
            <Eye className="w-4 h-4" />
          </a>
        )}
        {doc.canDelete && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="text-gray-400 hover:text-red-500 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
