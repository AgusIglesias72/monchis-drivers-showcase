// components/admin/template-form-dialog.tsx
"use client"

import { useState, useEffect } from "react"
import { WhatsAppTemplate } from "@prisma/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { createTemplate, updateTemplate } from "@/lib/actions/whatsapp-templates.actions"
import { toast } from "sonner"
import { Loader2, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TemplateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: WhatsAppTemplate
  onSuccess?: () => void
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "capacitacion", label: "Capacitación" },
  { value: "documentos", label: "Documentos" },
  { value: "pago", label: "Pago" },
]

export function TemplateFormDialog({ open, onOpenChange, template, onSuccess }: TemplateFormDialogProps) {
  const isEdit = !!template

  const [formData, setFormData] = useState({
    key: "",
    name: "",
    description: "",
    content: "",
    category: "general",
    order: 0,
    isActive: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (template) {
      setFormData({
        key: template.key,
        name: template.name,
        description: template.description || "",
        content: template.content,
        category: template.category || "general",
        order: template.order,
        isActive: template.isActive,
      })
    } else {
      setFormData({
        key: "",
        name: "",
        description: "",
        content: "",
        category: "general",
        order: 0,
        isActive: true,
      })
    }
  }, [template])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (isEdit && template) {
        const result = await updateTemplate(template.id, {
          name: formData.name,
          description: formData.description || undefined,
          content: formData.content,
          category: formData.category || undefined,
          order: formData.order,
          isActive: formData.isActive,
        })

        if (result.success) {
          toast.success("Plantilla actualizada correctamente")
          onSuccess?.()
          onOpenChange(false)
        } else {
          toast.error(result.error || "Error al actualizar plantilla")
        }
      } else {
        const result = await createTemplate({
          key: formData.key,
          name: formData.name,
          description: formData.description || undefined,
          content: formData.content,
          category: formData.category || undefined,
          order: formData.order,
        })

        if (result.success) {
          toast.success("Plantilla creada correctamente")
          onSuccess?.()
          onOpenChange(false)
        } else {
          toast.error(result.error || "Error al crear plantilla")
        }
      }
    } catch (error) {
      toast.error("Error inesperado")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Plantilla" : "Nueva Plantilla"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos de la plantilla de WhatsApp"
              : "Crea una nueva plantilla de mensaje rápido para WhatsApp"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Key (solo en crear) */}
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="key">
                Identificador único (key) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="capacitaciones"
                required
                pattern="[a-z0-9_-]+"
                title="Solo letras minúsculas, números, guiones y guiones bajos"
              />
              <p className="text-xs text-muted-foreground">
                Solo letras minúsculas, números, guiones y guiones bajos (ej: seguimiento_documentos)
              </p>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Info sobre Capacitaciones"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Información general sobre las capacitaciones disponibles"
            />
            <p className="text-xs text-muted-foreground">
              Ayuda al equipo a saber cuándo usar esta plantilla
            </p>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">
              Contenido del mensaje <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Hola {name}! 👋&#10;&#10;¿Cómo estás? Te escribo para..."
              required
              rows={8}
              className="font-mono text-sm"
            />
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Puedes usar <code className="bg-muted px-1 rounded">{"{name}"}</code> como placeholder que será reemplazado por el nombre del conductor
              </AlertDescription>
            </Alert>
          </div>

          {/* Category y Order */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Orden</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                Orden de aparición en la lista
              </p>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Plantilla activa</Label>
              <p className="text-xs text-muted-foreground">
                Las plantillas activas aparecen en la lista de mensajes rápidos
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Guardar Cambios" : "Crear Plantilla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
