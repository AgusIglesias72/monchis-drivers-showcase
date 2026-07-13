// components/admin/onboarding/driver-management-sheet.tsx
"use client"

import { useState, useEffect, useCallback } from 'react'
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

  const loadDriverData = useCallback(async () => {
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
  }, [driverId])

  useEffect(() => {
    if (open && driverId) {
      loadDriverData()
    } else if (!open) {
      // Limpiar datos cuando se cierra
      setDriver(null)
      setActiveTab('info')
      setDocumentLoading(null)
    }
  }, [open, driverId, loadDriverData])

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
        await loadDriverData()
      } else {
        toast.error(result.error || 'Error al rechazar documento')
        await loadDriverData()
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al rechazar documento')
      await loadDriverData()
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
        await loadDriverData()
      } else {
        toast.error(result.error || 'Error al eliminar documento')
        await loadDriverData()
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar documento')
      await loadDriverData()
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

      const result = await response.json()

      if (result.success) {
        toast.success('Documento subido correctamente')
        await loadDriverData()
      } else {
        toast.error(result.error || 'Error al subir documento')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al subir documento')
    } finally {
      setDocumentLoading(null)
    }
  }

  const handlePaymentSubmit = async () => {
    if (!driver?.id) return

    // Validaciones básicas
    if (!paymentData.paymentMethod) {
      toast.error('Selecciona un método de pago')
      return
    }
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    setPaymentLoading(true)

    try {
      const { updatePayment } = await import('@/lib/actions/postulacion.actions')
      
      const result = await updatePayment(driver.id, {
        paymentMethod: paymentData.paymentMethod,
        paymentNumber: paymentData.paymentNumber || undefined,
        invoiceNumber: paymentData.invoiceNumber || undefined,
        amount: parseFloat(paymentData.amount),
        status: paymentData.status as any,
        adminNotes: paymentData.adminNotes || undefined,
        rejectionReason: paymentData.rejectionReason || undefined,
      })

      if (result.success) {
        toast.success('Pago registrado exitosamente')
        setShowPaymentModal(false)
        await loadDriverData()
        onSuccess()
      } else {
        toast.error(result.error || 'Error al registrar el pago')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al registrar el pago')
    } finally {
      setPaymentLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { className: 'bg-warning-soft text-warning border-warning', icon: Clock, label: 'Pendiente' },
      APPROVED: { className: 'bg-success-soft text-success border-success', icon: CheckCircle, label: 'Aprobado' },
      REJECTED: { className: 'bg-danger-soft text-destructive border-destructive', icon: XCircle, label: 'Rechazado' },
      INTERVIEW_SCHEDULED: { className: 'bg-info-soft text-info border-info', icon: Users, label: 'Entrevista' },
    }

    const { className, icon: Icon, label } = config[status as keyof typeof config] || config.PENDING

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
        <Badge variant="outline" className="bg-success-soft text-success border-success gap-1">
          <CheckCircle className="h-3 w-3" />
          Aprobados
        </Badge>
      )
    }
    if (status === 'REJECTED') {
      return (
        <Badge variant="outline" className="bg-danger-soft text-destructive border-destructive gap-1">
          <XCircle className="h-3 w-3" />
          Rechazados
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-warning-soft text-warning border-warning gap-1">
        <AlertTriangle className="h-3 w-3" />
        Pendientes
      </Badge>
    )
  }

  const getPaymentBadge = () => {
    if (!driver?.equipmentPayments || driver.equipmentPayments.length === 0) {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
          Sin pago registrado
        </Badge>
      )
    }

    const payment = driver.equipmentPayments[0]

    if (payment.status === 'VERIFIED') {
      return (
        <Badge variant="outline" className="bg-success-soft text-success border-success gap-1">
          <CheckCircle className="h-3 w-3" />
          Verificado
        </Badge>
      )
    }

    if (payment.status === 'REJECTED') {
      return (
        <Badge variant="outline" className="bg-danger-soft text-destructive border-destructive gap-1">
          <XCircle className="h-3 w-3" />
          Rechazado
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="bg-warning-soft text-warning border-warning gap-1">
        <Clock className="h-3 w-3" />
        Pendiente
      </Badge>
    )
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'CEDULA': 'Cédula',
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
        {/* Header fijo - MEJORADO */}
        <SheetHeader className="px-6 py-4 border-b bg-background">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 min-w-0 flex-1">
              <SheetTitle className="text-xl font-semibold">
                {driver.fullName || 'Driver'}
              </SheetTitle>
              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                {driver.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{driver.phoneNumber}</span>
                  </div>
                )}
                {driver.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
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
                className="gap-2 whitespace-nowrap text-xs h-8"
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
                            ? formatBirthDateWithAge(driver.birthDate)
                            : 'No especificado'}
                        </p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Dirección</p>
                      <p className="text-sm">{driver.address || 'No especificado'}</p>
                    </div>

                    {driver.emergencyContactName && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-foreground">Contacto de Emergencia</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Nombre</p>
                              <p className="text-sm">{driver.emergencyContactName}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Teléfono</p>
                              <p className="text-sm">{driver.emergencyContactPhone || 'No especificado'}</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Referencias */}
                {driver.references && driver.references.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Referencias
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {driver.references.map((ref: any, idx: number) => (
                        <div key={idx} className="space-y-2">
                          {idx > 0 && <Separator />}
                          <p className="text-xs font-semibold text-foreground">Referencia {idx + 1}</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Nombre</p>
                              <p className="text-sm">{ref.name}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Relación</p>
                              <p className="text-sm">{ref.relationship || 'No especificado'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Teléfono</p>
                              <p className="text-sm">{ref.phoneNumber}</p>
                            </div>
                          </div>
                        </div>
                      ))}
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
                      <div className="text-center py-8">
                        <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground mb-4">
                          No hay pagos registrados
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setShowPaymentModal(true)}
                          className="gap-2"
                        >
                          <DollarSign className="h-4 w-4" />
                          Registrar Pago
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {driver.equipmentPayments.map((payment: any) => (
                          <div key={payment.id} className="border rounded-lg p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Método de Pago</p>
                                <p className="text-sm font-medium">{payment.paymentMethod}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Monto</p>
                                <p className="text-sm font-medium">
                                  {payment.amount ? `₲ ${payment.amount.toLocaleString('es-PY')}` : 'No especificado'}
                                </p>
                              </div>
                              {payment.paymentNumber && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Número de Pago</p>
                                  <p className="text-sm">{payment.paymentNumber}</p>
                                </div>
                              )}
                              {payment.invoiceNumber && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Número de Factura</p>
                                  <p className="text-sm">{payment.invoiceNumber}</p>
                                </div>
                              )}
                            </div>

                            {payment.adminNotes && (
                              <>
                                <Separator />
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Notas del Admin</p>
                                  <p className="text-sm">{payment.adminNotes}</p>
                                </div>
                              </>
                            )}

                            {payment.rejectionReason && (
                              <>
                                <Separator />
                                <div className="bg-danger-soft p-3 rounded-md">
                                  <p className="text-xs font-medium text-destructive mb-1">Motivo de Rechazo</p>
                                  <p className="text-sm text-destructive">{payment.rejectionReason}</p>
                                </div>
                              </>
                            )}

                            <Separator />

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPaymentData({
                                    paymentMethod: payment.paymentMethod || '',
                                    paymentNumber: payment.paymentNumber || '',
                                    invoiceNumber: payment.invoiceNumber || '',
                                    amount: payment.amount?.toString() || '',
                                    status: payment.status || 'PENDING',
                                    adminNotes: payment.adminNotes || '',
                                    rejectionReason: payment.rejectionReason || '',
                                  })
                                  setShowPaymentModal(true)
                                }}
                              >
                                Editar
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
                    {driver.vehicleBrand || driver.vehicleModel || driver.vehicleYear || driver.vehiclePlate ? (
                      <div className="space-y-4">
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
                            <p className="text-xs font-medium text-muted-foreground mb-1">Matrícula</p>
                            <p className="text-sm">{driver.vehiclePlate || 'No especificado'}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Car className="h-12 w-12 mx-auto opacity-50 mb-3" />
                        <p className="text-sm">No hay información del vehículo</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Modal de Pago */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Gestionar Pago de Equipamiento</DialogTitle>
              <DialogDescription>
                Registra o actualiza la información del pago
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Método de Pago *</Label>
                <Select
                  value={paymentData.paymentMethod}
                  onValueChange={(value) => setPaymentData({ ...paymentData, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Transferencia Bancaria</SelectItem>
                    <SelectItem value="POS">POS</SelectItem>
                    <SelectItem value="CASH">Efectivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={paymentData.status}
                    onValueChange={(value) => setPaymentData({ ...paymentData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pendiente</SelectItem>
                      <SelectItem value="VERIFIED">Verificado</SelectItem>
                      <SelectItem value="REJECTED">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentNumber">Número de Pago (opcional)</Label>
                <Input
                  id="paymentNumber"
                  placeholder="Ej: 123456"
                  value={paymentData.paymentNumber}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Número de Factura (opcional)</Label>
                <Input
                  id="invoiceNumber"
                  placeholder="Ej: FAC-001"
                  value={paymentData.invoiceNumber}
                  onChange={(e) => setPaymentData({ ...paymentData, invoiceNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Notas del Admin (opcional)</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Agregar notas..."
                  value={paymentData.adminNotes}
                  onChange={(e) => setPaymentData({ ...paymentData, adminNotes: e.target.value })}
                  rows={3}
                />
              </div>

              {paymentData.status === 'REJECTED' && (
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Motivo de Rechazo *</Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Explica por qué se rechaza el pago..."
                    value={paymentData.rejectionReason}
                    onChange={(e) => setPaymentData({ ...paymentData, rejectionReason: e.target.value })}
                    rows={3}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
                disabled={paymentLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePaymentSubmit}
                disabled={paymentLoading}
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