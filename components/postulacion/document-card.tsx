// components/postulacion/document-card.tsx
'use client'

import { useState } from 'react'
import { FileText, Trash2, ExternalLink, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import type { DocumentWithStatus } from '@/lib/types/portal.types'

const MONCHIS_RED = '#e7243f'

interface DocumentCardProps {
  document: DocumentWithStatus
  token: string
  onDelete: () => void
}

export function DocumentCard({ document, token, onDelete }: DocumentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/postulacion/${token}/documents/${document.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar documento')
      }

      toast.success('Documento eliminado correctamente')
      onDelete()
    } catch (err: any) {
      console.error('Error deleting document:', err)
      toast.error(err.message || 'No se pudo eliminar el documento')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const getStatusIcon = () => {
    switch (document.status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'REJECTED':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'IN_REVIEW':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-gray-600" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusColor = () => {
    switch (document.status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'IN_REVIEW':
        return 'bg-blue-100 text-blue-800'
      case 'PENDING':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = () => {
    switch (document.status) {
      case 'APPROVED':
        return 'Aprobado'
      case 'REJECTED':
        return 'Rechazado'
      case 'IN_REVIEW':
        return 'En Revisión'
      case 'PENDING':
        return 'Pendiente'
      default:
        return document.status
    }
  }

  return (
    <>
      <Card className={document.status === 'REJECTED' ? 'border-red-300' : ''}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-1">{getStatusIcon()}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{document.documentTypeName}</h3>
                <p className="text-xs text-gray-500 truncate mt-0.5">{document.fileName}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getStatusColor()}>{getStatusText()}</Badge>
                  <span className="text-xs text-gray-400">
                    {new Date(document.uploadedAt).toLocaleDateString('es-PY')}
                  </span>
                </div>
                {document.status === 'REJECTED' && document.rejectionReason && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
                    <p className="text-red-800">
                      <strong>Motivo:</strong> {document.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(document.blobUrl, '_blank')}
                className="h-8 w-8 p-0"
                title="Ver documento"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              {document.canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDeleting}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Eliminar documento"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el documento <strong>{document.documentTypeName}</strong>. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
