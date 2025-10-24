// components/admin/onboarding/driver-management-sheet.tsx
"use client"

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  User,
  Phone,
  Mail,
  FileText,
  DollarSign,
  Car,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  ExternalLink,
  Users,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatBirthDateWithAge, formatDateOnly } from "@/lib/utils"
import { getDriverById } from '@/lib/actions/driver.actions'
import { toast } from 'sonner'
import { DocumentPreview } from '@/components/admin/document-preview'

interface DriverManagementSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  driverId: string | null
  onSuccess: () => void
}

export function DriverManagementSheet({
  open,
  onOpenChange,
  driverId,
  onSuccess,
}: DriverManagementSheetProps) {
  const [activeTab, setActiveTab] = useState('info')
  const [driver, setDriver] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [documentLoading, setDocumentLoading] = useState<string | null>(null)

  // Estado para gestión de pago
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentData, setPaymentData] = useState({
    paymentMethod: '',
    paymentNumber: '',
    invoiceNumber: '',
    amount: '',
    status: 'PENDING',
    adminNotes: '',
    rejectionReason: '',
  })

  // Cargar datos completos del driver cuando se abre el sheet
  useEffect(() => {
    if (open && driverId) {
      loadDriverData()
    } else if (!open) {
      // Limpiar datos cuando se cierra
      setDriver(null)
      setActiveTab('info')
      setDocumentLoading(null)
    }
  }, [open, driverId])

  // Actualizar paymentData cuando cambia el driver
  useEffect(() => {
    if (driver?.equipmentPayments?.[0]) {
      const payment = driver.equipmentPayments[0]
      setPaymentData({
        paymentMethod: payment.paymentMethod || '',
        paymentNumber: payment.paymentNumber || '',
        invoiceNumber: payment.invoiceNumber || '',
        amount: payment.amount?.toString() || '',
        status: payment.status || 'PENDING',
        adminNotes: payment.adminNotes || '',
        rejectionReason: payment.rejectionReason || '',
      })
    }
  }, [driver])

  const loadDriverData = async () => {
    if (!driverId) return
    
    setLoading(true)
    try {
      const result = await getDriverById(driverId)
      
      if (result.success && result.driver) {
        setDriver(result.driver)
      } else {
        toast.error('No se pudo cargar la información del driver')
      }
    } catch (error) {
      console.error('Error loading driver:', error)
      toast.error('Error al cargar datos del driver')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'No especificado'
    try {
      const d = typeof date === 'string' ? new Date(date) : date
      // Verificar si la fecha es válida
      if (isNaN(d.getTime())) return 'No especificado'
      
      return d.toLocaleDateString('es-PY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch (error) {
      return 'No especificado'
    }
  }

  const handleDocumentApprove = async (documentId: string) => {
    setDocumentLoading(documentId)
    
    // Actualización optimista
    setDriver((prev: any) => ({
      ...prev,
      documents: prev.documents.map((doc: any) =>
        doc.id === documentId
          ? { ...doc, status: 'APPROVED', reviewedAt: new Date().toISOString() }
          : doc
      ),
    }))

    try {
      const { approveDocument } = await import('@/lib/actions/postulacion.actions')
      const result = await approveDocument(documentId)
      
      if (result.success) {
        toast.success('Documento aprobado exitosamente')
        await loadDriverData() // Recargar para estar seguros
      } else {
        toast.error(result.error || 'Error al aprobar documento')
        await loadDriverData() // Revertir cambios
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al aprobar documento')
      await loadDriverData() // Revertir cambios
    } finally {
      setDocumentLoading(null)
    }
  }

  const handleDocumentReject = async (documentId: string, reason: string) => {
    setDocumentLoading(documentId)
    
    // Actualización optimista
    setDriver((prev: any) => ({
      ...prev,
      documents: prev.documents.map((doc: any) =>
        doc.id === documentId
          ? { ...doc, status: 'REJECTED', rejectionReason: reason, reviewedAt: new Date().toISOString() }
          : doc
      ),
    }))

    try {
      const { rejectDocument } = await import('@/lib/actions/postulacion.actions')
      const result = await rejectDocument(documentId, reason)
      
      if (result.success) {
        toast.success('Documento rechazado')
        await loadDriverData() // Recargar para estar seguros
      } else {
        toast.error(result.error || 'Error al rechazar documento')
        await loadDriverData() // Revertir cambios
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al rechazar documento')
      await loadDriverData() // Revertir cambios
    } finally {
      setDocumentLoading(null)
    }
  }

  const handleDocumentDelete = async (documentId: string) => {
    setDocumentLoading(documentId)
    
    // Actualización optimista
    setDriver((prev: any) => ({
      ...prev,
      documents: prev.documents.filter((doc: any) => doc.id !== documentId),
    }))

    try {
      const { deleteDocument } = await import('@/lib/actions/postulacion.actions')
      const result = await deleteDocument(documentId)
      
      if (result.success) {
        toast.success('Documento eliminado')
      } else {
        toast.error(result.error || 'Error al eliminar documento')
        await loadDriverData() // Revertir cambios
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar documento')
      await loadDriverData() // Revertir cambios
    } finally {
      setDocumentLoading(null)
    }
  }

  const handleDocumentUpload = async (documentType: string, files: FileList) => {
    if (!driver?.id || files.length === 0) return

    setDocumentLoading('uploading')

    try {
      const formData = new FormData()
      formData.append('file', files[0])
      formData.append('documentType', documentType)
      formData.append('formDriverId', driver.id)

      const response = await fetch('/api/postulaciones/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        toast.success('Documento subido exitosamente')
        await loadDriverData() // Recargar datos
      } else {
        const data = await response.json()
        toast.error(data.error || 'Error al subir documento')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al subir documento')
    } finally {
      setDocumentLoading(null)
    }
  }

  const handleSavePayment = async () => {
    if (!driver?.id) return

    setPaymentLoading(true)
    try {
      const { updatePayment } = await import('@/lib/actions/postulacion.actions')
      const result = await updatePayment(driver.id, paymentData)
      
      if (result.success) {
        toast.success('Pago actualizado exitosamente')
        setShowPaymentModal(false)
        await loadDriverData() // Recargar datos
        onSuccess() // Notificar al padre
      } else {
        toast.error(result.error || 'Error al actualizar pago')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar pago')
    } finally {
      setPaymentLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: any }> = {
      PENDING: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      IN_REVIEW: { label: 'En Revisión', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: Eye },
      APPROVED: { label: 'Aprobado', className: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      REJECTED: { label: 'Rechazado', className: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    }
    const { label, className, icon: Icon } = config[status] || config.PENDING
    return (
      <Badge variant="outline" className={cn(className, "gap-1")}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  const getDocumentsStatusBadge = (status: string) => {
    if (status === 'APPROVED') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
          <CheckCircle className="h-3 w-3" />
          Aprobados
        </Badge>
      )
    }
    if (status === 'REJECTED') {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
          <XCircle className="h-3 w-3" />
          Rechazados
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
        <AlertTriangle className="h-3 w-3" />
        Pendientes
      </Badge>
    )
  }

  const getPaymentBadge = () => {
    if (!driver?.equipmentPayments || driver.equipmentPayments.length === 0) {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          Sin pago registrado
        </Badge>
      )
    }

    const payment = driver.equipmentPayments[0]

    if (payment.status === 'VERIFIED') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
          <CheckCircle className="h-3 w-3" />
          Verificado
        </Badge>
      )
    }

    if (payment.status === 'REJECTED') {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
          <XCircle className="h-3 w-3" />
          Rechazado
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
        <Clock className="h-3 w-3" />
        Pendiente
      </Badge>
    )
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'CEDULA_FRONT': 'Cédula (Frente)',
      'CEDULA_BACK': 'Cédula (Dorso)',
      'LICENSE_FRONT': 'Licencia (Frente)',
      'LICENSE_BACK': 'Licencia (Dorso)',
      'CRIMINAL_RECORD': 'Antecedentes',
      'VEHICLE_REGISTRATION': 'Cédula Verde',
      'SELFIE_WITH_CEDULA': 'Selfie con Cédula',
      'SELFIE': 'Selfie con Cédula',
    }
    return labels[type] || type
  }

  if (!driver) return null

  // Mostrar loading mientras carga
  if (loading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        {/* Header fijo */}
        <SheetHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 min-w-0 flex-1">
              <SheetTitle className="text-2xl truncate">{driver.fullName || 'Driver'}</SheetTitle>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                {driver.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{driver.phoneNumber}</span>
                  </div>
                )}
                {driver.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{driver.email}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {getStatusBadge(driver.applicationStatus)}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/admin/postulaciones/${driver.id}`, '_blank')}
                className="gap-2 whitespace-nowrap"
              >
                <ExternalLink className="h-3 w-3" />
                Ver completo
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="info" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Info</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Docs</span>
                </TabsTrigger>
                <TabsTrigger value="payment" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Pago</span>
                </TabsTrigger>
                <TabsTrigger value="vehicle" className="gap-2">
                  <Car className="h-4 w-4" />
                  <span className="hidden sm:inline">Vehículo</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab: Información Personal */}
              <TabsContent value="info" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Información Personal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Cédula</p>
                        <p className="text-sm">{driver.cedula || 'No especificado'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Fecha de Nacimiento</p>
                        <p className="text-sm">
                          {driver.birthDate 
                            ? (formatBirthDateWithAge(driver.birthDate) || formatDateOnly(driver.birthDate) || driver.birthDate)
                            : 'No especificado'
                          }
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Dirección</p>
                        <p className="text-sm">{driver.address || 'No especificado'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Ciudad</p>
                          <p className="text-sm">{driver.city || 'No especificado'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Barrio</p>
                          <p className="text-sm">{driver.neighborhood || 'No especificado'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contacto de emergencia */}
                {(driver.emergencyName || driver.emergencyPhone) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Contacto de Emergencia
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Nombre</p>
                        <p className="text-sm">{driver.emergencyName || 'No especificado'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Relación</p>
                          <p className="text-sm">{driver.emergencyRelationship || 'No especificado'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Teléfono</p>
                          <p className="text-sm">{driver.emergencyPhone || 'No especificado'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab: Documentos */}
              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Documentos
                      </CardTitle>
                      {getDocumentsStatusBadge(driver.documentsStatus || 'PENDING')}
                    </div>
                    <CardDescription className="text-xs">
                      Total de documentos: {driver.documents?.length || 0}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DocumentPreview
                      documents={driver.documents || []}
                      isEditing={true}
                      onDocumentApprove={handleDocumentApprove}
                      onDocumentReject={handleDocumentReject}
                      onDocumentDelete={handleDocumentDelete}
                      onDocumentUpload={handleDocumentUpload}
                      isLoading={!!documentLoading}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Pago */}
              <TabsContent value="payment" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Pago de Equipamiento
                      </CardTitle>
                      {getPaymentBadge()}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!driver.equipmentPayments || driver.equipmentPayments.length === 0 ? (
                      <div className="space-y-4">
                        <div className="text-center py-12 text-muted-foreground">
                          <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">No hay pagos registrados</p>
                        </div>
                        <Button
                          onClick={() => setShowPaymentModal(true)}
                          className="w-full cursor-pointer"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Registrar Pago
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {driver.equipmentPayments.map((payment: any) => (
                          <div key={payment.id} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Método de Pago</p>
                                <p className="text-sm">{payment.paymentMethod || 'No especificado'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Nº Comprobante</p>
                                <p className="text-sm">{payment.paymentNumber || 'No especificado'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Monto</p>
                                <p className="text-sm font-semibold">
                                  {payment.amount ? `₲ ${payment.amount.toLocaleString('es-PY')}` : 'No especificado'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Fecha de Pago</p>
                                <p className="text-sm">{formatDate(payment.paymentDate)}</p>
                              </div>
                            </div>

                            {payment.proofDriveId && (
                              <div className="pt-3 border-t">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Comprobante</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(payment.proofUrl || `https://drive.google.com/file/d/${payment.proofDriveId}/view`, '_blank')}
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  Ver comprobante
                                </Button>
                              </div>
                            )}

                            {payment.rejectionReason && (
                              <div className="pt-3 border-t bg-red-50 p-3 rounded-lg">
                                <p className="text-xs font-medium text-red-700 mb-1">Motivo de rechazo:</p>
                                <p className="text-sm text-red-600">{payment.rejectionReason}</p>
                              </div>
                            )}

                            {payment.adminNotes && (
                              <div className="pt-3 border-t bg-muted/50 p-3 rounded-lg">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Notas administrativas:</p>
                                <p className="text-sm">{payment.adminNotes}</p>
                              </div>
                            )}

                            <div className="pt-3 border-t">
                              <Button
                                onClick={() => setShowPaymentModal(true)}
                                variant="default"
                                className="w-full cursor-pointer"
                              >
                                <DollarSign className="h-4 w-4 mr-2" />
                                Gestionar Pago
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Vehículo */}
              <TabsContent value="vehicle" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Información del Vehículo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!driver.vehicleBrand && !driver.vehicleModel ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Car className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No hay información del vehículo</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Marca</p>
                          <p className="text-sm">{driver.vehicleBrand || 'No especificado'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Modelo</p>
                          <p className="text-sm">{driver.vehicleModel || 'No especificado'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Año</p>
                          <p className="text-sm">{driver.vehicleYear || 'No especificado'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Placa</p>
                          <p className="text-sm font-semibold">{driver.vehiclePlate || 'No especificado'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Color</p>
                          <p className="text-sm">{driver.vehicleColor || 'No especificado'}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Dialog de Gestión de Pago */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gestionar Pago de Equipamiento</DialogTitle>
              <DialogDescription>
                Actualiza la información del pago del conductor
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Método de Pago</Label>
                  <Select
                    value={paymentData.paymentMethod}
                    onValueChange={(value) => setPaymentData({ ...paymentData, paymentMethod: value })}
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Transferencia Bancaria</SelectItem>
                      <SelectItem value="POS">POS</SelectItem>
                      <SelectItem value="CASH">Efectivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Monto (Gs.)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    placeholder="350000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentNumber">Nro. de Comprobante</Label>
                  <Input
                    id="paymentNumber"
                    value={paymentData.paymentNumber}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentNumber: e.target.value })}
                    placeholder="Últimos 6 dígitos"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Nro. de Factura</Label>
                  <Input
                    id="invoiceNumber"
                    value={paymentData.invoiceNumber}
                    onChange={(e) => setPaymentData({ ...paymentData, invoiceNumber: e.target.value })}
                    placeholder="001-001-0000000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Estado del Pago</Label>
                <Select
                  value={paymentData.status}
                  onValueChange={(value) => setPaymentData({ ...paymentData, status: value })}
                >
                  <SelectTrigger id="paymentStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pendiente</SelectItem>
                    <SelectItem value="VERIFIED">Verificado</SelectItem>
                    <SelectItem value="REJECTED">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentData.status === 'REJECTED' && (
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Razón de Rechazo</Label>
                  <Textarea
                    id="rejectionReason"
                    value={paymentData.rejectionReason}
                    onChange={(e) => setPaymentData({ ...paymentData, rejectionReason: e.target.value })}
                    placeholder="Indica por qué se rechazó el pago"
                    rows={3}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Notas Administrativas (opcional)</Label>
                <Textarea
                  id="adminNotes"
                  value={paymentData.adminNotes}
                  onChange={(e) => setPaymentData({ ...paymentData, adminNotes: e.target.value })}
                  placeholder="Observaciones internas sobre el pago"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowPaymentModal(false)}
                disabled={paymentLoading}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSavePayment}
                disabled={paymentLoading}
                className="cursor-pointer"
              >
                {paymentLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  )
}