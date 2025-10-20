// components/admin/postulacion-detail-content.tsx

"use client"

import { useState } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
import {
  FileText,
  Clock,
  MessageSquare,
  Edit,
  Save,
  X,
  CheckCircle,
  Bot,
  Loader2,
  CreditCard,
  Eye,
  Calendar,
} from "lucide-react"
import { DocumentPreview } from "@/components/admin/document-preview"
import { ScheduleOnboardingModal } from "@/components/admin/schedule-onboarding-modal"
import { PersonalInfoCard } from "@/components/admin/personal-info-card"
import { 
  DocumentsStatusBadge, 
  PaymentSection, 
  OnboardingSection 
} from "@/components/admin/postulacion-helpers"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PostulacionDetailContentProps {
  postulacion: any
}

export function PostulacionDetailContent({ postulacion }: PostulacionDetailContentProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState(postulacion)
  const [isSaving, setIsSaving] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [notes, setNotes] = useState(postulacion.notes || [])
  const [documents, setDocuments] = useState(postulacion.documents || [])
  
  // Filtrar documentos (excluir comprobantes de pago)
  const regularDocuments = documents.filter((doc: any) => doc.documentType !== 'PAYMENT_PROOF')
  
  // Modal de gestión de pago
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentData, setPaymentData] = useState({
    paymentMethod: postulacion.equipmentPayments?.[0]?.paymentMethod || '',
    paymentNumber: postulacion.equipmentPayments?.[0]?.paymentNumber || '',
    invoiceNumber: postulacion.equipmentPayments?.[0]?.invoiceNumber || '',
    amount: postulacion.equipmentPayments?.[0]?.amount || '',
    status: postulacion.equipmentPayments?.[0]?.status || 'PENDING',
    adminNotes: postulacion.equipmentPayments?.[0]?.adminNotes || '',
    rejectionReason: postulacion.equipmentPayments?.[0]?.rejectionReason || '',
  })
  const [isSavingPayment, setIsSavingPayment] = useState(false)
  
  // Preview de comprobante
  const [showProofPreview, setShowProofPreview] = useState(false)
  
  // Modal de agendamiento de onboarding
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  
  // ===== VALIDACIONES PARA ONBOARDING (SIN RESTRICCIONES) =====
  // Ahora se puede agendar independientemente del estado de docs/pagos
  const isAlreadyScheduled = postulacion.onboardingStatus === 'SCHEDULED' || 
                             postulacion.onboardingStatus === 'COMPLETED' ||
                             postulacion.onboardingStatus === 'IN_PROGRESS'

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/postulaciones/${postulacion.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedData),
      })
      if (!response.ok) throw new Error('Error al guardar los cambios')
      toast.success('Cambios guardados exitosamente')
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      console.error('Error al guardar:', error)
      toast.error('Error al guardar los cambios')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedData(postulacion)
    setIsEditing(false)
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setIsSavingNote(true)
    try {
      const response = await fetch('/api/postulaciones/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formDriverId: postulacion.id,
          content: newNote,
          createdBy: 'Admin User',
        }),
      })
      if (!response.ok) throw new Error('Error al guardar la nota')
      const savedNote = await response.json()
      setNotes([savedNote, ...notes])
      setNewNote('')
      toast.success('Nota añadida exitosamente')
    } catch (error) {
      console.error('Error al añadir nota:', error)
      toast.error('Error al guardar la nota')
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleScheduleOnboarding = () => {
    // Abrir modal directamente sin validaciones restrictivas
    setShowScheduleModal(true)
  }

  const handleDocumentDelete = async (documentId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) return
    try {
      const response = await fetch(`/api/postulaciones/documents/${documentId}/delete`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Error al eliminar el documento')
      setDocuments(documents.filter((doc: any) => doc.id !== documentId))
      toast.success('Documento eliminado exitosamente')
      router.refresh()
    } catch (error) {
      console.error('Error al eliminar documento:', error)
      toast.error('Error al eliminar el documento')
    }
  }

  const handleDocumentUpload = async (documentType: string, files: FileList) => {
    if (!files || files.length === 0) return
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('formDriverId', postulacion.id)
        uploadFormData.append('documentType', documentType)

        const response = await fetch('/api/postulaciones/documents/upload', {
          method: 'POST',
          body: uploadFormData,
        })
        if (!response.ok) throw new Error(`Error al subir ${file.name}`)
        const { document } = await response.json()
        setDocuments([...documents, document])
      }
      toast.success(`${files.length} documento(s) subido(s) exitosamente`)
      router.refresh()
    } catch (error) {
      console.error('Error al subir documentos:', error)
      toast.error('Error al subir los documentos')
    }
  }

  const handleDocumentApprove = async (documentId: string) => {
    try {
      const response = await fetch(`/api/postulaciones/documents/${documentId}/approve`, {
        method: 'PATCH',
      })
      if (!response.ok) throw new Error('Error al aprobar el documento')
      const { document: updatedDoc } = await response.json()
      setDocuments(documents.map((doc: any) => 
        doc.id === documentId ? updatedDoc : doc
      ))
      toast.success('Documento aprobado exitosamente')
      router.refresh()
    } catch (error) {
      console.error('Error al aprobar documento:', error)
      toast.error('Error al aprobar el documento')
    }
  }

  const handleDocumentReject = async (documentId: string, reason: string) => {
    try {
      const response = await fetch(`/api/postulaciones/documents/${documentId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!response.ok) throw new Error('Error al rechazar el documento')
      const { document: updatedDoc } = await response.json()
      setDocuments(documents.map((doc: any) => 
        doc.id === documentId ? updatedDoc : doc
      ))
      toast.success('Documento rechazado')
      router.refresh()
    } catch (error) {
      console.error('Error al rechazar documento:', error)
      toast.error('Error al rechazar el documento')
    }
  }

  const handleSavePayment = async () => {
    setIsSavingPayment(true)
    try {
      const response = await fetch(`/api/postulaciones/${postulacion.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      })
      if (!response.ok) throw new Error('Error al actualizar el pago')
      toast.success('Pago actualizado exitosamente')
      setShowPaymentModal(false)
      router.refresh()
    } catch (error) {
      console.error('Error al actualizar pago:', error)
      toast.error('Error al actualizar el pago')
    } finally {
      setIsSavingPayment(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader 
        breadcrumbs={[
          { label: "Postulaciones", href: "/admin/postulaciones" },
          { label: postulacion.fullName }
        ]}
      />
      
      <div className="flex-1 p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Header con acciones y badges */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{postulacion.fullName}</h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground">
              CI: {postulacion.cedula} • Postulación iniciada el {new Date(postulacion.startedAt).toLocaleDateString('es-PY')}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {postulacion.currentStep}/6 pasos
              </Badge>
              {postulacion.completedAt && (
                <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3" />
                  Completada
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2 flex-1 sm:flex-none cursor-pointer">
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">Editar</span>
                </Button>
                
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <span className="inline-block flex-1 sm:flex-none">
                        <Button variant="outline" className="gap-2 w-full" disabled title="Verificar con IA">
                          <Bot className="h-4 w-4" />
                          <span className="hidden sm:inline">Verificar con IA</span>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-sm">Función en desarrollo - Próximamente disponible</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Botón principal: Agendar o Ver Onboarding */}
                {isAlreadyScheduled ? (
                  <Button 
                    variant="default" 
                    className="gap-2 bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none cursor-pointer"
                    onClick={() => router.push(`/admin/onboarding/${postulacion.id}`)}
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">Ver Onboarding</span>
                  </Button>
                ) : (
                  <Button 
                    variant="default" 
                    className="gap-2 bg-green-600 hover:bg-green-700 flex-1 sm:flex-none cursor-pointer"
                    onClick={handleScheduleOnboarding}
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">Agendar Onboarding</span>
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCancel} 
                  className="gap-2 flex-1 sm:flex-none cursor-pointer"
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button 
                  variant="default" 
                  onClick={handleSave} 
                  className="gap-2 flex-1 sm:flex-none cursor-pointer"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Guardar
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* FILA 1: Info Personal (50%) + Documentos (50%) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          
          {/* Información Personal */}
          <PersonalInfoCard 
            postulacion={postulacion}
            editedData={editedData}
            isEditing={isEditing}
            setEditedData={setEditedData}
          />

          {/* Documentos */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                  <FileText className="h-4 w-4" />
                  Documentos Adjuntos
                </CardTitle>
                <DocumentsStatusBadge status={postulacion.documentsStatus} />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <DocumentPreview 
                documents={regularDocuments}
                isEditing={true}
                onDocumentDelete={handleDocumentDelete}
                onDocumentUpload={handleDocumentUpload}
                onDocumentApprove={handleDocumentApprove}
                onDocumentReject={handleDocumentReject}
              />
            </CardContent>
          </Card>
        </div>

        {/* FILA 2: Notas (33%) + Pago (33%) + OnBoarding (33%) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          
          {/* Notas */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                <MessageSquare className="h-4 w-4" />
                Notas Internas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notes.map((note: any) => (
                  <div key={note.id} className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-xs">{note.content}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      <span>{note.createdByUser?.firstName || note.createdByUser?.fullName || note.createdByUser?.email || 'Admin'}</span>
                      <span>•</span>
                      <span>{new Date(note.createdAt).toLocaleString('es-PY')}</span>
                    </div>
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No hay notas aún
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="Añadir una nota interna..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  className="text-xs"
                  disabled={isSavingNote}
                />
                <Button 
                  onClick={handleAddNote} 
                  size="sm"   
                  className="w-full h-8 cursor-pointer"
                  disabled={!newNote.trim() || isSavingNote}
                >
                  {isSavingNote ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Añadir Nota'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pago de Equipamiento */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                <CreditCard className="h-4 w-4" />
                Pago de Equipamiento
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <PaymentSection 
                payment={postulacion.equipmentPayments?.[0]} 
                postulacionId={postulacion.id}
                onManage={() => setShowPaymentModal(true)}
                onViewProof={() => setShowProofPreview(true)}
              />
            </CardContent>
          </Card>

          {/* OnBoarding */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                <Calendar className="h-4 w-4" />
                On Boarding
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <OnboardingSection 
                attendance={postulacion.onboardingAttendances?.[0]} 
                status={postulacion.onboardingStatus}
                postulacionId={postulacion.id}
              />
            </CardContent>
          </Card>
        </div>

        {/* Timeline - Full Width */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
              <Clock className="h-4 w-4" />
              Historial del Proceso
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative">
              {/* Desktop: Línea horizontal */}
              <div className="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-muted" />
              <div 
                className="hidden md:block absolute top-6 left-0 h-0.5 bg-primary transition-all duration-500"
                style={{ 
                  width: `${((postulacion.completedSteps.length - 1) / (postulacion.timeline.length - 1)) * 100}%` 
                }}
              />
              
              {/* Mobile: Línea vertical */}
              <div className="md:hidden absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />
              <div 
                className="md:hidden absolute left-6 top-0 w-0.5 bg-primary transition-all duration-500"
                style={{ 
                  height: `${((postulacion.completedSteps.length - 1) / (postulacion.timeline.length - 1)) * 100}%` 
                }}
              />
              
              {/* Steps - Responsive */}
              <div className="relative grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-2">
                {postulacion.timeline.map((step: any) => {
                  const isCompleted = postulacion.completedSteps.includes(step.step)
                  return (
                    <div key={step.step} className="flex md:block items-start md:text-center">
                      <div className={`flex-shrink-0 md:mx-auto w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold mb-0 md:mb-3 transition-all ${
                        isCompleted
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {step.step}
                      </div>
                      <div className="ml-4 md:ml-0 flex-1">
                        <p className="text-xs font-medium text-foreground mb-1">
                          {step.name}
                        </p>
                        {step.completedAt && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(step.completedAt).toLocaleTimeString('es-PY', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Modal de agendamiento de onboarding */}
      <ScheduleOnboardingModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        driverId={postulacion.id}
        driverName={postulacion.fullName}
        onSuccess={() => {
          toast.success('Onboarding agendado exitosamente')
          router.refresh()
          router.push(`/admin/onboarding/${postulacion.id}`)
        }}
      />
      
      {/* Modal de Gestión de Pago */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gestionar Pago de Equipamiento</DialogTitle>
            <DialogDescription>
              Actualiza la información del pago y cambia su estado
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Método de Pago</Label>
                <Select 
                  value={paymentData.paymentMethod} 
                  onValueChange={(v) => setPaymentData({...paymentData, paymentMethod: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    <SelectItem value="POS">POS</SelectItem>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="OTROS">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select 
                  value={paymentData.status} 
                  onValueChange={(v) => setPaymentData({...paymentData, status: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pendiente</SelectItem>
                    <SelectItem value="VERIFIED">Verificado</SelectItem>
                    <SelectItem value="REJECTED">Rechazado</SelectItem>
                    <SelectItem value="PARTIAL">Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Monto (Gs)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                  placeholder="Ej: 150000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentNumber">Nro. Comprobante</Label>
                <Input
                  id="paymentNumber"
                  value={paymentData.paymentNumber}
                  onChange={(e) => setPaymentData({...paymentData, paymentNumber: e.target.value})}
                  placeholder="Últimos 6 dígitos"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Nro. de Factura</Label>
              <Input
                id="invoiceNumber"
                value={paymentData.invoiceNumber}
                onChange={(e) => setPaymentData({...paymentData, invoiceNumber: e.target.value})}
                placeholder="Ej: 001-001-0019089"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminNotes">Notas Administrativas</Label>
              <Textarea
                id="adminNotes"
                value={paymentData.adminNotes}
                onChange={(e) => setPaymentData({...paymentData, adminNotes: e.target.value})}
                placeholder="Notas internas sobre el pago..."
                rows={3}
              />
            </div>
            
            {paymentData.status === 'REJECTED' && (
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Razón de Rechazo</Label>
                <Textarea
                  id="rejectionReason"
                  value={paymentData.rejectionReason}
                  onChange={(e) => setPaymentData({...paymentData, rejectionReason: e.target.value})}
                  placeholder="Explica por qué se rechaza el pago..."
                  rows={2}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePayment} disabled={isSavingPayment}>
              {isSavingPayment ? (
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
      
      {/* Modal de Preview de Comprobante */}
      <Dialog open={showProofPreview} onOpenChange={setShowProofPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Comprobante de Pago</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg min-h-[60vh]">
            {postulacion.equipmentPayments?.[0]?.paymentProofUrl ? (
              <iframe
                src={postulacion.equipmentPayments[0].paymentProofUrl}
                className="w-full h-[70vh] rounded border"
                title="Comprobante de Pago"
              />
            ) : (
              <p className="text-sm text-muted-foreground">No hay comprobante disponible</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}