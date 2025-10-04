// components/admin/documents-table.tsx

"use client"

import { useState } from "react"
import Link from "next/link"
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
  User
} from "lucide-react"
import { cn } from "@/lib/utils/utils"

interface Document {
  id: string
  type: string
  status: string
  driveUrl: string | null
  confidenceScore: number | null
  validatedAt: Date | null
  rejectionReason: string | null
  updatedAt: Date
  driver: {
    id: string
    fullName: string | null
    cedula: string
    phoneNumber: string
    documentStatus: string
  }
}

interface DocumentsTableProps {
  documents: Document[]
}

const statusLabels = {
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  MANUAL_REVIEW: "Revisión Manual",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  ERROR: "Error",
}

const statusColors = {
  PENDING: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  MANUAL_REVIEW: "bg-orange-100 text-orange-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ERROR: "bg-gray-100 text-gray-700",
}

const documentTypeLabels: Record<string, string> = {
  CEDULA_FRONT: "Cédula (Frente)",
  CEDULA_BACK: "Cédula (Dorso)",
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

export function DocumentsTable({ documents }: DocumentsTableProps) {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [openDrivers, setOpenDrivers] = useState<Set<string>>(new Set())

  // Agrupar documentos por driver
  const groupedByDriver = documents.reduce((acc, doc) => {
    const driverId = doc.driver.id
    if (!acc[driverId]) {
      acc[driverId] = {
        driver: doc.driver,
        documents: []
      }
    }
    acc[driverId].documents.push(doc)
    return acc
  }, {} as Record<string, { driver: Document['driver'], documents: Document[] }>)

  const drivers = Object.values(groupedByDriver)

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
                <div className="flex items-center justify-between p-4 hover:bg-accent cursor-pointer">
                  <div className="flex items-center gap-4">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    
                    <div className="text-left">
                      <p className="font-medium">
                        {driver.fullName || 'Sin nombre'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        CI: {driver.cedula} • Tel: {driver.phoneNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Contador de documentos */}
                    <Badge variant="secondary">
                      {driverDocs.length} {driverDocs.length === 1 ? 'documento' : 'documentos'}
                    </Badge>

                    {/* Botones de acción rápida */}
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {hasPending && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleValidateDriver(driver.id)}
                          disabled={isProcessing}
                          className="cursor-pointer"
                          title="Validar documentos pendientes"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Validar
                            </>
                          )}
                        </Button>
                      )}
                      
                      <Link href={`/admin/adquisicion/postulantes/${driver.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          title="Ver perfil completo"
                        >
                          <User className="h-4 w-4 mr-1" />
                          Ver Perfil
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>

              {/* Lista de documentos colapsable */}
              <CollapsibleContent>
                <div className="border-t">
                  <div className="bg-muted/50 px-4 py-2 grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground">
                    <div className="col-span-4">Tipo de Documento</div>
                    <div className="col-span-2">Estado</div>
                    <div className="col-span-2">Score</div>
                    <div className="col-span-2">Actualizado</div>
                    <div className="col-span-2 text-right">Acciones</div>
                  </div>
                  
                  {driverDocs.map((doc) => (
                    <div 
                      key={doc.id}
                      className="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-accent/50 border-t border-border/50"
                    >
                      <div className="col-span-4 text-sm">
                        {documentTypeLabels[doc.type] || doc.type}
                      </div>
                      
                      <div className="col-span-2">
                        <Badge className={cn("text-xs", statusColors[doc.status as keyof typeof statusColors])}>
                          {statusLabels[doc.status as keyof typeof statusLabels] || doc.status}
                        </Badge>
                      </div>
                      
                      <div className="col-span-2">
                        {doc.confidenceScore !== null ? (
                          <span className={cn(
                            "text-sm font-medium",
                            doc.confidenceScore >= 85 ? "text-green-600" :
                            doc.confidenceScore >= 60 ? "text-orange-600" :
                            "text-red-600"
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
                        {doc.driveUrl && (
                          <a 
                            href={doc.driveUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            title="Ver en Google Drive"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer h-8 w-8 p-0"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        
                        {/* Aprobar/Rechazar (si está en MANUAL_REVIEW) */}
                        {doc.status === 'MANUAL_REVIEW' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer text-green-600 hover:text-green-700 h-8 w-8 p-0"
                              title="Aprobar documento"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer text-red-600 hover:text-red-700 h-8 w-8 p-0"
                              title="Rechazar documento"
                            >
                              <XCircle className="h-4 w-4" />
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
  ) 
}