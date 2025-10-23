// components/admin/postulacion-detail-content.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
  Calendar,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import { DocumentPreview } from "@/components/admin/document-preview"
import { ScheduleOnboardingModal } from "@/components/admin/schedule-onboarding-modal"
import { PersonalInfoCard } from "@/components/admin/personal-info-card"
import { InternalNotesCard } from "@/components/admin/internal-notes-card"
import { 
  PaymentSection, 
  OnboardingSection 
} from "@/components/admin/postulacion-helpers"
import { toast } from "sonner"
import {
  updatePostulacion,
  updatePayment,
  createNote,
  updateNote,
  deleteNote,
  approveDocument,
  rejectDocument,
  deleteDocument,
} from "@/lib/actions/postulacion.actions"
import { OnboardingStatusBadge } from "./postulaciones-table-expandable"

interface PostulacionDetailContentProps {
  postulacion: any
}

export function PostulacionDetailContent({ postulacion: initialPostulacion }: PostulacionDetailContentProps) {
  const router = useRouter()
  
  // ✅ Estado local que se actualiza INMEDIATAMENTE
  const [postulacion, setPostulacion] = useState(initialPostulacion)
  
  // Estados de carga separados
  const [isEditingPending, startEditingTransition] = useTransition()
  const [isNotePending, startNoteTransition] = useTransition()
  const [isDocumentPending, startDocumentTransition] = useTransition()
  const [isPaymentPending, startPaymentTransition] = useTransition()
  const [isRejectPending, startRejectTransition] = useTransition()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState(postulacion)
  const [notes, setNotes] = useState(postulacion.notes || [])
  const [documents, setDocuments] = useState(postulacion.documents || [])
  
  // Filtrar documentos
  const regularDocuments = documents.filter((doc: any) => doc.documentType !== 'PAYMENT_PROOF')
  
  // Modales
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showProofPreview, setShowProofPreview] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  
  const [paymentData, setPaymentData] = useState({
    paymentMethod: postulacion.equipmentPayments?.[0]?.paymentMethod || '',
    paymentNumber: postulacion.equipmentPayments?.[0]?.paymentNumber || '',
    invoiceNumber: postulacion.equipmentPayments?.[0]?.invoiceNumber || '',
    amount: postulacion.equipmentPayments?.[0]?.amount || '',
    status: postulacion.equipmentPayments?.[0]?.status || 'PENDING',
    adminNotes: postulacion.equipmentPayments?.[0]?.adminNotes || '',
    rejectionReason: postulacion.equipmentPayments?.[0]?.rejectionReason || '',
  })

  // ============ HANDLERS CON ACTUALIZACIÓN INMEDIATA ============

  const handleSave = () => {
    // ✅ 1. Actualizar UI inmediatamente
    const updatedPostulacion = { ...postulacion, ...editedData }
    setPostulacion(updatedPostulacion)
    setIsEditing(false)
    toast.success('Guardando cambios...')
    
    // ✅ 2. Guardar en servidor en segundo plano
    startEditingTransition(async () => {
      const result = await updatePostulacion(postulacion.id, editedData)
      
      if (result.success) {
        toast.success(result.message)
        setTimeout(() => router.refresh(), 800)
      } else {
        // ❌ Si falla, revertir cambios
        setPostulacion(postulacion)
        setEditedData(postulacion)
        setIsEditing(true)
        toast.error(result.error || 'Error al guardar')
      }
    })
  }

  const handleCancel = () => {
    setEditedData(postulacion)
    setIsEditing(false)
  }

  const handleAddNote = async (content: string) => {
    // ✅ Crear nota temporal
    const tempNote = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      formDriverId: postulacion.id,
      createdByUser: {
        fullName: 'Tú',
        email: ''
      }
    }
    
    // ✅ Agregar inmediatamente a la UI
    setNotes([tempNote, ...notes])
    toast.success('Añadiendo nota...')
    
    startNoteTransition(async () => {
      const result = await createNote(postulacion.id, content)
      
      if (result.success) {
        // ✅ Reemplazar nota temporal con la real
        setNotes([result.note, ...notes])
        toast.success('Nota añadida')
        setTimeout(() => router.refresh(), 800)
      } else {
        // ❌ Remover nota temporal si falla
        setNotes(notes)
        toast.error(result.error || 'Error al guardar nota')
      }
    })
  }

  const handleEditNote = async (noteId: string, content: string) => {
    // ✅ Actualizar inmediatamente en UI
    const previousNotes = [...notes]
    setNotes(notes.map((note: any) => 
      note.id === noteId ? { ...note, content } : note
    ))
    
    startNoteTransition(async () => {
      const result = await updateNote(noteId, content)
      
      if (result.success) {
        toast.success('Nota actualizada')
        setTimeout(() => router.refresh(), 800)
      } else {
        // ❌ Revertir si falla
        setNotes(previousNotes)
        toast.error(result.error || 'Error al actualizar nota')
      }
    })
  }

  const handleDeleteNote = async (noteId: string) => {
    // ✅ Remover inmediatamente de UI
    const previousNotes = [...notes]
    setNotes(notes.filter((note: any) => note.id !== noteId))
    
    startNoteTransition(async () => {
      const result = await deleteNote(noteId)
      
      if (result.success) {
        toast.success('Nota eliminada')
        setTimeout(() => router.refresh(), 800)
      } else {
        // ❌ Restaurar si falla
        setNotes(previousNotes)
        toast.error(result.error || 'Error al eliminar nota')
      }
    })
  }

  const handleScheduleOnboarding = () => {
    setShowScheduleModal(true)
  }

  const handleDocumentDelete = (documentId: string) => {
    // ✅ Remover inmediatamente de UI
    const previousDocs = [...documents]
    setDocuments(documents.filter((doc: any) => doc.id !== documentId))
    
    startDocumentTransition(async () => {
      const result = await deleteDocument(documentId)
      
      if (result.success) {
        toast.success('Documento eliminado')
        setTimeout(() => router.refresh(), 800)
      } else {
        // ❌ Restaurar si falla
        setDocuments(previousDocs)
        toast.error(result.error || 'Error al eliminar')
      }
    })
  }

  const handleDocumentUpload = async (documentType: string, files: FileList) => {
    if (!files || files.length === 0) return
    
    const file = files[0]
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo no debe superar 5MB')
      return
    }
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('formDriverId', postulacion.id)
    formData.append('documentType', documentType)

    // ✅ Crear documento temporal
    const tempDoc = {
      id: `temp-${Date.now()}`,
      documentType,
      fileName: file.name,
      status: 'PENDING',
      uploadedAt: new Date().toISOString(),
    }
    
    setDocuments([...documents, tempDoc])
    toast.success('Subiendo documento...')

    startDocumentTransition(async () => {
      try {
        const response = await fetch('/api/postulaciones/documents/upload', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (result.success) {
          // ✅ Reemplazar temporal con el real
          setDocuments([...documents.filter((d: { id: string }) => d.id !== tempDoc.id), result.document])
          toast.success(`${file.name} subido`)
          setTimeout(() => router.refresh(), 800)
        } else {
          // ❌ Remover temporal si falla
          setDocuments(documents)
          toast.error(result.error || `Error al subir ${file.name}`)
        }
      } catch (error: any) {
        setDocuments(documents)
        toast.error(error.message || 'Error al subir documento')
      }
    })
  }

  const handleDocumentApprove = (documentId: string) => {
    // ✅ Actualizar estado inmediatamente
    const previousDocs = [...documents]
    setDocuments(documents.map((doc: any) => 
      doc.id === documentId 
        ? { ...doc, status: 'APPROVED', reviewedAt: new Date().toISOString() }
        : doc
    ))
    
    startDocumentTransition(async () => {
      const result = await approveDocument(documentId)
      
      if (result.success) {
        toast.success('Documento aprobado')
        setTimeout(() => router.refresh(), 800)
      } else {
        // ❌ Revertir si falla
        setDocuments(previousDocs)
        toast.error(result.error || 'Error al aprobar')
      }
    })
  }

  const handleDocumentReject = (documentId: string, reason: string) => {
    // ✅ Actualizar estado inmediatamente
    const previousDocs = [...documents]
    setDocuments(documents.map((doc: any) => 
      doc.id === documentId 
        ? { 
            ...doc, 
            status: 'REJECTED', 
            rejectionReason: reason,
            reviewedAt: new Date().toISOString() 
          }
        : doc
    ))
    
    startDocumentTransition(async () => {
      const result = await rejectDocument(documentId, reason)
      
      if (result.success) {
        toast.success('Documento rechazado')
        setTimeout(() => router.refresh(), 800)
      } else {
        // ❌ Revertir si falla
        setDocuments(previousDocs)
        toast.error(result.error || 'Error al rechazar')
      }
    })
  }

  const handleSavePayment = () => {
    // ✅ Actualizar UI inmediatamente
    const previousPayment = postulacion.equipmentPayments?.[0]
    
    setPostulacion({
      ...postulacion,
      equipmentPayments: [{
        ...previousPayment,
        ...paymentData,
        verifiedAt: paymentData.status === 'VERIFIED' 
          ? new Date().toISOString() 
          : previousPayment?.verifiedAt
      }]
    })
    
    setShowPaymentModal(false)
    toast.success('Actualizando pago...')
    
    startPaymentTransition(async () => {
      const result = await updatePayment(postulacion.id, paymentData)
      
      if (result.success) {
        toast.success(result.message)
        setTimeout(() => router.refresh(), 800)
      } else {
        // ❌ Revertir si falla
        setPostulacion({
          ...postulacion,
          equipmentPayments: [previousPayment]
        })
        setShowPaymentModal(true)
        toast.error(result.error || 'Error al actualizar pago')
      }
    })
  }

  const handleRejectPostulacion = () => {
    if (!rejectReason.trim()) {
      toast.error('Debes indicar el motivo del rechazo')
      return
    }
    
    startRejectTransition(async () => {
      // TODO: Implementar server action de rechazo
      toast.info('Función de rechazo en desarrollo')
      setShowRejectModal(false)
      setRejectReason('')
    })
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
              {postulacion.status === 'COMPLETED' ? (
                <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3" />
                  Completada
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {postulacion.currentStep}/6 pasos
                </Badge>
              )}
              
              {postulacion.onboardingStatus && (
                <OnboardingStatusBadge status={postulacion.onboardingStatus} />
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(true)} 
                  className="gap-2 flex-1 sm:flex-none cursor-pointer"
                  disabled={isEditingPending}
                >
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

                <Button 
                  variant="default" 
                  className="gap-2 bg-green-600 hover:bg-green-700 flex-1 sm:flex-none cursor-pointer"
                  onClick={handleScheduleOnboarding}
                  disabled={isEditingPending}
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Agendar Onboarding</span>
                </Button>
                
                <Button 
                  variant="outline"
                  className="gap-2 flex-1 sm:flex-none cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => setShowRejectModal(true)}
                  disabled={isEditingPending}
                >
                  <XCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Rechazar</span>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={handleCancel} 
                  size="sm"
                  variant="outline"
                  disabled={isEditingPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave} 
                  size="sm"
                  disabled={isEditingPending}
                >
                  {isEditingPending ? (
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

        {/* FILA 1: Info Personal + Documentos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <PersonalInfoCard 
            postulacion={postulacion}
            editedData={editedData}
            isEditing={isEditing}
            setEditedData={setEditedData}
          />

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                <FileText className="h-4 w-4" />
                Documentos Adjuntos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <DocumentPreview 
                documents={regularDocuments}
                isEditing={true}
                onDocumentDelete={handleDocumentDelete}
                onDocumentUpload={handleDocumentUpload}
                onDocumentApprove={handleDocumentApprove}
                onDocumentReject={handleDocumentReject}
                isLoading={isDocumentPending}
              />
            </CardContent>
          </Card>
        </div>

        {/* FILA 2: Notas + Pago + Onboarding */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Notas */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                <MessageSquare className="h-4 w-4" />
                Notas Internas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <InternalNotesCard
                notes={notes}
                onAddNote={handleAddNote}
                onEditNote={handleEditNote}
                onDeleteNote={handleDeleteNote}
                isLoading={isNotePending}
              />
            </CardContent>
          </Card>

          {/* Pago */}
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

          {/* Onboarding */}
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
                onSchedule={handleScheduleOnboarding}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Rechazo */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Rechazar Postulación
            </DialogTitle>
            <DialogDescription>
              Estás a punto de rechazar la postulación de {postulacion.fullName}. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                Motivo del rechazo <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ej: Documentación incompleta, no cumple con los requisitos mínimos, etc."
                rows={4}
                disabled={isRejectPending}
              />
              <p className="text-xs text-muted-foreground">
                Este motivo será visible para el conductor y quedará registrado en el sistema.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRejectModal(false)
                setRejectReason('')
              }}
              disabled={isRejectPending}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRejectPostulacion}
              disabled={isRejectPending || !rejectReason.trim()}
            >
              {isRejectPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rechazando...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Confirmar Rechazo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Pago */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gestionar Pago de Equipamiento</DialogTitle>
            <DialogDescription>
              Actualiza la información del pago del conductor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Estado */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Estado del Pago</Label>
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

            {/* Método y Monto en grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Método de Pago</Label>
                <Select 
                  value={paymentData.paymentMethod} 
                  onValueChange={(value) => setPaymentData({ ...paymentData, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POS">POS</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Transferencia</SelectItem>
                    <SelectItem value="CASH">Efectivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Monto (Gs.)</Label>
                <Input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="150000"
                />
              </div>
            </div>

            {/* Comprobante y Factura en grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nro. Comprobante</Label>
                <Input
                  value={paymentData.paymentNumber}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentNumber: e.target.value })}
                  placeholder="123456"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Nro. Factura</Label>
                <Input
                  value={paymentData.invoiceNumber}
                  onChange={(e) => setPaymentData({ ...paymentData, invoiceNumber: e.target.value })}
                  placeholder="001-001-0000123"
                />
              </div>
            </div>

            {/* Notas Admin */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notas Administrativas (Opcional)</Label>
              <Textarea
                value={paymentData.adminNotes}
                onChange={(e) => setPaymentData({ ...paymentData, adminNotes: e.target.value })}
                placeholder="Notas internas sobre el pago..."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Razón de rechazo si está rechazado */}
            {paymentData.status === 'REJECTED' && (
              <div className="space-y-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <Label className="text-sm font-medium text-red-700">
                  Razón de Rechazo <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={paymentData.rejectionReason}
                  onChange={(e) => setPaymentData({ ...paymentData, rejectionReason: e.target.value })}
                  placeholder="Explica por qué se rechazó el pago..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-red-600">
                  Este mensaje será visible para el conductor.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowPaymentModal(false)} 
              disabled={isPaymentPending}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSavePayment} 
              disabled={isPaymentPending}
              className="cursor-pointer"
            >
              {isPaymentPending ? (
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

      {/* Modal de Comprobante de Pago */}
      <Dialog open={showProofPreview} onOpenChange={setShowProofPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Comprobante de Pago</DialogTitle>
          </DialogHeader>
          {postulacion.equipmentPayments?.[0]?.paymentProofUrl && (
            <div className="relative aspect-video">
              <img 
                src={postulacion.equipmentPayments[0].paymentProofUrl} 
                alt="Comprobante de pago"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Onboarding */}
      <ScheduleOnboardingModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        driverId={postulacion.id}
        driverName={postulacion.fullName}
        onSuccess={() => {
          setShowScheduleModal(false)
          router.refresh()
        }}
      />
    </div>
  )
}