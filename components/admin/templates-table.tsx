// components/admin/templates-table.tsx
"use client"

import { useState } from "react"
import { WhatsAppTemplate } from "@prisma/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MoreVertical,
  Edit,
  Eye,
  Copy,
  Trash2,
  TrendingUp,
  Clock
} from "lucide-react"
import { deleteTemplate, duplicateTemplate } from "@/lib/actions/whatsapp-templates.actions"
import { toast } from "sonner"
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
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface ExtendedTemplate extends WhatsAppTemplate {
  createdByUser?: { firstName: string | null; fullName: string | null } | null
  updatedByUser?: { firstName: string | null; fullName: string | null } | null
}

interface TemplatesTableProps {
  templates: ExtendedTemplate[]
  onEdit: (template: ExtendedTemplate) => void
  onPreview: (template: ExtendedTemplate) => void
  onRefresh: () => void
}

export function TemplatesTable({ templates, onEdit, onPreview, onRefresh }: TemplatesTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const result = await deleteTemplate(id)
    setDeletingId(null)
    setShowDeleteDialog(false)

    if (result.success) {
      toast.success('Plantilla desactivada correctamente')
      onRefresh()
    } else {
      toast.error(result.error || 'Error al desactivar plantilla')
    }
  }

  const handleDuplicate = async (id: string) => {
    setDuplicatingId(id)
    const result = await duplicateTemplate(id)
    setDuplicatingId(null)

    if (result.success) {
      toast.success('Plantilla duplicada correctamente')
      onRefresh()
    } else {
      toast.error(result.error || 'Error al duplicar plantilla')
    }
  }

  const getCategoryBadgeColor = (category: string | null) => {
    if (!category) return "secondary"
    const colors: Record<string, string> = {
      capacitacion: "blue",
      documentos: "yellow",
      pago: "green",
      general: "gray",
    }
    return colors[category] || "secondary"
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Usos</TableHead>
              <TableHead>Último Uso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay plantillas creadas
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {template.key}
                    </code>
                  </TableCell>
                  <TableCell>
                    {template.category ? (
                      <Badge variant="secondary" className="capitalize">
                        {template.category}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.isActive ? "default" : "secondary"}>
                      {template.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{template.usageCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {template.lastUsedAt ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(template.lastUsedAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Nunca</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onPreview(template)}
                          className="cursor-pointer"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onEdit(template)}
                          className="cursor-pointer"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicate(template.id)}
                          disabled={duplicatingId === template.id}
                          className="cursor-pointer"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {duplicatingId === template.id ? 'Duplicando...' : 'Duplicar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setDeletingId(template.id)
                            setShowDeleteDialog(true)
                          }}
                          className="cursor-pointer text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Desactivar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta plantilla se marcará como inactiva y no aparecerá en la lista de mensajes rápidos.
              Podrás reactivarla más tarde si lo necesitas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
