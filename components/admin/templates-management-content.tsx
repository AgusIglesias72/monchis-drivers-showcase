// components/admin/templates-management-content.tsx
"use client"

import { useState } from "react"
import { WhatsAppTemplate } from "@prisma/client"
import { AdminHeader } from "@/components/admin/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, MessageSquare, TrendingUp, Eye } from "lucide-react"
import { TemplatesTable } from "./templates-table"
import { TemplateFormDialog } from "./template-form-dialog"
import { TemplatePreviewDialog } from "./template-preview-dialog"

interface ExtendedTemplate extends WhatsAppTemplate {
  createdByUser?: { firstName: string | null; fullName: string | null } | null
  updatedByUser?: { firstName: string | null; fullName: string | null } | null
}

interface TemplatesManagementContentProps {
  initialTemplates: ExtendedTemplate[]
}

export function TemplatesManagementContent({ initialTemplates }: TemplatesManagementContentProps) {
  const [templates, setTemplates] = useState<ExtendedTemplate[]>(initialTemplates)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [templateToEdit, setTemplateToEdit] = useState<ExtendedTemplate | null>(null)
  const [templateToPreview, setTemplateToPreview] = useState<ExtendedTemplate | null>(null)

  const activeTemplates = templates.filter(t => t.isActive)
  const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0)
  const mostUsedTemplate = templates.reduce((max, t) => t.usageCount > max.usageCount ? t : max, templates[0])

  const handleRefresh = async () => {
    // Recargar plantillas desde el servidor
    window.location.reload()
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <AdminHeader
        title="Plantillas de WhatsApp"
        description="Gestiona los mensajes rápidos para el equipo de ejecución"
        action={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Plantilla
          </Button>
        }
      />

      <div className="flex-1 space-y-6 p-6">

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plantillas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeTemplates.length} activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              Mensajes enviados con plantillas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Más Utilizada</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{mostUsedTemplate?.name || '-'}</div>
            <p className="text-xs text-muted-foreground">
              {mostUsedTemplate?.usageCount || 0} usos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Todas las Plantillas</CardTitle>
          <CardDescription>
            Crea, edita y gestiona las plantillas de mensajes rápidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplatesTable
            templates={templates}
            onEdit={(template) => setTemplateToEdit(template)}
            onPreview={(template) => setTemplateToPreview(template)}
            onRefresh={handleRefresh}
          />
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <TemplateFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleRefresh}
      />

      {/* Edit Dialog */}
      <TemplateFormDialog
        open={!!templateToEdit}
        onOpenChange={(open) => !open && setTemplateToEdit(null)}
        template={templateToEdit || undefined}
        onSuccess={handleRefresh}
      />

      {/* Preview Dialog */}
      <TemplatePreviewDialog
        open={!!templateToPreview}
        onOpenChange={(open) => !open && setTemplateToPreview(null)}
        template={templateToPreview || undefined}
      />
      </div>
    </div>
  )
}
