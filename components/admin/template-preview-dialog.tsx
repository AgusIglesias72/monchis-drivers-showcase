// components/admin/template-preview-dialog.tsx
"use client"

import { useState } from "react"
import { WhatsAppTemplate } from "@prisma/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { replaceTemplatePlaceholders } from "@/lib/services/whatsapp-templates.service"
import { MessageSquare, User, Hash, Calendar, TrendingUp } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface TemplatePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: WhatsAppTemplate
}

export function TemplatePreviewDialog({ open, onOpenChange, template }: TemplatePreviewDialogProps) {
  const [previewName, setPreviewName] = useState("Juan")

  if (!template) return null

  const previewMessage = replaceTemplatePlaceholders(template.content, {
    name: previewName || "Juan",
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Preview de Plantilla
          </DialogTitle>
          <DialogDescription>
            Vista previa de cómo se verá el mensaje con los placeholders reemplazados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información de la Plantilla</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nombre</Label>
                  <p className="font-medium">{template.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Key</Label>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {template.key}
                  </code>
                </div>
              </div>

              {template.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descripción</Label>
                  <p className="text-sm">{template.description}</p>
                </div>
              )}

              <div className="flex items-center gap-4">
                {template.category && (
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="secondary" className="capitalize">
                      {template.category}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{template.usageCount} usos</span>
                </div>
                {template.lastUsedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Último uso: {formatDistanceToNow(new Date(template.lastUsedAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Badge variant={template.isActive ? "default" : "secondary"}>
                  {template.isActive ? "Activa" : "Inactiva"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Preview Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos de Prueba</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="previewName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nombre del conductor
                </Label>
                <Input
                  id="previewName"
                  value={previewName}
                  onChange={(e) => setPreviewName(e.target.value)}
                  placeholder="Juan"
                />
                <p className="text-xs text-muted-foreground">
                  Este valor reemplazará el placeholder <code className="bg-muted px-1 rounded">{"{name}"}</code> en el mensaje
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview Message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vista Previa del Mensaje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* WhatsApp-style bubble */}
                <div className="bg-[#E7FFDB] rounded-lg p-4 shadow-sm border border-green-100">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                    {previewMessage}
                  </pre>
                  <div className="mt-2 flex items-center justify-end gap-1 text-xs text-gray-500">
                    <span>{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Original Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contenido Original (con placeholders)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap font-mono text-xs bg-muted p-4 rounded-lg">
                {template.content}
              </pre>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
