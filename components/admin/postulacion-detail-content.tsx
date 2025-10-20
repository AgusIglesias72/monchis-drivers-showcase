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
  User,
  MapPin,
  Phone,
  Mail,
  Bike,
  FileText,
  Clock,
  MessageSquare,
  Edit,
  Save,
  X,
  CheckCircle,
  XCircle,
  Bot,
  AlertCircle,
  Loader2,
  CreditCard,
  Eye,
  Plus,
  Calendar,
} from "lucide-react"
import { DocumentPreview } from "@/components/admin/document-preview"
import { ContactActions } from "@/components/admin/contact-actions"
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
  const paymentProofDocument = documents.find((doc: any) => doc.documentType === 'PAYMENT_PROOF')
  
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

  const handleApprove = () => {
    console.log('Aprobando postulación')
    toast.success('Postulación aprobada')
  }

  const handleReject = () => {
    console.log('Rechazando postulación')
    toast.error('Postulación rechazada')
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

                <Button 
                  variant="default" 
                  className="gap-2 bg-green-600 hover:bg-green-700 flex-1 sm:flex-none cursor-pointer"
                  title="Aprobar postulación"
                  onClick={handleApprove}
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Aprobar</span>
                </Button>
                <Button variant="destructive" className="gap-2 flex-1 sm:flex-none cursor-pointer" onClick={handleReject} title="Rechazar postulación">
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
          
          {/* Información Personal COMPLETA */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                  <User className="h-4 w-4" />
                  Información Personal
                </CardTitle>
                <ContactActions 
                  phoneNumber={postulacion.phoneNumber}
                  email={postulacion.email}
                  name={postulacion.fullName}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Datos Básicos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">            
                <EditableField 
                  label="Fecha de Nacimiento" 
                  value={editedData.birthDate} 
                  isEditing={isEditing} 
                  onChange={(v) => setEditedData({...editedData, birthDate: v})} 
                />
                <EditableField 
                  label="Teléfono" 
                  value={editedData.phoneNumber} 
                  icon={<Phone className="h-3 w-3" />} 
                  isEditing={isEditing} 
                  onChange={(v) => setEditedData({...editedData, phoneNumber: v})} 
                />
                <EditableField 
                  label="Email" 
                  value={editedData.email} 
                  icon={<Mail className="h-3 w-3" />} 
                  isEditing={isEditing} 
                  onChange={(v) => setEditedData({...editedData, email: v})} 
                />
              </div>

              {/* Ubicación */}
              <div className="border-t pt-3">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                  <MapPin className="h-3 w-3" />
                  UBICACIÓN
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 pt-2">
                  <EditableField 
                    label="Departamento" 
                    value={editedData.department} 
                    isEditing={isEditing} 
                    onChange={(v) => setEditedData({...editedData, department: v})} 
                  />
                  <EditableField 
                    label="Ciudad" 
                    value={editedData.city} 
                    isEditing={isEditing} 
                    onChange={(v) => setEditedData({...editedData, city: v})} 
                  />
                  <EditableField 
                    label="Dirección" 
                    value={editedData.address} 
                    isEditing={isEditing} 
                    onChange={(v) => setEditedData({...editedData, address: v})} 
                  />
                </div>
              </div>

              {/* Contacto de Emergencia */}
              {postulacion.emergencyName && (
                <div className="border-t pt-3">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                    <AlertCircle className="h-3 w-3" />
                    CONTACTO DE EMERGENCIA
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 pt-2">
                    <EditableField 
                      label="Nombre" 
                      value={editedData.emergencyName} 
                      isEditing={isEditing} 
                      onChange={(v) => setEditedData({...editedData, emergencyName: v})} 
                    />
                    <EditableField 
                      label="Relación" 
                      value={editedData.emergencyRelationship} 
                      isEditing={isEditing} 
                      onChange={(v) => setEditedData({...editedData, emergencyRelationship: v})} 
                    />
                    <EditableField 
                      label="Teléfono" 
                      value={editedData.emergencyPhone} 
                      icon={<Phone className="h-3 w-3" />} 
                      isEditing={isEditing} 
                      onChange={(v) => setEditedData({...editedData, emergencyPhone: v})} 
                    />
                  </div>
                </div>
              )}

              {/* Zonas y Referencia */}
              <div className="border-t pt-3">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                  <Bike className="h-3 w-3" />
                  TRABAJO
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2 pb-2">
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground block mb-1.5">Zonas de Trabajo</span>
                    <div className="flex flex-wrap gap-1.5">
                      {editedData.workZone?.split(',').map((zone: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs py-0 px-2">
                          {zone}
                        </Badge>
                      ))}
                    </div>
                    <InfoField label="¿Cómo se enteró?" value={postulacion.howHeardAboutUs} />
                    {postulacion.referredBy && (
                      <InfoField label="Referido por" value={postulacion.referredBy} />
                    )}
                  </div>
                  {editedData.hasVehicle && (
                  <div className="">
                    <span className="text-xs text-muted-foreground block mb-2">Vehículo</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2">
                      <InfoField label="Marca" value={editedData.vehicleBrand} />
                      <InfoField label="Modelo" value={editedData.vehicleModel} />
                      <InfoField label="Año" value={editedData.vehicleYear} />
                      <InfoField label="Placa" value={editedData.vehiclePlate} />
                    </div>
                  </div>
                )}
                </div>



                {/* Disponibilidad */}
                <div className="pt-2 border-t">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                    <Calendar className="h-3 w-3" />
                    DISPONIBILIDAD
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    <InfoField label="Experiencia" value={postulacion.experience} />
                    <InfoField label="Horarios" value={postulacion.availability?.join(', ')} />
                    <InfoField label="Puede empezar" value={postulacion.whenCanStart} />
                  </div>
                </div>
              </div>

              {/* Servicios Financieros - Movido de Info Personal */}
              <div className="border-t pt-3">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                  <CreditCard className="h-3 w-3" />
                  SERVICIOS FINANCIEROS
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-6 gap-y-3 pt-2">
                  <InfoField label="Cuenta Ueno" value={postulacion.hasUenoAccount === 'si' ? 'Sí' : 'No'} />
                  {postulacion.hasUenoAccount === 'si' && postulacion.uenoAccountNumber && (
                  <div className="">
                    <InfoField label="Nro. Cuenta Ueno" value={postulacion.uenoAccountNumber} />
                  </div>
                )}
                  <InfoField label="Puede facturar" value={postulacion.canInvoice === 'si' ? 'Sí' : 'No'} />
                  {postulacion.financialService?.interestedInConto && (
                  <div className="">
                    <InfoField label="Interés en Conto" value="Interesado" />
                  </div>
                )}
                </div>
               
              </div>
            </CardContent>
          </Card>

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
            <CardContent className="space-y-3 pt-4 jus">
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

// ==================== COMPONENTES AUXILIARES ====================

function StatusBadge({ status }: { status: string }) {
  const config = {
    COMPLETED: { label: 'Completada', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
    IN_PROGRESS: { label: 'En Progreso', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
    ABANDONED: { label: 'Abandonada', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  }
  const { label, className } = config[status as keyof typeof config] || config.IN_PROGRESS
  return <Badge className={className}>{label}</Badge>
}

function DocumentsStatusBadge({ status }: { status: string }) {
  const config = {
    INCOMPLETE: { label: 'Incompleto', className: 'bg-gray-100 text-gray-800 border-gray-200' },
    PENDING: { label: 'Pendiente Revisión', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    IN_REVIEW: { label: 'En Revisión', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    CORRECTIONS: { label: 'Requiere Correcciones', className: 'bg-red-100 text-red-800 border-red-200' },
    APPROVED: { label: 'Aprobado', className: 'bg-green-100 text-green-800 border-green-200' },
  }
  const { label, className } = config[status as keyof typeof config] || config.INCOMPLETE
  return <Badge variant="outline" className={className}>{label}</Badge>
}

function EditableField({ 
  label, 
  value, 
  icon, 
  isEditing, 
  onChange,
  className = ""
}: { 
  label: string; 
  value: any; 
  icon?: React.ReactNode; 
  isEditing: boolean; 
  onChange: (value: string) => void; 
  className?: string 
}) {
  const displayValue = label === "Fecha de Nacimiento" && value && !isEditing ? value : value;

  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground mb-1">{label}</Label>
      {isEditing ? (
        <Input 
          type="text" 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)} 
          className="h-8 text-xs"
          placeholder={label === "Fecha de Nacimiento" ? "dd/mm/yyyy" : ""}
        />
      ) : (
        <div className="flex items-center gap-1.5 min-h-[32px]">
          {icon}
          <span className="text-xs font-medium">{displayValue || '-'}</span>
        </div>
      )}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-0.5">{label}</label>
      <span className="font-medium text-xs">{value || '-'}</span>
    </div>
  )
}

function PaymentSection({ payment, postulacionId, onManage, onViewProof }: { 
  payment: any; 
  postulacionId: string;
  onManage: () => void;
  onViewProof: () => void;
}) {
  if (!payment) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground italic mb-3">Sin información de pago registrada</p>
        <Button size="sm" variant="outline" className="w-full" onClick={onManage}>
          <Plus className="h-4 w-4 mr-2" />
          Registrar Pago
        </Button>
      </div>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const config = {
      VERIFIED: { label: 'Verificado', variant: 'default' as const },
      PENDING: { label: 'Pendiente', variant: 'secondary' as const },
      REJECTED: { label: 'Rechazado', variant: 'destructive' as const },
      PARTIAL: { label: 'Parcial', variant: 'secondary' as const },
    }
    const { label, variant} = config[status as keyof typeof config] || config.PENDING
    return <Badge variant={variant} className="text-xs">{label}</Badge>
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <InfoField label="Método" value={payment.paymentMethod || 'Sin especificar'} />
        <div>
          <label className="text-xs text-muted-foreground block mb-0.5">Estado</label>
          {getPaymentStatusBadge(payment.status)}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {payment.amount && (
          <InfoField label="Monto" value={`${payment.amount.toLocaleString('es-PY')} Gs`} />
        )}
        {payment.paymentNumber && (
          <InfoField label="Nro. Comprobante" value={payment.paymentNumber} />
        )}
      </div>
      
      {payment.invoiceNumber ? (
        <InfoField label="Nro. Factura" value={payment.invoiceNumber} />
      ) : (
        <div>
          <label className="text-xs text-muted-foreground block mb-0.5">Nro. Factura</label>
          <Badge variant="outline" className="text-xs">Pendiente</Badge>
        </div>
      )}
      
      {/* Comprobante de Pago */}
      {payment.paymentProofUrl && (
        <div className="pt-2 border-t">
          <Button size="sm" variant="outline" className="w-full" onClick={onViewProof}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Comprobante
          </Button>
        </div>
      )}
      
      {/* Notas administrativas si existen */}
      {payment.adminNotes && (
        <div className="pt-2 border-t">
          <label className="text-xs text-muted-foreground block mb-1">Notas Admin</label>
          <p className="text-xs bg-muted/50 p-2 rounded">{payment.adminNotes}</p>
        </div>
      )}
      
      {/* Razón de rechazo si existe */}
      {payment.rejectionReason && (
        <div className="pt-2 border-t">
          <label className="text-xs text-muted-foreground block mb-1">Razón de Rechazo</label>
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{payment.rejectionReason}</p>
        </div>
      )}
      
      <Button size="sm" className="w-full mt-2" onClick={onManage}>
        <Edit className="h-4 w-4 mr-2" />
        Gestionar Pago
      </Button>
    </div>
  )
}

function OnboardingSection({ attendance, status, postulacionId }: { attendance: any; status: string; postulacionId: string }) {
  const getOnboardingStatusBadge = (status: string) => {
    const config = {
      ATTENDED: { label: 'Asistió', variant: 'default' as const },
      CONFIRMED: { label: 'Confirmado', variant: 'secondary' as const },
      INVITED: { label: 'Invitado', variant: 'outline' as const },
      NO_SHOW: { label: 'No Asistió', variant: 'destructive' as const },
      CANCELLED: { label: 'Cancelado', variant: 'destructive' as const },
      RESCHEDULED: { label: 'Reagendado', variant: 'secondary' as const },
      // Estados del FormDriver
      NOT_READY: { label: 'No Listo', variant: 'destructive' as const },
      READY: { label: 'Listo', variant: 'outline' as const },
      SCHEDULED: { label: 'Agendado', variant: 'secondary' as const },
      COMPLETED: { label: 'Completado', variant: 'default' as const },
      IN_PROGRESS: { label: 'En Curso', variant: 'secondary' as const },
    }
    const { label, variant } = config[status as keyof typeof config] || { label: 'N/A', variant: 'outline' as const }
    return <Badge variant={variant} className="text-xs">{label}</Badge>
  }

  return (
    <div className="space-y-3 text-sm">
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Estado</label>
        {getOnboardingStatusBadge(attendance?.status || status || 'NOT_READY')}
      </div>
      {attendance?.event ? (
        <>
          <InfoField 
            label="Fecha" 
            value={new Date(attendance.event.scheduledDate).toLocaleDateString('es-PY')} 
          />
          {attendance.event.location && (
            <InfoField label="Ubicación" value={attendance.event.location} />
          )}
          {attendance.event.startTime && (
            <InfoField label="Hora" value={attendance.event.startTime} />
          )}
          {attendance.event.title && (
            <div className="pt-2 border-t">
              <InfoField label="Evento" value={attendance.event.title} />
            </div>
          )}
          {attendance.attendeeNotes && (
            <div className="pt-2 border-t">
              <InfoField label="Notas" value={attendance.attendeeNotes} />
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground italic">No agendado</p>
      )}
      <Button size="sm" variant="outline" className="w-full mt-2">
        <Calendar className="h-4 w-4 mr-2" />
        {attendance ? 'Reagendar' : 'Agendar'} Capacitación
      </Button>
    </div>
  )
}