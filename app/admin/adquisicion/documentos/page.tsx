// app/admin/adquisicion/documentos/page.tsx

import { documentsService } from "@/lib/services/documents.service"
import { DocumentsTable } from "@/components/admin/documents-table"
import { DocumentsFilters } from "@/components/admin/documents-filter"
import { FormDocumentStatus } from "@prisma/client"

export const revalidate = 10 // Revalidar cada 10 segundos

interface PageProps {
  searchParams: {
    status?: string
  }
}

// Función para validar que el status sea un FormDocumentStatus válido
function isValidDocumentStatus(status: string | undefined): FormDocumentStatus | undefined {
  if (!status) return undefined
  
  const validStatuses: FormDocumentStatus[] = ['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED']
  return validStatuses.includes(status as FormDocumentStatus) ? status as FormDocumentStatus : undefined
}

export default async function DocumentosPage({ searchParams }: PageProps) {
  const status = searchParams.status
  const validStatus = isValidDocumentStatus(status)

  const [documents, counts] = await Promise.all([
    documentsService.getDocuments({ status: validStatus }),
    documentsService.getDocumentCountsByStatus()
  ])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
        <p className="text-muted-foreground">
          Gestión y revisión de documentos de postulantes
        </p>
      </div>

      {/* Filtros */}
      <DocumentsFilters counts={counts} currentStatus={status} />

      {/* Tabla de documentos */}
      <DocumentsTable documents={documents} />
    </div>
  )
}