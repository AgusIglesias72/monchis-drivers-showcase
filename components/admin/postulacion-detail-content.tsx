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
import {
  updatePostulacion,
  updatePayment,
  createNote,
  approveDocument,
  rejectDocument,
  deleteDocument,
  uploadDocument,
} from "@/lib/actions/postulacion.actions"
import { OnboardingStatusBadge } from "./postulaciones-table-expandable"

interface PostulacionDetailContentProps {
  postulacion: any
}

export function PostulacionDetailContent({ postulacion }: PostulacionDetailContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState(postulacion)
  const [newNote, setNewNote] = useState('')
  const [notes, setNotes] = useState(postulacion.notes || [])
  const [documents, setDocuments] = useState(postulacion.documents || [])
  
  // Filtrar documentos
  const regularDocuments = documents.filter((doc: any) => doc.documentType !== 'PAYMENT_PROOF')
  
  // Modal de pago
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
  
  // Preview de comprobante
  const [showProofPreview, setShowProofPreview] = useState(false)
  
  // Modal de onboarding
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  
  const isAlreadyScheduled = postulacion.onboardingStatus === 'SCHEDULED' || 
                             postulacion.onboardingStatus === 'COMPLETED' ||
                             postulacion.onboardingStatus === 'IN_PROGRESS'

  // ============ HANDLERS ============

  const handleSave = () => {
    startTransition(async () => {
      const result = await updatePostulacion(postulacion.id, editedData)
      
      if (result.success) {
        toast.success(result.message)
        setIsEditing(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Error al guardar')
      }
    })
  }

  const handleCancel = () => {
    setEditedData(postulacion)
    setIsEditing(false)
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return
    
    startTransition(async () => {
      const result = await createNote(postulacion.id, newNote)
      
      if (result.success) {
        setNotes([result.note, ...notes])
        setNewNote('')
        toast.success('Nota añadida')
      } else {
        toast.error(result.error || 'Error al guardar nota')
      }
    })
  }

  const handleScheduleOnboarding = () => {
    setShowScheduleModal(true)
  }

  const handleDocumentDelete = (documentId: string) => {
    if (!confirm('¿Eliminar este documento?')) return
    
    startTransition(async () => {
      const result = await deleteDocument(documentId)
      
      if (result.success) {
        setDocuments(documents.filter((doc: any) => doc.id !== documentId))
        toast.success('Documento eliminado')
        router.refresh()
      } else {
        toast.error(result.error || 'Error al eliminar')
      }
    })
  }

  const handleDocumentUpload = async (documentType: string, files: FileList) => {
    if (!files || files.length === 0) return
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('file', file)
      formData.append('formDriverId', postulacion.id)
      formData.append('documentType', documentType)

      startTransition(async () => {
        const result = await uploadDocument(formData)
        
        if (result.success) {
          setDocuments([...documents, result.document])
          toast.success(`${file.name} subido`)
        } else {
          toast.error(result.error || `Error al subir ${file.name}`)
        }
      })
    }
    
    router.refresh()
  }

  const handleDocumentApprove = (documentId: string) => {
    startTransition(async () => {
      const result = await approveDocument(documentId)
      
      if (result.success) {
        setDocuments(documents.map((doc: any) => 
          doc.id === documentId ? result.document : doc
        ))
        toast.success('Documento aprobado')
        router.refresh()
      } else {
        toast.error(result.error || 'Error al aprobar')
      }
    })
  }

  const handleDocumentReject = (documentId: string, reason: string) => {
    startTransition(async () => {
      const result = await rejectDocument(documentId, reason)
      
      if (result.success) {
        setDocuments(documents.map((doc: any) => 
          doc.id === documentId ? result.document : doc
        ))
        toast.success('Documento rechazado')
        router.refresh()
      } else {
        toast.error(result.error || 'Error al rechazar')
      }
    })
  }

  const handleSavePayment = () => {
    startTransition(async () => {
      const result = await updatePayment(postulacion.id, paymentData)
      
      if (result.success) {
        toast.success(result.message)
        setShowPaymentModal(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Error al actualizar pago')
      }
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
              {/* Badge de progreso/estado */}
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
              
              {/* Badge de Onboarding */}
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
                  disabled={isPending}
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

                {isAlreadyScheduled ? (
                  <Button 
                    variant="default" 
                    className="gap-2 bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none cursor-pointer"
                    onClick={() => router.push(`/admin/onboarding/${postulacion.id}`)}
                    disabled={isPending}
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">Ver Onboarding</span>
                  </Button>
                ) : (
                  <Button 
                    variant="default" 
                    className="gap-2 bg-green-600 hover:bg-green-700 flex-1 sm:flex-none cursor-pointer"
                    onClick={handleScheduleOnboarding}
                    disabled={isPending}
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">Agendar Onboarding</span>
                  </Button>
                )}
                
                {/* Botón Rechazar */}
                <Button 
                  variant="outline"
                  className="gap-2 flex-1 sm:flex-none cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => handleDocumentReject(postulacion.id, 'Rechazado por el administrador')}
                  disabled={isPending}
                >
                  <XCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Rechazar</span>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCancel} 
                  className="gap-2 flex-1 sm:flex-none cursor-pointer"
                  disabled={isPending}
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button 
                  variant="default" 
                  onClick={handleSave} 
                  className="gap-2 flex-1 sm:flex-none cursor-pointer"
                  disabled={isPending}
                >
                  {isPending ? (
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
                isLoading={isPending}
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
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notes.map((note: any) => (
                  <div key={note.id} className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-xs">{note.content}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      <span>{note.createdByUser?.firstName || note.createdByUser?.fullName || 'Admin'}</span>
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
                  disabled={isPending}
                />
                <Button 
                  onClick={handleAddNote} 
                  size="sm"   
                  className="w-full h-8 cursor-pointer"
                  disabled={!newNote.trim() || isPending}
                >
                  {isPending ? (
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
                onSchedule={() => setShowScheduleModal(true)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
              <Clock className="h-4 w-4" />
              Historial del Proceso
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative">
              <div className="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-muted" />
              <div 
                className="hidden md:block absolute top-6 left-0 h-0.5 bg-primary transition-all duration-500"
                style={{ 
                  width: `${((postulacion.completedSteps.length - 1) / (postulacion.timeline.length - 1)) * 100}%` 
                }}
              />
              
              <div className="md:hidden absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />
              <div 
                className="md:hidden absolute left-6 top-0 w-0.5 bg-primary transition-all duration-500"
                style={{ 
                  height: `${((postulacion.completedSteps.length - 1) / (postulacion.timeline.length - 1)) * 100}%` 
                }}
              />
              
              <div className="relative grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-2">
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
      
      {/* Modales */}
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
      
      {/* Modal de Pago */}
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
                  disabled={isPending}
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
                  disabled={isPending}
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
                  disabled={isPending}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentNumber">Nro. Comprobante</Label>
                <Input
                  id="paymentNumber"
                  value={paymentData.paymentNumber}
                  onChange={(e) => setPaymentData({...paymentData, paymentNumber: e.target.value})}
                  placeholder="Últimos 6 dígitos"
                  disabled={isPending}
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
                disabled={isPending}
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
                disabled={isPending}
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
                  disabled={isPending}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowPaymentModal(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSavePayment} 
              disabled={isPending}
            >
              {isPending ? (
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
      
      {/* Modal de Comprobante */}
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