// components/admin/postulacion-detail-content.tsx
"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  MessageCircle,
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
  Download,
  Phone,
  MoreVertical,
  ExternalLink,
  Copy,
} from "lucide-react"
import { DocumentPreview } from "@/components/admin/document-preview"
import { ManageOnboardingModal } from "@/components/admin/manage-onboarding-modal"
import { PersonalInfoCard } from "@/components/admin/personal-info-card"
import { InternalNotesCard } from "@/components/admin/internal-notes-card"
import { WhatsAppMessagesHistory } from "@/components/admin/whatsapp-messages-history"
import {
  PaymentSection,
  OnboardingSection,
  StatusBadges
} from "@/components/admin/postulacion-helpers"
import { ContactButton } from "@/components/admin/postulaciones/contact-button"
import { RejectButton } from "@/components/admin/postulaciones/reject-button"
import { SendOnboardingListButton } from "@/components/admin/send-onboarding-list-button"
import { SendOnboardingReminderButton } from "@/components/admin/send-onboarding-reminder-button"
import { TriggerManychatFlowButton } from "@/components/admin/trigger-manychat-flow-button"
import { LinkManychatSubscriberButton } from "@/components/admin/link-manychat-subscriber-button"
import { AgentRunSummaryCard } from "@/components/admin/agent-runs/agent-run-summary-card"
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
  updateDocumentType,
} from "@/lib/actions/postulacion.actions"
import { AssistedCompletionButton } from "./postulaciones/assisted-completion-button"
import { RefreshRucButton } from "./postulaciones/refresh-ruc-button"
import { RunAgentButton } from "./postulaciones/run-agent-button"
import { AgentRunBadge } from "./agent-runs/agent-run-badge"
import { DropdownMenu, DropdownMenuItem, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator } from "../ui/dropdown-menu"

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

  const [isEditingPending, startEditingTransition] = useTransition()
  const [isNotePending, startNoteTransition] = useTransition()
  const [isDocumentPending, startDocumentTransition] = useTransition()
  const [isPaymentPending, startPaymentTransition] = useTransition()
  const [isRejectPending, startRejectTransition] = useTransition()

  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState(postulacion)
  const [notes, setNotes] = useState(postulacion.notes || [])
  const [documents, setDocuments] = useState(postulacion.documents || [])

  const regularDocuments = documents.filter((doc: any) => doc.documentType !== 'PAYMENT_PROOF')

  // Verificar si tiene documentos de identidad pendientes
  const hasIdentityDocs = documents.some((doc: any) =>
    doc.documentType === 'CEDULA' &&
    doc.status === 'PENDING'
  ) && documents.some((doc: any) =>
    doc.documentType === 'CRIMINAL_RECORD' &&
    doc.status === 'PENDING'
  )

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showProofPreview, setShowProofPreview] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
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

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Debes indicar el motivo del rechazo')
      return
    }

    setPostulacion({
      ...postulacion,
      status: 'REJECTED'
    })

    setShowRejectModal(false)
    toast.success('Rechazando postulación...')

    startRejectTransition(async () => {
      const result = await updatePostulacion(postulacion.id, {
        status: 'REJECTED',
        rejectionReason: rejectReason
      })

      if (result.success) {
        toast.success('Postulación rechazada')
        setTimeout(() => router.refresh(), 800)
      } else {
        setPostulacion(postulacion)
        toast.error(result.error || 'Error al rechazar')
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

      <div className="flex-1 p-4 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {postulacion.fullName}
              </h1>
              {postulacion.agentRuns?.[0] && (
                <AgentRunBadge
                  driverName={postulacion.fullName || 'Driver'}
                  cedula={postulacion.cedula}
                  run={{
                    ...postulacion.agentRuns[0],
                    createdAt:
                      postulacion.agentRuns[0].createdAt instanceof Date
                        ? postulacion.agentRuns[0].createdAt.toISOString()
                        : postulacion.agentRuns[0].createdAt,
                  }}
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>CI: {postulacion.cedula}</span>
              <span>•</span>
              <span>Postulación iniciada el {new Date(postulacion.startedAt).toLocaleDateString('es-PY')}</span>
            </div>

            {/* Badges de estado */}
            <StatusBadges
              formStatus={postulacion.status}
              paymentStatus={postulacion.equipmentPayments?.[0]?.status}
              onboardingStatus={postulacion.onboardingAttendances?.[0]?.status}
            />
          </div>

          <div className="flex flex-wrap justify-end items-center gap-2">
            {/* Botón principal: Contactar */}
            {!isEditing && postulacion.phoneNumber && (
              <ContactButton
                driverId={postulacion.id}
                driverName={postulacion.fullName || 'Driver'}
                phoneNumber={postulacion.phoneNumber}
                contactStatus={contactStatus}
                templates={postulacion.whatsappTemplates || []}
                showLabel={true}
                manychatApprovalSentAt={postulacion.manychatApprovalSentAt}
              />
            )}

            {/* Botón principal: Onboarding */}
            {!isEditing && hasScheduledOnboarding ? (
              <Button
                onClick={handleScheduleOnboarding}
                className="gap-2 cursor-pointer"
                variant="outline"
              >
                <Calendar className="h-4 w-4" />
                Gestionar Onboarding
              </Button>
            ) : !isEditing ? (
              <Button
                onClick={handleScheduleOnboarding}
                className="gap-2 cursor-pointer"
              >
                <Calendar className="h-4 w-4" />
                Agendar Onboarding
              </Button>
            ) : null}

            {/* Botón de Editar/Guardar/Cancelar */}
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="gap-2 cursor-pointer"
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="gap-2 cursor-pointer"
                  disabled={isEditingPending}
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  className="gap-2 cursor-pointer"
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

            {/* ✅ NUEVO: Dropdown de Acciones */}
            {!isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <MoreVertical className="h-4 w-4" />
                    Acciones
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {/* Portal del postulante */}
                  {postulacion.accessToken && (
                    <>
                      <DropdownMenuItem
                        onClick={() => window.open(`/postulacion/${postulacion.accessToken}`, '_blank')}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Abrir portal del postulante
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const url = `${window.location.origin}/postulacion/${postulacion.accessToken}`
                          navigator.clipboard.writeText(url)
                          toast.success('Link del portal copiado al portapapeles')
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar link del portal
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Comunicación: capacitaciones */}
                  {postulacion.phoneNumber && (
                    <>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="p-0"
                      >
                        <SendOnboardingListButton
                          driverId={postulacion.id}
                          driverName={postulacion.fullName || 'Driver'}
                          phoneNumber={postulacion.phoneNumber}
                          inDropdown={true}
                        />
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="p-0"
                      >
                        <SendOnboardingReminderButton
                          driverId={postulacion.id}
                          driverName={postulacion.fullName || 'Driver'}
                          phoneNumber={postulacion.phoneNumber}
                          inDropdown={true}
                        />
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="p-0"
                      >
                        <TriggerManychatFlowButton
                          driverId={postulacion.id}
                          driverName={postulacion.fullName || 'Driver'}
                          manychatApprovalSentAt={postulacion.manychatApprovalSentAt}
                          inDropdown={true}
                          onSuccess={handleActionSuccess}
                        />
                      </DropdownMenuItem>
                      {!postulacion.manychatSubscriberId && (
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="p-0"
                        >
                          <LinkManychatSubscriberButton
                            driverId={postulacion.id}
                            driverName={postulacion.fullName || 'Driver'}
                            driverPhone={postulacion.phoneNumber}
                            manychatSubscriberId={postulacion.manychatSubscriberId}
                            inDropdown={true}
                            onSuccess={handleActionSuccess}
                          />
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Automatización */}
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="p-0"
                  >
                    <RefreshRucButton
                      driverId={postulacion.id}
                      onSuccess={handleActionSuccess}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="p-0"
                  >
                    <RunAgentButton
                      driverId={postulacion.id}
                      hasExistingRun={(postulacion.agentRuns?.length ?? 0) > 0}
                    />
                  </DropdownMenuItem>

                  {/* Marcar como Asistida - solo si está IN_PROGRESS */}
                  {postulacion.status === 'IN_PROGRESS' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="p-0"
                      >
                        <AssistedCompletionButton
                          driverId={postulacion.id}
                          driverName={postulacion.fullName || 'Driver'}
                          isAssisted={postulacion.assistedCompletion || false}
                          onSuccess={handleActionSuccess}
                        />
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />

                  {/* Rechazar/Habilitar */}
                  <RejectButton
                    driverId={postulacion.id}
                    driverName={postulacion.fullName || 'Driver'}
                    isRejected={postulacion.status === 'REJECTED'}
                    onSuccess={handleActionSuccess}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

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
                driverId={postulacion.id}
                rucInactiveWaived={postulacion.rucInactiveWaived}
                rucInactiveWaivedAt={postulacion.rucInactiveWaivedAt}
                rucInactiveWaivedNote={postulacion.rucInactiveWaivedNote}
                onWaiveChange={() => router.refresh()}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
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
        </div>

        {/* Historial de Mensajes WhatsApp */}
        <WhatsAppMessagesHistory messages={postulacion.whatsappMessagesSent || []} />
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

      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Postulación</DialogTitle>
            <DialogDescription>
              Indica el motivo del rechazo. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Motivo del rechazo</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ej: Documentos no cumplen con los requisitos"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectModal(false)}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || isRejectPending}
              className="cursor-pointer"
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

      <Dialog open={showProofPreview} onOpenChange={setShowProofPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Comprobante de Pago</DialogTitle>
          </DialogHeader>
          {postulacion.equipmentPayments?.[0]?.paymentProofUrl && (
            <div className="relative aspect-video">
              <Image
                src={postulacion.equipmentPayments[0].paymentProofUrl}
                alt="Comprobante de pago"
                width={800}
                height={600}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}