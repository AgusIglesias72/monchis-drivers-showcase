// components/admin/edit-document-type-modal.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, FileEdit } from "lucide-react"
import { toast } from "sonner"
import { updateDocumentType } from "@/lib/actions/postulacion.actions"

interface EditDocumentTypeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: any
  onSuccess?: () => void
}

// Todos los tipos de documento disponibles
const allDocumentTypes = [
  { value: 'CEDULA', label: 'Cédula' },
  { value: 'LICENSE_FRONT', label: 'Licencia (Frente)' },
  { value: 'LICENSE_BACK', label: 'Licencia (Dorso)' },
  { value: 'CRIMINAL_RECORD', label: 'Antecedentes Penales' },
  { value: 'VEHICLE_REGISTRATION', label: 'Registro del Vehículo' },
  { value: 'VEHICLE_INSURANCE', label: 'Seguro del Vehículo' },
  { value: 'VEHICLE_PHOTO_FRONT', label: 'Foto Vehículo (Frente)' },
  { value: 'VEHICLE_PHOTO_BACK', label: 'Foto Vehículo (Atrás)' },
  { value: 'VEHICLE_PHOTO_SIDE', label: 'Foto Vehículo (Lateral)' },
  { value: 'TAX_COMPLIANCE', label: 'Certificado Tributario' },
  { value: 'SELFIE', label: 'Selfie' },
  { value: 'OTHER', label: 'Otros' },
]

export function EditDocumentTypeModal({
  open,
  onOpenChange,
  document,
  onSuccess
}: EditDocumentTypeModalProps) {
  const [selectedType, setSelectedType] = useState(document?.documentType || '')
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (!document?.id || !selectedType) return

    if (selectedType === document.documentType) {
      toast.info('No hay cambios que guardar')
      onOpenChange(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await updateDocumentType(document.id, selectedType)

      if (result.success) {
        toast.success('Tipo de documento actualizado correctamente')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Error al actualizar el tipo de documento')
      }
    } catch (error: any) {
      console.error('Error al actualizar tipo:', error)
      toast.error('Error al actualizar el tipo de documento')
    } finally {
      setIsLoading(false)
    }
  }

  const currentTypeLabel = allDocumentTypes.find(t => t.value === document?.documentType)?.label || document?.documentType

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Modificar Tipo de Documento
          </DialogTitle>
          <DialogDescription>
            Cambia el tipo de documento si fue cargado incorrectamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo actual</Label>
            <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
              {currentTypeLabel}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentType" className="text-sm font-medium">
              Nuevo tipo
            </Label>
            <Select
              value={selectedType}
              onValueChange={setSelectedType}
              disabled={isLoading}
            >
              <SelectTrigger id="documentType" className="cursor-pointer">
                <SelectValue placeholder="Seleccionar nuevo tipo" />
              </SelectTrigger>
              <SelectContent>
                {allDocumentTypes.map((type) => (
                  <SelectItem
                    key={type.value}
                    value={type.value}
                    className="cursor-pointer"
                  >
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-info-soft border border-info rounded-md p-3">
            <p className="text-xs text-info">
              <strong>Nota:</strong> Esta acción actualizará el tipo del documento pero no modificará el archivo original.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !selectedType || selectedType === document?.documentType}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
