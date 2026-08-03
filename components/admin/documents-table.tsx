// components/admin/documents-table.tsx

"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ExternalLink,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  User,
  ChevronLeft,
  ChevronRight as ChevronRightIcon
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Document {
  id: string
  documentType: string
  status: string
  blobUrl: string | null
  confidenceScore?: number | null
  reviewedAt: Date | null
  rejectionReason: string | null
  updatedAt: Date
  formDriver: {
    id: string
    fullName: string | null
    cedula: string
    phoneNumber: string
    documentsStatus: string
  }
}

interface DocumentsTableProps {
  documents: Document[]
  totalPages: number
  currentPage: number
  totalDocuments: number
}

const statusLabels = {
  PENDING: "Pendiente",
  IN_REVIEW: "En Revisión",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
}

const statusColors = {
  PENDING: "bg-warning-soft text-warning",
  IN_REVIEW: "bg-info-soft text-info",
  APPROVED: "bg-success-soft text-success",
  REJECTED: "bg-danger-soft text-destructive",
}

const documentTypeLabels: Record<string, string> = {
  CEDULA: "Cédula",
  LICENSE_FRONT: "Licencia (Frente)",
  LICENSE_BACK: "Licencia (Dorso)",
  CRIMINAL_RECORD: "Antecedentes",
  VEHICLE_REGISTRATION: "Registro del Vehículo",
  VEHICLE_INSURANCE: "Seguro del Vehículo",
  VEHICLE_PHOTO_FRONT: "Foto Vehículo (Frente)",
  VEHICLE_PHOTO_BACK: "Foto Vehículo (Atrás)",
  VEHICLE_PHOTO_SIDE: "Foto Vehículo (Lateral)",
  SELFIE: "Selfie",
  OTHER: "Otro",
}

