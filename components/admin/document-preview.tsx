// components/admin/document-preview.tsx

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  Calendar,
  CheckCircle,
  AlertCircle,
  Trash2,
  Upload,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Document {
  front?: string
  back?: string
  file?: string
  files?: string[]
  uploadedAt: Date
}

interface DocumentPreviewProps {
  documents: {
    cedula?: Document
    licencia?: Document
    antecedentes?: Document
    vehicleRegistration?: Document
  }
  isEditing?: boolean
  onDocumentDelete?: (docType: string, fileIndex: number) => void
  onDocumentUpload?: (docType: string, files: FileList) => void
}

export function DocumentPreview({ 
  documents, 
  isEditing = false,
  onDocumentDelete,
  onDocumentUpload 
}: DocumentPreviewProps) {
  const [selectedDoc, setSelectedDoc] = useState<{ 
    title: string
    url: string 
    type: 'image' | 'pdf'
  } | null>(null)

  const docTypes = [
    { 
      key: 'cedula', 
      label: 'Cédula de Identidad',
      icon: <FileText className="h-4 w-4" />,
      hasBothSides: true
    },
    { 
      key: 'antecedentes', 
      label: 'Antecedentes Policiales',
      icon: <FileText className="h-4 w-4" />,
      hasBothSides: false
    },
  ]

  const openPreview = (title: string, url: string, type: 'image' | 'pdf') => {
    setSelectedDoc({ title, url, type })
  }

  const handleDownload = (url: string, filename: string) => {
    console.log('Descargando:', url, filename)
  }

  const handleDelete = (docType: string, fileIndex: number) => {
    if (onDocumentDelete) {
      onDocumentDelete(docType, fileIndex)
    }
  }

  const handleUpload = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onDocumentUpload) {
      onDocumentUpload(docType, e.target.files)
    }
  }

  const getDocumentFiles = (doc: Document | undefined) => {
    if (!doc) return []
    
    const files: Array<{ url: string, label: string }> = []
    
    if (doc.files && doc.files.length > 0) {
      doc.files.forEach((url, index) => {
        files.push({ url, label: `Archivo ${index + 1}` })
      })
    } else {
      if (doc.front) files.push({ url: doc.front, label: 'Frente' })
      if (doc.back) files.push({ url: doc.back, label: 'Dorso' })
      if (doc.file) files.push({ url: doc.file, label: 'Documento' })
    }
    
    return files
  }

  return (
    <>
      <div className="space-y-4">
        {docTypes.map((docType) => {
          const doc = documents[docType.key as keyof typeof documents]
          const files = getDocumentFiles(doc)
          
          if (!doc && !isEditing) {
            return (
              <div key={docType.key} className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-muted">
                    {docType.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{docType.label}</p>
                    <p className="text-xs text-muted-foreground">No subido</p>
                  </div>
                </div>
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Pendiente
                </Badge>
              </div>
            )
          }

          return (
            <div key={docType.key} className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-background">
                    {docType.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{docType.label}</p>
                    {doc && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Subido: {new Date(doc.uploadedAt).toLocaleDateString('es-PY')}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3" />
                  Subido
                </Badge>
              </div>

              <div className="p-4 space-y-3">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-md">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{file.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 cursor-pointer"
                        onClick={() => openPreview(
                          `${docType.label} - ${file.label}`,
                          file.url,
                          file.url.endsWith('.pdf') ? 'pdf' : 'image'
                        )}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 cursor-pointer"
                        onClick={() => handleDownload(file.url, `${docType.key}-${file.label}`)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Descargar
                      </Button>
                      {isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(docType.key, index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Botón para subir más archivos en modo edición */}
                {isEditing && (
                  <div className="pt-2">
                    <input
                      type="file"
                      id={`upload-${docType.key}`}
                      className="hidden"
                      accept="image/*,.pdf"
                      multiple
                      onChange={(e) => handleUpload(docType.key, e)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 cursor-pointer"
                      onClick={() => document.getElementById(`upload-${docType.key}`)?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      Subir {files.length > 0 ? 'más archivos' : 'archivos'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal de preview */}
      <Dialog open={selectedDoc !== null} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.title || 'Documento'}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 overflow-auto max-h-[70vh]">
            {selectedDoc?.type === 'image' ? (
              <img
                src={selectedDoc.url}
                alt={selectedDoc.title}
                className="w-full h-auto rounded-lg"
              />
            ) : selectedDoc?.type === 'pdf' ? (
              <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
                <div className="text-center space-y-3">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Vista previa de PDF no disponible
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => selectedDoc?.url && handleDownload(selectedDoc.url, 'documento')}
                    className="gap-2 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    Descargar PDF
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}