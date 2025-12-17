// components/admin/pagos-page-content.tsx

"use client"

import { useState, useMemo } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Search,
  Download,
  Loader2,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"

interface PagosPageContentProps {
  pagos: any[]
  stats: {
    total: number
    verified: number
    pending: number
    rejected: number
    partial: number
    totalAmount: number
    averageAmount: number
  }
}

export function PagosPageContent({ pagos, stats }: PagosPageContentProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isExporting, setIsExporting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPago, setSelectedPago] = useState<any | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string>('')
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  const itemsPerPage = 20

  // Filtrar pagos
  const filteredPagos = useMemo(() => {
    return pagos.filter(pago => {
      // Filtro de búsqueda
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchName = pago.formDriver?.fullName?.toLowerCase().includes(search)
        const matchCedula = pago.formDriver?.cedula?.toLowerCase().includes(search)
        const matchInvoice = pago.invoiceNumber?.toLowerCase().includes(search)
        const matchPaymentNumber = pago.paymentNumber?.toLowerCase().includes(search)

        if (!matchName && !matchCedula && !matchInvoice && !matchPaymentNumber) {
          return false
        }
      }

      // Filtro de estado
      if (statusFilter !== 'all' && pago.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [pagos, searchTerm, statusFilter])

  // Paginación
  const totalPages = Math.ceil(filteredPagos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPagos = filteredPagos.slice(startIndex, endIndex)

  // Resetear página cuando cambian los filtros
  useMemo(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  // Función para abrir detalles del pago
  const handleViewDetails = (pago: any) => {
    setSelectedPago(pago)
    setUpdateStatus(pago.status)
    setAdminNotes(pago.adminNotes || '')
    setRejectionReason(pago.rejectionReason || '')
    setIsSheetOpen(true)
  }

  // Función para actualizar estado del pago
  const handleUpdatePayment = async () => {
    if (!selectedPago) return

    setIsUpdating(true)
    try {
      const response = await fetch('/api/admin/pagos/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pagoId: selectedPago.id,
          status: updateStatus,
          adminNotes,
          rejectionReason: updateStatus === 'REJECTED' ? rejectionReason : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar el pago')
      }

      toast.success('Pago actualizado exitosamente')
      setIsSheetOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error al actualizar pago:', error)
      toast.error('Error al actualizar el pago')
    } finally {
      setIsUpdating(false)
    }
  }

  // Función para exportar a XLSX
  const handleExportToXLSX = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/admin/pagos/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          searchTerm: searchTerm || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al exportar datos')
      }

      // Descargar el archivo
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pagos_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Exportación completada exitosamente')
    } catch (error) {
      console.error('Error al exportar:', error)
      toast.error('Error al exportar datos')
    } finally {
      setIsExporting(false)
    }
  }

  // Helper para obtener el badge de estado
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verificado
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rechazado
          </Badge>
        )
      case 'PARTIAL':
        return (
          <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Parcial
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Helper para formatear método de pago
  const getPaymentMethodLabel = (method: string | null) => {
    switch (method) {
      case 'TRANSFERENCIA':
        return 'Transferencia'
      case 'POS':
        return 'POS'
      case 'OTROS':
        return 'Otros'
      default:
        return method || 'N/A'
    }
  }

  // Formato de moneda
  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        breadcrumbs={[
          { label: "Pagos", href: "/admin/pagos" },
        ]}
      />

      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Pagos</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Administra todos los pagos de equipamiento de los conductores
            </p>
          </div>
          <Button
            onClick={handleExportToXLSX}
            disabled={isExporting}
            variant="outline"
            className="gap-2 whitespace-nowrap"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Exportar a Excel
              </>
            )}
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pagos</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.totalAmount)} total recaudado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verificados</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.verified}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.averageAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                Por transacción
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, cédula, factura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="VERIFIED">Verificados</SelectItem>
              <SelectItem value="PENDING">Pendientes</SelectItem>
              <SelectItem value="PARTIAL">Parciales</SelectItem>
              <SelectItem value="REJECTED">Rechazados</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg text-sm whitespace-nowrap">
            <span className="font-semibold text-foreground">{filteredPagos.length}</span>
            <span className="text-muted-foreground">resultado{filteredPagos.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Tabla de Pagos */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Nro. Factura</TableHead>
                    <TableHead>Nro. Comprobante</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPagos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No se encontraron pagos
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPagos.map((pago) => (
                      <TableRow key={pago.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {pago.formDriver?.fullName ||
                            `${pago.formDriver?.firstName || ''} ${pago.formDriver?.lastName || ''}`.trim() ||
                            'Sin nombre'}
                        </TableCell>
                        <TableCell>{pago.formDriver?.cedula || 'N/A'}</TableCell>
                        <TableCell>{getPaymentMethodLabel(pago.paymentMethod)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(pago.amount)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {pago.invoiceNumber || 'N/A'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {pago.paymentNumber || 'N/A'}
                        </TableCell>
                        <TableCell>{getStatusBadge(pago.status)}</TableCell>
                        <TableCell>
                          {pago.paymentDate
                            ? format(new Date(pago.paymentDate), 'dd/MM/yyyy', { locale: es })
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {pago.paymentProofUrl ? (
                            <a
                              href={pago.paymentProofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Ver
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sin comprobante</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(pago)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredPagos.length)} de {filteredPagos.length} pagos
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <div className="text-sm font-medium">
                    Página {currentPage} de {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sheet de detalles del pago */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Detalles del Pago</SheetTitle>
              <SheetDescription>
                Información completa y gestión del pago
              </SheetDescription>
            </SheetHeader>

            {selectedPago && (
              <div className="space-y-6 mt-6">
                {/* Información del Conductor */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-foreground">Información del Conductor</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Nombre</Label>
                      <p className="font-medium mt-1">
                        {selectedPago.formDriver?.fullName ||
                          `${selectedPago.formDriver?.firstName || ''} ${selectedPago.formDriver?.lastName || ''}`.trim() ||
                          'Sin nombre'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Cédula</Label>
                      <p className="font-medium mt-1">{selectedPago.formDriver?.cedula || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Teléfono</Label>
                      <p className="font-medium mt-1">{selectedPago.formDriver?.phoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium mt-1 text-xs break-all">
                        {selectedPago.formDriver?.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Información del Pago */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3 text-foreground">Información del Pago</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Método de Pago</Label>
                      <p className="font-medium mt-1">{getPaymentMethodLabel(selectedPago.paymentMethod)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Monto</Label>
                      <p className="font-semibold text-lg mt-1">{formatCurrency(selectedPago.amount)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Número de Factura</Label>
                      <p className="font-mono font-medium mt-1">{selectedPago.invoiceNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Número de Comprobante</Label>
                      <p className="font-mono font-medium mt-1">{selectedPago.paymentNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Fecha de Pago</Label>
                      <p className="font-medium mt-1">
                        {selectedPago.paymentDate
                          ? format(new Date(selectedPago.paymentDate), 'dd/MM/yyyy', { locale: es })
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Estado Actual</Label>
                      <div className="mt-1">{getStatusBadge(selectedPago.status)}</div>
                    </div>
                  </div>

                  {/* Comprobante de Pago */}
                  {selectedPago.paymentProofUrl && (
                    <div className="mt-4">
                      <Label className="text-muted-foreground">Comprobante de Pago</Label>
                      <a
                        href={selectedPago.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mt-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ver comprobante
                      </a>
                    </div>
                  )}
                </div>

                {/* Verificación */}
                {selectedPago.verifiedAt && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-3 text-foreground">Información de Verificación</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Verificado por</Label>
                        <p className="font-medium mt-1">{selectedPago.verifiedByUser?.fullName || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Fecha de Verificación</Label>
                        <p className="font-medium mt-1">
                          {format(new Date(selectedPago.verifiedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Formulario de Actualización */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3 text-foreground">Actualizar Pago</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="update-status">Estado</Label>
                      <Select value={updateStatus} onValueChange={setUpdateStatus}>
                        <SelectTrigger id="update-status" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pendiente</SelectItem>
                          <SelectItem value="VERIFIED">Verificado</SelectItem>
                          <SelectItem value="PARTIAL">Parcial</SelectItem>
                          <SelectItem value="REJECTED">Rechazado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="admin-notes">Notas Administrativas</Label>
                      <Textarea
                        id="admin-notes"
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Agregar notas internas sobre este pago..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    {updateStatus === 'REJECTED' && (
                      <div>
                        <Label htmlFor="rejection-reason">Razón de Rechazo *</Label>
                        <Textarea
                          id="rejection-reason"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Especificar por qué se rechaza este pago..."
                          rows={3}
                          className="mt-1"
                          required
                        />
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleUpdatePayment}
                        disabled={isUpdating || (updateStatus === 'REJECTED' && !rejectionReason.trim())}
                        className="flex-1"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Actualizando...
                          </>
                        ) : (
                          'Actualizar Pago'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsSheetOpen(false)}
                        disabled={isUpdating}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="border-t pt-4 text-xs text-muted-foreground">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-medium">Creado:</span>{' '}
                      {format(new Date(selectedPago.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </div>
                    <div>
                      <span className="font-medium">Actualizado:</span>{' '}
                      {format(new Date(selectedPago.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
