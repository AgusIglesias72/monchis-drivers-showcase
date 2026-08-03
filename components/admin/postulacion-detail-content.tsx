// components/admin/postulacion-detail-content.tsx
"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  MessageSquare,
  Loader2,
  CreditCard,
  Calendar,
  Download,
} from "lucide-react"
import { DocumentPreview } from "@/components/admin/document-preview"
import { ManageOnboardingModalClient as ManageOnboardingModal } from "@/components/admin/manage-onboarding-modal-client"
import { PersonalInfoCard } from "@/components/admin/personal-info-card"
import { InternalNotesCard } from "@/components/admin/internal-notes-card"
import { WhatsAppMessagesHistory } from "@/components/admin/whatsapp-messages-history"
import {
  PaymentSection,
  OnboardingSection,
} from "@/components/admin/postulacion-helpers"
import { AgentRunSummaryCard } from "@/components/admin/agent-runs/agent-run-summary-card"
import { DetailHeader } from "@/components/admin/postulacion-detail/detail-header"
import { DetailTabsBar, useDetailTab } from "@/components/admin/postulacion-detail/detail-tabs"
import { getContactStatus } from "@/lib/utils/contact-status.utils"
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

interface PostulacionDetailContentProps {
  postulacion: any
}

export function PostulacionDetailContent({ postulacion: initialPostulacion }: PostulacionDetailContentProps) {
  const router = useRouter()

  // ✅ Usar un key basado en los datos de onboarding para forzar re-render
  const onboardingKey = JSON.stringify(initialPostulacion.onboardingAttendances)

  const [postulacion, setPostulacion] = useState(initialPostulacion)

  // ✅ Sincronizar cuando cambian los datos de onboarding
  useEffect(() => {
    setPostulacion(initialPostulacion)
  }, [onboardingKey, initialPostulacion])

  const [tab, setTab] = useDetailTab()

  const [isEditingPending, startEditingTransition] = useTransition()
  const [isNotePending, startNoteTransition] = useTransition()
  const [isDocumentPending, startDocumentTransition] = useTransition()
  const [isPaymentPending, startPaymentTransition] = useTransition()

  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState(postulacion)
  const [notes, setNotes] = useState(postulacion.notes || [])
  const [documents, setDocuments] = useState(postulacion.documents || [])

  const regularDocuments = documents.filter((doc: any) => doc.documentType !== 'PAYMENT_PROOF')

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showProofModal, setShowProofModal] = useState(false)
  const [uploadingProof, setUploadingProof] = useState(false)

  const [paymentData, setPaymentData] = useState({
    paymentMethod: postulacion.equipmentPayments?.[0]?.paymentMethod || '',
    paymentNumber: postulacion.equipmentPayments?.[0]?.paymentNumber || '',
    invoiceNumber: postulacion.equipmentPayments?.[0]?.invoiceNumber || '',
    amount: postulacion.equipmentPayments?.[0]?.amount || '',
    status: postulacion.equipmentPayments?.[0]?.status || 'PENDING',
    adminNotes: postulacion.equipmentPayments?.[0]?.adminNotes || '',
    rejectionReason: postulacion.equipmentPayments?.[0]?.rejectionReason || '',
  })

  const hasScheduledOnboarding = postulacion.onboardingAttendances?.some(
    (attendance: any) => ['INVITED', 'CONFIRMED', 'SCHEDULED'].includes(attendance.status)
  )

  // ✅ Calcular el onboarding actual y eventos disponibles
  const currentOnboarding = postulacion.onboardingAttendances?.find(
    (attendance: any) => ['INVITED', 'CONFIRMED', 'SCHEDULED'].includes(attendance.status)
  ) || null

  // Los eventos disponibles vendrán desde el servidor en la página
  const availableEvents = postulacion.availableOnboardingEvents || []

  // ✅ Calcular estado de contacto
  const contactStatus = getContactStatus(
    postulacion.status === 'REJECTED',
    postulacion.hasBeenContacted || false,
    postulacion.completedSteps?.length || 0
  )

  const handleEditStart = () => {
    setIsEditing(true)
    if (tab !== 'ficha') setTab('ficha')
  }

  const handleSave = () => {
    const updatedPostulacion = { ...postulacion, ...editedData }
    setPostulacion(updatedPostulacion)
    setIsEditing(false)
    toast.success('Guardando cambios...')

    startEditingTransition(async () => {
      const result = await updatePostulacion(postulacion.id, editedData)

      if (result.success) {
        toast.success(result.message)
        setTimeout(() => router.refresh(), 800)
      } else {
        setPostulacion(postulacion)
        setEditedData(postulacion)
        setIsEditing(true)
        setTab('ficha')
        toast.error(result.error || 'Error al guardar')
      }
    })
  }

  const handleCancel = () => {
    setEditedData(postulacion)
    setIsEditing(false)
  }

  const handleAddNote = async (content: string) => {
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

    setNotes([tempNote, ...notes])
    toast.success('Añadiendo nota...')

    startNoteTransition(async () => {
      const result = await createNote(postulacion.id, content)

      if (result.success) {
        setNotes([result.note, ...notes])
        toast.success('Nota añadida')
        setTimeout(() => router.refresh(), 800)
      } else {
        setNotes(notes)
        toast.error(result.error || 'Error al guardar nota')
      }
    })
  }

  const handleEditNote = async (noteId: string, content: string) => {
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
        setNotes(previousNotes)
        toast.error(result.error || 'Error al actualizar nota')
      }
    })
  }

  const handleDeleteNote = async (noteId: string) => {
    const previousNotes = [...notes]
    setNotes(notes.filter((note: any) => note.id !== noteId))

    startNoteTransition(async () => {
      const result = await deleteNote(noteId)

      if (result.success) {
        toast.success('Nota eliminada')
        setTimeout(() => router.refresh(), 800)
      } else {
        setNotes(previousNotes)
        toast.error(result.error || 'Error al eliminar nota')
      }
    })
  }

  const handleScheduleOnboarding = () => {
    setShowScheduleModal(true)
  }

  const handleModalSuccess = (action?: 'cancel' | 'assign' | 'reassign') => {
    // ✅ NO mostrar toast aquí, el modal ya lo mostró

    if (action === 'cancel') {
      // Si se canceló, limpiar el onboarding inmediatamente
      setPostulacion({
        ...postulacion,
        onboardingAttendances: [],
        onboardingStatus: null,
        onboardingScheduledAt: null
      })
    }

    // Siempre hacer refresh para sincronizar con el servidor
    // El useEffect se encargará de actualizar el estado cuando lleguen los nuevos datos
    setTimeout(() => router.refresh(), 100)
  }

  const handleDocumentDelete = (documentId: string) => {
    const previousDocs = [...documents]
    setDocuments(documents.filter((doc: any) => doc.id !== documentId))

    startDocumentTransition(async () => {
      const result = await deleteDocument(documentId)

      if (result.success) {
        toast.success('Documento eliminado')
        setTimeout(() => router.refresh(), 800)
      } else {
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
          setDocuments([...documents.filter((d: { id: string }) => d.id !== tempDoc.id), result.document])
          toast.success(`${file.name} subido`)
          setTimeout(() => router.refresh(), 800)
        } else {
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
        setDocuments(previousDocs)
        toast.error(result.error || 'Error al aprobar')
      }
    })
  }

  const handleDocumentReject = (documentId: string, reason: string) => {
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
        setDocuments(previousDocs)
        toast.error(result.error || 'Error al rechazar')
      }
    })
  }

  const handleSavePayment = () => {
    const previousPayment = postulacion.equipmentPayments?.[0]

    setPostulacion({
      ...postulacion,
      equipmentPayments: [{
        ...previousPayment,
        ...paymentData,
        verifiedAt: paymentData.status === 'VERIFIED'
          ? new Date().toISOString()
          : null
      }]
    })

    setShowPaymentModal(false)
    toast.success('Guardando pago...')

    startPaymentTransition(async () => {
      const result = await updatePayment(postulacion.id, paymentData)

      if (result.success) {
        toast.success('Pago actualizado')
        setTimeout(() => router.refresh(), 800)
      } else {
        setPostulacion(postulacion)
        toast.error(result.error || 'Error al guardar')
      }
    })
  }

  // ==================== HANDLER PARA SUBIR COMPROBANTE ====================
  const handleUploadPaymentProof = async (file: File) => {
    setUploadingProof(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('paymentId', postulacion.equipmentPayments[0].id)

      const response = await fetch('/api/postulaciones/payments/upload-proof', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Comprobante subido exitosamente')

        // Actualizar estado local optimísticamente
        setPostulacion({
          ...postulacion,
          equipmentPayments: [{
            ...postulacion.equipmentPayments[0],
            paymentProofUrl: result.proofUrl
          }]
        })

        // Refresh para sincronizar con servidor
        setTimeout(() => router.refresh(), 500)
      } else {
        toast.error(result.error || 'Error al subir comprobante')
      }
    } catch (error: any) {
      console.error('Error al subir comprobante:', error)
      toast.error('Error al subir el comprobante')
    } finally {
      setUploadingProof(false)
    }
  }

  // ==================== HANDLER PARA VER COMPROBANTE ====================
  const handleViewPaymentProof = () => {
    const proofUrl = postulacion.equipmentPayments[0]?.paymentProofUrl
    if (proofUrl) {
      setShowProofModal(true)
    }
  }

  // ==================== HANDLER ÉXITO PARA REFRESH ====================
  const handleActionSuccess = () => {
    router.refresh()
  }

  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader
        breadcrumbs={[
          { label: "Postulaciones", href: "/admin/postulaciones" },
          { label: postulacion.fullName }
        ]}
      />

      <div className="flex-1 p-4 md:p-8 space-y-4">
        <DetailHeader
          postulacion={postulacion}
          contactStatus={contactStatus}
          hasScheduledOnboarding={hasScheduledOnboarding}
          isEditing={isEditing}
          isSaving={isEditingPending}
          onEditStart={handleEditStart}
          onEditSave={handleSave}
          onEditCancel={handleCancel}
          onScheduleOnboarding={handleScheduleOnboarding}
          onActionSuccess={handleActionSuccess}
        />

        {/* Card del agente IA: visible siempre que haya un AgentRun.
            Muestra decisión, summary, conteo de acciones y un click-through al
            sheet con el razonamiento completo. */}
        {postulacion.agentRuns?.[0] && (
          <AgentRunSummaryCard
            run={postulacion.agentRuns[0]}
            driverName={postulacion.fullName || 'Driver'}
            cedula={postulacion.cedula}
          />
        )}

        <DetailTabsBar
          value={tab}
          onChange={setTab}
          counts={{
            documentos: regularDocuments.length,
            actividad: notes.length + (postulacion.whatsappMessagesSent?.length || 0),
          }}
        />

        <section hidden={tab !== 'ficha'} aria-label="Ficha">
          <PersonalInfoCard
            postulacion={postulacion}
            editedData={editedData}
            isEditing={isEditing}
            setEditedData={setEditedData}
          />
        </section>

        <section hidden={tab !== 'documentos'} aria-label="Documentos">
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
                driverId={postulacion.id}
                rucInactiveWaived={postulacion.rucInactiveWaived}
                rucInactiveWaivedAt={postulacion.rucInactiveWaivedAt}
                rucInactiveWaivedNote={postulacion.rucInactiveWaivedNote}
                onWaiveChange={() => router.refresh()}
              />
            </CardContent>
          </Card>
        </section>

        <section hidden={tab !== 'capacitacion'} aria-label="Capacitación y pago">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start">
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                  <Calendar className="h-4 w-4" />
                  Onboarding
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pago de Equipamiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentSection
                  payment={postulacion.equipmentPayments?.[0]}
                  postulacionId={postulacion.id}
                  onManage={() => setShowPaymentModal(true)}
                  onViewProof={handleViewPaymentProof}
                  onUploadProof={handleUploadPaymentProof}
                />
              </CardContent>
            </Card>
          </div>
        </section>

        <section hidden={tab !== 'actividad'} aria-label="Actividad">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start">
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

            <WhatsAppMessagesHistory messages={postulacion.whatsappMessagesSent || []} />
          </div>
        </section>
      </div>

      <ManageOnboardingModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        driverId={postulacion.id}
        driverName={postulacion.fullName || 'Driver'}
        currentOnboarding={currentOnboarding}
        availableEvents={availableEvents}
        onSuccess={handleModalSuccess}
      />

      {showProofModal && postulacion.equipmentPayments[0]?.paymentProofUrl && (
        <Dialog open={showProofModal} onOpenChange={setShowProofModal}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Comprobante de Pago</DialogTitle>
            </DialogHeader>

            <div className="overflow-auto">
              {postulacion.equipmentPayments[0].paymentProofUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={postulacion.equipmentPayments[0].paymentProofUrl}
                  className="w-full h-[70vh]"
                  title="Comprobante de Pago"
                />
              ) : (
                <Image
                  src={postulacion.equipmentPayments[0].paymentProofUrl}
                  alt="Comprobante de Pago"
                  width={800}
                  height={600}
                  className="w-full h-auto"
                />
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(postulacion.equipmentPayments[0].paymentProofUrl, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
              <Button onClick={() => setShowProofModal(false)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

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
    </div>
  )
}