export function DocumentsTable({ documents, totalPages, currentPage, totalDocuments }: DocumentsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [openDrivers, setOpenDrivers] = useState<Set<string>>(new Set())

  // Agrupar documentos por driver
  const groupedByDriver = documents.reduce((acc, doc) => {
    const driverId = doc.formDriver.id
    if (!acc[driverId]) {
      acc[driverId] = {
        driver: doc.formDriver,
        documents: []
      }
    }
    acc[driverId].documents.push(doc)
    return acc
  }, {} as Record<string, { driver: Document['formDriver'], documents: Document[] }>)

  const drivers = Object.values(groupedByDriver)

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`?${params.toString()}`)
  }

  const toggleDriver = (driverId: string) => {
    setOpenDrivers(prev => {
      const next = new Set(prev)
      if (next.has(driverId)) {
        next.delete(driverId)
      } else {
        next.add(driverId)
      }
      return next
    })
  }

  const handleValidateDriver = async (driverId: string) => {
    setProcessingIds(prev => new Set(prev).add(driverId))
    
    try {
      const response = await fetch(`/api/admin/drivers/${driverId}/validate-documents`, {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (data.success) {
        window.location.reload()
      } else {
        alert('Error al procesar documentos: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al procesar documentos')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(driverId)
        return next
      })
    }
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">No hay documentos con este filtro</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Info header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>
          Mostrando {drivers.length === 0 ? 0 : ((currentPage - 1) * 20) + 1} - {Math.min(currentPage * 20, totalDocuments)} de {totalDocuments} documentos
        </p>
        <p>
          Página {currentPage} de {totalPages}
        </p>
      </div>

      {/* Drivers list */}
      <div className="space-y-2">
        {drivers.map(({ driver, documents: driverDocs }) => {
          const isOpen = openDrivers.has(driver.id)
          const isProcessing = processingIds.has(driver.id)
          const hasPending = driverDocs.some(d => d.status === 'PENDING')

          return (
            <Collapsible
              key={driver.id}
              open={isOpen}
              onOpenChange={() => toggleDriver(driver.id)}
            >
              <div className="rounded-lg border bg-card">
                {/* Header del Driver */}
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-2.5 hover:bg-accent cursor-pointer">
                    <div className="flex items-center gap-3">
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      )}

                      <div className="text-left">
                        <p className="font-medium text-sm">
                          {driver.fullName || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          CI: {driver.cedula} • Tel: {driver.phoneNumber}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Contador de documentos */}
                      <Badge variant="secondary" className="text-xs">
                        {driverDocs.length}
                      </Badge>

                      {/* Botones de acción rápida */}
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {hasPending && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleValidateDriver(driver.id)}
                            disabled={isProcessing}
                            className="cursor-pointer h-7 px-2 text-xs"
                            title="Validar documentos pendientes"
                          >
                            {isProcessing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" />
                                Validar
                              </>
                            )}
                          </Button>
                        )}

                        <Link href={`/admin/adquisicion/postulantes/${driver.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer h-7 px-2 text-xs"
                            title="Ver perfil completo"
                          >
                            <User className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                {/* Lista de documentos colapsable */}
                <CollapsibleContent>
                  <div className="border-t">
                    <div className="bg-muted/50 px-3 py-1.5 grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground">
                      <div className="col-span-4">Tipo</div>
                      <div className="col-span-2">Estado</div>
                      <div className="col-span-2">Score</div>
                      <div className="col-span-2">Actualizado</div>
                      <div className="col-span-2 text-right">Acciones</div>
                    </div>

                    {driverDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="px-3 py-2 grid grid-cols-12 gap-3 items-center hover:bg-accent/50 border-t border-border/50"
                      >
                        <div className="col-span-4 text-xs">
                          {documentTypeLabels[doc.documentType] || doc.documentType}
                        </div>

                        <div className="col-span-2">
                          <Badge className={cn("text-xs px-1.5 py-0", statusColors[doc.status as keyof typeof statusColors])}>
                            {statusLabels[doc.status as keyof typeof statusLabels] || doc.status}
                          </Badge>
                        </div>

                        <div className="col-span-2">
                          {doc.confidenceScore !== null && doc.confidenceScore !== undefined ? (
                            <span className={cn(
                              "text-xs font-medium",
                              doc.confidenceScore >= 85 ? "text-success" :
                              doc.confidenceScore >= 60 ? "text-warning" :
                              "text-destructive"
                            )}>
                              {doc.confidenceScore}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>

                        <div className="col-span-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(doc.updatedAt), {
                              addSuffix: true,
                              locale: es
                            })}
                          </span>
                        </div>

                        <div className="col-span-2 flex justify-end gap-1">
                          {/* Ver en Drive */}
                          {doc.blobUrl && (
                            <a
                              href={doc.blobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ver en Google Drive"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer h-6 w-6 p-0"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </a>
                          )}

                          {/* Aprobar/Rechazar (si está en IN_REVIEW) */}
                          {doc.status === 'IN_REVIEW' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer text-success hover:text-success h-6 w-6 p-0"
                                title="Aprobar documento"
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer text-destructive hover:text-destructive h-6 w-6 p-0"
                                title="Rechazar documento"
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 px-3 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Anterior
          </Button>

          <div className="flex items-center gap-1">
            {/* First page */}
            {currentPage > 2 && (
              <>
                <Button
                  variant={currentPage === 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  1
                </Button>
                {currentPage > 3 && <span className="text-muted-foreground">...</span>}
              </>
            )}

            {/* Current page and neighbors */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                return page >= currentPage - 1 && page <= currentPage + 1
              })
              .map(page => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {page}
                </Button>
              ))}

            {/* Last page */}
            {currentPage < totalPages - 1 && (
              <>
                {currentPage < totalPages - 2 && <span className="text-muted-foreground">...</span>}
                <Button
                  variant={currentPage === totalPages ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {totalPages}
                </Button>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 px-3 text-xs"
          >
            Siguiente
            <ChevronRightIcon className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}