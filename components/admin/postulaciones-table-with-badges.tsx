// components/admin/postulaciones-table-with-badges.tsx

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Eye, 
  Phone, 
  Mail,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PostulacionBadgesCompact } from "./postulacion-badges-list"
import { PostulacionWithBadges } from "@/lib/services/postulaciones-with-badges.service"
import { cn } from "@/lib/utils"

interface PostulacionesTableWithBadgesProps {
  postulaciones: PostulacionWithBadges[]
}

export function PostulacionesTableWithBadges({ 
  postulaciones 
}: PostulacionesTableWithBadgesProps) {
  const router = useRouter()
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Paginación local
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPostulaciones = postulaciones.slice(startIndex, endIndex)
  const totalPages = Math.ceil(postulaciones.length / itemsPerPage)

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      'COMPLETED': { variant: 'default', label: 'Completada' },
      'IN_PROGRESS': { variant: 'secondary', label: 'En Proceso' },
      'ABANDONED': { variant: 'outline', label: 'Abandonada' }
    }
    const config = variants[status] || { variant: 'outline', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-semibold text-sm w-8"></th>
                <th className="text-left p-4 font-semibold text-sm">Postulante</th>
                <th className="text-left p-4 font-semibold text-sm">Contacto</th>
                <th className="text-left p-4 font-semibold text-sm">Ciudad</th>
                <th className="text-left p-4 font-semibold text-sm">Postulación</th>
                <th className="text-left p-4 font-semibold text-sm">Estados</th>
                <th className="text-left p-4 font-semibold text-sm">Fecha</th>
                <th className="text-left p-4 font-semibold text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPostulaciones.map((postulacion) => (
                <>
                  <tr 
                    key={postulacion.id}
                    className={cn(
                      "border-b hover:bg-muted/50 transition-colors cursor-pointer",
                      expandedRow === postulacion.id && "bg-muted/30"
                    )}
                    onClick={() => toggleRow(postulacion.id)}
                  >
                    {/* Toggle */}
                    <td className="p-4">
                      {expandedRow === postulacion.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>

                    {/* Postulante */}
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{postulacion.fullName || `${postulacion.firstName} ${postulacion.lastName}`}</span>
                        <span className="text-sm text-muted-foreground">CI: {postulacion.cedula}</span>
                      </div>
                    </td>

                    {/* Contacto */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{postulacion.phoneNumber}</span>
                        </div>
                        {postulacion.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[200px]">{postulacion.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Ciudad */}
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{postulacion.city || 'No especificado'}</span>
                        <span className="text-sm text-muted-foreground">{postulacion.department || ''}</span>
                      </div>
                    </td>

                    {/* Estado de Postulación (antes "Estado") */}
                    <td className="p-4">
                      {getStatusBadge(postulacion.status)}
                    </td>

                    {/* NUEVA COLUMNA: Estados (Badges) */}
                    <td className="p-4">
                      <PostulacionBadgesCompact postulacion={postulacion} />
                    </td>

                    {/* Fecha */}
                    <td className="p-4">
                      <div className="flex flex-col text-sm">
                        <span>{new Date(postulacion.createdAt).toLocaleDateString('es-PY')}</span>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/admin/postulaciones/${postulacion.slug ?? postulacion.id}`)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>

                  {/* Fila expandida con detalles */}
                  {expandedRow === postulacion.id && (
                    <tr className="border-b bg-muted/30">
                      <td colSpan={8} className="p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-semibold">Vehículo:</span>{' '}
                            {postulacion.hasVehicle ? (
                              <span className="text-muted-foreground">
                                {postulacion.vehicleBrand} {postulacion.vehicleModel} ({postulacion.vehicleYear})
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Sin vehículo</span>
                            )}
                          </div>
                          <div>
                            <span className="font-semibold">Zona de trabajo:</span>{' '}
                            <span className="text-muted-foreground">{postulacion.workZone || 'No especificado'}</span>
                          </div>
                          <div>
                            <span className="font-semibold">Documentos:</span>{' '}
                            <span className="text-muted-foreground">
                              {postulacion.documents.filter(d => d.status === 'APPROVED').length} aprobados de {postulacion.documents.length}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold">Pagos:</span>{' '}
                            <span className="text-muted-foreground">
                              {postulacion.equipmentPayments.length > 0 
                                ? `${postulacion.equipmentPayments[0].status}` 
                                : 'Sin registro'}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {postulaciones.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground font-medium">No hay postulaciones</p>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1}-{Math.min(endIndex, postulaciones.length)} de {postulaciones.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}