// components/admin/comunicacion/braze/BrazeTriggersListContent.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Rocket, Edit, Trash2, PlayCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

interface BrazeTrigger {
  id: string
  title: string
  description: string | null
  triggerType: 'CAMPAIGN' | 'CANVAS'
  campaignId: string | null
  canvasId: string | null
  isActive: boolean
  tags: string[]
  createdAt: string
  _count: {
    executions: number
  }
  createdByUser: {
    fullName: string | null
    email: string
  }
}

export function BrazeTriggersListContent({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter()
  const [triggers, setTriggers] = useState<BrazeTrigger[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [triggerToDelete, setTriggerToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchTriggers()
  }, [])

  async function fetchTriggers() {
    try {
      const response = await fetch('/api/braze/triggers')
      const data = await response.json()

      if (data.success) {
        setTriggers(data.triggers)
      }
    } catch (error) {
      console.error('Error fetching triggers:', error)
    } finally {
      setLoading(false)
    }
  }

  function openDeleteDialog(id: string) {
    setTriggerToDelete(id)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!triggerToDelete) return

    setDeleteDialogOpen(false)
    setDeletingId(triggerToDelete)

    try {
      const response = await fetch(`/api/braze/triggers/${triggerToDelete}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setTriggers((prev) => prev.filter((t) => t.id !== triggerToDelete))
        toast.success('Disparador eliminado exitosamente')
      } else {
        toast.error(data.error || 'Error al eliminar el disparador')
      }
    } catch (error) {
      console.error('Error deleting trigger:', error)
      toast.error('Error al eliminar el disparador')
    } finally {
      setDeletingId(null)
      setTriggerToDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Disparadores</CardDescription>
            <CardTitle className="text-3xl">{triggers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Activos</CardDescription>
            <CardTitle className="text-3xl">
              {triggers.filter((t) => t.isActive).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Ejecuciones</CardDescription>
            <CardTitle className="text-3xl">
              {triggers.reduce((sum, t) => sum + t._count.executions, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Disparadores</CardTitle>
          <CardDescription>
            {triggers.length} disparador{triggers.length !== 1 ? 'es' : ''} configurado
            {triggers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {triggers.length === 0 ? (
            <div className="text-center py-12">
              <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No hay disparadores configurados aún
              </p>
              <Button asChild>
                <Link href="/admin/comunicaciones/braze/nuevo">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Disparador
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>ID Braze</TableHead>
                  <TableHead className="text-center">Ejecuciones</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {triggers.map((trigger) => (
                  <TableRow key={trigger.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{trigger.title}</div>
                        {trigger.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {trigger.description}
                          </div>
                        )}
                        {trigger.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {trigger.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={trigger.triggerType === 'CAMPAIGN' ? 'default' : 'secondary'}>
                        {trigger.triggerType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {trigger.campaignId || trigger.canvasId}
                      </code>
                    </TableCell>
                    <TableCell className="text-center">
                      {trigger._count.executions}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={trigger.isActive ? 'default' : 'secondary'}>
                        {trigger.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          asChild
                          disabled={!trigger.isActive}
                        >
                          <Link href={`/admin/comunicaciones/braze/triggers/${trigger.id}`}>
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Ejecutar
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteDialog(trigger.id)}
                          disabled={deletingId === trigger.id}
                        >
                          {deletingId === trigger.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
