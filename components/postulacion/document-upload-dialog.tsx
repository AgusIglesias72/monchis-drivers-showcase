// components/postulacion/document-upload-dialog.tsx
'use client'

import { useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { DOCUMENT_TYPE_NAMES } from '@/lib/types/portal.types'
import type { DocumentType } from '@prisma/client'

const MONCHIS_RED = '#e7243f'

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  onUploadSuccess: () => void
  preselectedType?: DocumentType
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  token,
  onUploadSuccess,
  preselectedType,
}: DocumentUploadDialogProps) {
  const [documentType, setDocumentType] = useState<DocumentType | ''>(preselectedType || '')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const validateAndSetFile = (file: File) => {
    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten archivos JPG, PNG o PDF')
      return
    }

    // Validar tamaño (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('El archivo no puede superar los 5MB')
      return
    }

    setSelectedFile(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const handleUpload = async () => {
    if (!documentType || !selectedFile) {
      toast.error('Seleccioná un tipo de documento y un archivo')
      return
    }

    try {
      setIsUploading(true)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('documentType', documentType)

      const response = await fetch(`/api/postulacion/${token}/documents`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al subir documento')
      }

      toast.success('Documento subido correctamente. Será revisado por nuestro equipo.')
      onUploadSuccess()
      handleClose()
    } catch (err: any) {
      console.error('Error uploading document:', err)
      toast.error(err.message || 'No se pudo subir el documento')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      setDocumentType(preselectedType || '')
      setSelectedFile(null)
      setDragActive(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subir Documento</DialogTitle>
          <DialogDescription>
            {preselectedType
              ? `Subí el archivo (JPG, PNG o PDF, máx. 5MB)`
              : `Seleccioná el tipo de documento y subí el archivo (JPG, PNG o PDF, máx. 5MB)`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selector de tipo de documento (solo si no hay tipo preseleccionado) */}
          {!preselectedType && (
            <div className="space-y-2">
              <Label htmlFor="documentType">Tipo de documento</Label>
              <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
                <SelectTrigger id="documentType">
                  <SelectValue placeholder="Seleccioná el tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPE_NAMES).map(([type, name]) => (
                    <SelectItem key={type} value={type}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Drag & drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
              dragActive ? 'border-[#e7243f] bg-red-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2 text-center">
                {selectedFile ? (
                  <>
                    <FileText className="h-10 w-10" style={{ color: MONCHIS_RED }} />
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.preventDefault()
                          setSelectedFile(null)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">
                      Arrastrá tu archivo o hacé click para seleccionar
                    </p>
                    <p className="text-xs text-gray-500">JPG, PNG o PDF (máx. 5MB)</p>
                  </>
                )}
              </div>
            </label>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!documentType || !selectedFile || isUploading}
            style={{ backgroundColor: MONCHIS_RED }}
            className="hover:opacity-90"
          >
            {isUploading ? 'Subiendo...' : 'Subir Documento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
