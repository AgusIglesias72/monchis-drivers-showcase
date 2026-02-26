// components/postulacion/documents-section.tsx
'use client'

import { useState, useMemo } from 'react'
import { Upload, FileText, CheckCircle, XCircle, Clock, Filter } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DocumentWithStatus } from '@/lib/types/portal.types'
import type { FormDocumentsStatus } from '@prisma/client'
import { DocumentCard } from './document-card'
import { DocumentUploadDialog } from './document-upload-dialog'

const MONCHIS_RED = '#e7243f'

interface DocumentsSectionProps {
  token: string
  documents: DocumentWithStatus[]
  documentsStatus: FormDocumentsStatus
  onUpdate: () => void
}

type FilterType = 'ALL' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED'

export function DocumentsSection({
  token,
  documents,
  documentsStatus,
  onUpdate,
}: DocumentsSectionProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [filter, setFilter] = useState<FilterType>('ALL')

  // Calcular estadísticas
  const stats = useMemo(() => {
    const total = documents.length
    const approved = documents.filter((d) => d.status === 'APPROVED').length
    const rejected = documents.filter((d) => d.status === 'REJECTED').length
    const pending = documents.filter((d) => d.status === 'PENDING').length
    const inReview = documents.filter((d) => d.status === 'IN_REVIEW').length

    return { total, approved, rejected, pending, inReview }
  }, [documents])

  // Filtrar documentos
  const filteredDocuments = useMemo(() => {
    if (filter === 'ALL') return documents
    return documents.filter((d) => d.status === filter)
  }, [documents, filter])

  // Ordenar: REJECTED primero, luego por fecha
  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((a, b) => {
      // REJECTED primero
      if (a.status === 'REJECTED' && b.status !== 'REJECTED') return -1
      if (a.status !== 'REJECTED' && b.status === 'REJECTED') return 1

      // Luego por fecha (más reciente primero)
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    })
  }, [filteredDocuments])

  const getStatusMessage = () => {
    switch (documentsStatus) {
      case 'APPROVED':
        return {
          variant: 'default' as const,
          icon: <CheckCircle className="h-4 w-4" />,
          title: '¡Documentos aprobados!',
          message: 'Todos tus documentos han sido aprobados. Ya podés seleccionar tu fecha de capacitación.',
        }
      case 'IN_REVIEW':
        return {
          variant: 'default' as const,
          icon: <Clock className="h-4 w-4" />,
          title: 'Documentos en revisión',
          message: 'Nuestro equipo está revisando tus documentos. Te avisaremos cuando estén aprobados.',
        }
      case 'CORRECTIONS':
        return {
          variant: 'destructive' as const,
          icon: <XCircle className="h-4 w-4" />,
          title: 'Documentos requieren corrección',
          message:
            'Algunos documentos fueron rechazados. Revisá los motivos abajo y subí versiones corregidas.',
        }
      case 'PENDING':
        return {
          variant: 'default' as const,
          icon: <Clock className="h-4 w-4" />,
          title: 'Documentos pendientes',
          message: 'Subí todos los documentos requeridos para continuar con tu postulación.',
        }
      case 'INCOMPLETE':
      default:
        return {
          variant: 'default' as const,
          icon: <FileText className="h-4 w-4" />,
          title: 'Documentación en progreso',
          message: 'Continuá subiendo tus documentos.',
        }
    }
  }

  const statusMessage = getStatusMessage()

  const handleUploadSuccess = () => {
    onUpdate()
  }

  const handleDeleteSuccess = () => {
    onUpdate()
  }

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      <Alert variant={statusMessage.variant}>
        {statusMessage.icon}
        <AlertDescription>
          <strong>{statusMessage.title}</strong> {statusMessage.message}
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-600">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-gray-600">Aprobados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-gray-600">Rechazados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.inReview + stats.pending}</div>
            <p className="text-xs text-gray-600">En Proceso</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList>
              <TabsTrigger value="ALL">Todos ({stats.total})</TabsTrigger>
              <TabsTrigger value="REJECTED">Rechazados ({stats.rejected})</TabsTrigger>
              <TabsTrigger value="APPROVED">Aprobados ({stats.approved})</TabsTrigger>
              <TabsTrigger value="IN_REVIEW">En Revisión ({stats.inReview})</TabsTrigger>
              <TabsTrigger value="PENDING">Pendientes ({stats.pending})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Button
          onClick={() => setUploadDialogOpen(true)}
          style={{ backgroundColor: MONCHIS_RED }}
          className="hover:opacity-90 w-full sm:w-auto"
        >
          <Upload className="h-4 w-4 mr-2" />
          Subir Documento
        </Button>
      </div>

      {/* Documents Grid */}
      {sortedDocuments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'ALL' ? 'No hay documentos' : `No hay documentos ${filter.toLowerCase()}`}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {filter === 'ALL'
                ? 'Subí tus documentos para comenzar el proceso de postulación'
                : 'Probá cambiando el filtro para ver otros documentos'}
            </p>
            {filter === 'ALL' && (
              <Button
                onClick={() => setUploadDialogOpen(true)}
                style={{ backgroundColor: MONCHIS_RED }}
                className="hover:opacity-90"
              >
                <Upload className="h-4 w-4 mr-2" />
                Subir Primer Documento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sortedDocuments.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              token={token}
              onDelete={handleDeleteSuccess}
            />
          ))}
        </div>
      )}

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">💡 Información importante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Podés subir archivos en formato JPG, PNG o PDF (máximo 5MB)</li>
            <li>Los documentos rechazados pueden ser eliminados y reemplazados</li>
            <li>Una vez aprobados, los documentos no pueden ser modificados</li>
            <li>Nuestro equipo revisa los documentos en un plazo de 24-48 horas</li>
          </ul>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        token={token}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  )
}
