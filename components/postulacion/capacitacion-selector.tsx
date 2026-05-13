// components/postulacion/capacitacion-selector.tsx
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Calendar,
  MapPin,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  Clock,
  XCircle,
  ShoppingBag,
  Upload,
  Copy,
  Eye,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import type {
  AssignedCapacitacionInfo,
  DocumentWithStatus,
  PersonalDataSection,
  PaymentInfo,
} from '@/lib/types/portal.types'
import type { FormDocumentsStatus, FormDriverStatus } from '@prisma/client'
import { ActiveBookingCard } from './active-booking-card'

const MONCHIS_RED = '#e7243f'

const STATUS_LABELS: Record<string, string> = {
  INVITED: 'Invitado',
  CONFIRMED: 'Confirmado',
  SCHEDULED: 'Agendado',
  ATTENDED: 'Asistió',
  NO_SHOW: 'No Asistió',
  CANCELLED: 'Cancelado',
  RESCHEDULED: 'Reagendado',
}

interface OnboardingEvent {
  id: string
  scheduledDate: Date
  startTime: string
  endTime: string
  location: string
  locationAddress: string
  meetingLink: string | null
  maxCapacity: number
  availableSlots: number
}

interface CapacitacionSelectorProps {
  token: string
  documents: DocumentWithStatus[]
  personalData: PersonalDataSection
  status: FormDriverStatus
  documentsStatus: FormDocumentsStatus
  assignedCapacitacion: AssignedCapacitacionInfo | null
  recentNoShow: { scheduledDateUTC: string; ruleTitle: string } | null
  payment: PaymentInfo | null
  onUpdate: () => void
}

// Check if required document groups are approved (cédula + antecedentes)
function areDocumentsComplete(documents: DocumentWithStatus[]): boolean {
  // Cédula aprobada
  const cedulaApproved = documents.some(
    (d) => d.documentType === 'CEDULA' && d.status === 'APPROVED'
  )
  const antecedentesApproved = documents.some(
    (d) => d.documentType === 'CRIMINAL_RECORD' && d.status === 'APPROVED'
  )
  return cedulaApproved && antecedentesApproved
}

// Check if personal data is complete
function isPersonalDataComplete(data: PersonalDataSection): boolean {
  return !!(data.firstName && data.lastName)
}

export function CapacitacionSelector({
  token,
  documents,
  personalData,
  status,
  documentsStatus,
  assignedCapacitacion,
  recentNoShow,
  payment,
  onUpdate,
}: CapacitacionSelectorProps) {
  const [availableEvents, setAvailableEvents] = useState<OnboardingEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<OnboardingEvent | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showChangeDialog, setShowChangeDialog] = useState(false)

  // Eligibility checks
  const docsComplete = useMemo(() => areDocumentsComplete(documents), [documents])
  const dataComplete = useMemo(() => isPersonalDataComplete(personalData), [personalData])
  const isRejected = status === 'REJECTED'
  const canSelect = docsComplete && dataComplete && !isRejected

  const fetchAvailableEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/postulacion/${token}/capacitaciones`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar eventos')
      }

      setAvailableEvents(result.events || [])
      setHasLoaded(true)
    } catch (err: any) {
      console.error('Error fetching events:', err)
      toast.error('No se pudieron cargar los eventos disponibles')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectEvent = (event: OnboardingEvent) => {
    setSelectedEvent(event)
    setShowConfirmDialog(true)
  }

  const handleConfirmSelection = async () => {
    if (!selectedEvent) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/postulacion/${token}/capacitaciones/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEvent.id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al seleccionar capacitación')
      }

      toast.success('¡Capacitación confirmada! Recibirás un mensaje de WhatsApp con los detalles.')
      onUpdate()
      setShowConfirmDialog(false)
      setSelectedEvent(null)
    } catch (err: any) {
      console.error('Error selecting event:', err)
      toast.error(err.message || 'No se pudo confirmar la capacitación')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangeEvent = (newEvent: OnboardingEvent) => {
    setSelectedEvent(newEvent)
    setShowChangeDialog(true)
  }

  const handleConfirmChange = async () => {
    if (!selectedEvent) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/postulacion/${token}/capacitaciones/change`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEvent.id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al cambiar capacitación')
      }

      toast.success('Fecha de capacitación actualizada correctamente')
      onUpdate()
      setShowChangeDialog(false)
      setSelectedEvent(null)
    } catch (err: any) {
      console.error('Error changing event:', err)
      toast.error(err.message || 'No se pudo cambiar la fecha')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-PY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Show skeleton overlay during submit operations
  if (isSubmitting) {
    return <CapacitacionSkeleton />
  }

  return (
    <div className="space-y-5">
      {/* Equipment & Payment Info — compact */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingBag className="w-4 h-4" style={{ color: MONCHIS_RED }} />
          <p className="font-semibold text-sm text-gray-800">¿Qué recibís en la capacitación?</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Mochila', 'Remera', 'Portavasos'].map((item) => (
            <span key={item} className="bg-white text-xs font-medium text-gray-700 px-3 py-1.5 rounded-full border border-gray-200">
              {item}
            </span>
          ))}
        </div>
        <div className="text-xs text-gray-600 space-y-1 pt-1">
          <p>
            <strong className="text-gray-700">Pago inicial:</strong>{' '}
            <span style={{ color: MONCHIS_RED }} className="font-semibold">Gs. 200.000</span>
            {' — '}podés abonarlo el día de la capacitación vía <strong>POS</strong> o <strong>Transferencia</strong>.
          </p>
          <p className="text-gray-500">
            El saldo restante se irá descontando automáticamente durante las primeras semanas de entregas.
          </p>
        </div>

        {/* Payment status badge */}
        {payment?.paymentProofUrl ? (
          <PaymentStatusBadge payment={payment} />
        ) : payment && payment.status === 'VERIFIED' ? (
          <PaymentStatusBadge payment={payment} />
        ) : null}

        {/* Transfer details + proof upload accordion */}
        <TransferAccordion
          token={token}
          payment={payment}
          documents={documents}
          onUpdate={onUpdate}
        />
      </div>

      {/* No-show reciente: si el driver faltó a una capacitación previa y no
          tiene reserva activa, mostramos un banner explicativo. Sin esto el
          driver ve el selector vacío y no entiende por qué — pensaría que
          nunca reservó. */}
      {recentNoShow && !assignedCapacitacion && !isRejected && (
        <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200">
          <div className="flex items-center gap-2 text-orange-800 mb-1">
            <AlertCircle className="w-5 h-5" />
            <p className="font-semibold text-sm">No asististe a tu capacitación</p>
          </div>
          <p className="text-xs text-orange-800/90 leading-relaxed">
            Quedó marcado que no asististe a la capacitación del{' '}
            <strong>
              {new Date(recentNoShow.scheduledDateUTC).toLocaleDateString('es-PY', {
                day: 'numeric',
                month: 'long',
              })}
            </strong>
            . Reagendá eligiendo una nueva fecha más abajo.
          </p>
        </div>
      )}

      {/* Rejected status */}
      {isRejected && (
        <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
          <div className="flex items-center gap-2 text-red-700 mb-1">
            <XCircle className="w-5 h-5" />
            <p className="font-semibold text-sm">Postulación rechazada</p>
          </div>
          <p className="text-xs text-red-600">
            Tu postulación fue rechazada y no es posible seleccionar una capacitación.
          </p>
        </div>
      )}

      {/* Estado intermedio: postulación APPROVED por admin pero los documentos
          todavía no terminan revisión. Comunicar explícitamente que ya pasó la
          parte difícil y solo falta la validación de docs (24-48h) — sin esto el
          driver ve el bloque amarillo genérico y no entiende por qué no puede
          agendar si "fue aprobado". */}
      {!canSelect && !isRejected && status === 'APPROVED' && (
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
          <div className="flex items-center gap-2 text-emerald-800 mb-1">
            <CheckCircle className="w-5 h-5" />
            <p className="font-semibold text-sm">Tu postulación fue aprobada</p>
          </div>
          <p className="text-xs text-emerald-800/90 leading-relaxed">
            Estamos terminando de validar tus documentos. Suele tardar entre 24 y 48 horas.
            Cuando los aprobemos te vamos a habilitar para agendar tu capacitación acá mismo.
          </p>
          <div className="mt-3 space-y-1.5 text-xs">
            <RequirementRow label="Datos personales completos" done={dataComplete} />
            <RequirementRow label="Cédula de identidad aprobada" done={
              documents.some((d) => d.documentType === 'CEDULA' && d.status === 'APPROVED')
            } />
            <RequirementRow label="Cert. antecedentes policiales aprobado" done={
              documents.some((d) => d.documentType === 'CRIMINAL_RECORD' && d.status === 'APPROVED')
            } />
          </div>
        </div>
      )}

      {/* Requirements checklist when not eligible (and not approved, not rejected) */}
      {!canSelect && !isRejected && status !== 'APPROVED' && (
        <div className="bg-yellow-50/50 rounded-2xl p-4 border border-yellow-200">
          <div className="flex items-center gap-2 text-yellow-800 mb-2">
            <Lock className="w-4 h-4" />
            <p className="font-semibold text-sm">Completá estos requisitos para agendar</p>
          </div>
          <div className="space-y-2 text-xs">
            <RequirementRow label="Datos personales completos" done={dataComplete} />
            <RequirementRow label="Cédula de identidad aprobada" done={
              documents.some((d) => d.documentType === 'CEDULA' && d.status === 'APPROVED')
            } />
            <RequirementRow label="Cert. antecedentes policiales aprobado" done={
              documents.some((d) => d.documentType === 'CRIMINAL_RECORD' && d.status === 'APPROVED')
            } />
          </div>
        </div>
      )}

      {/* Assigned Training — card con acciones (ver / cambiar / cancelar) */}
      {assignedCapacitacion && (
        <ActiveBookingCard booking={assignedCapacitacion} onUpdate={onUpdate} />
      )}

      {/* Event selection — solo si no hay reserva activa.
          Cuando ya tienen una reserva, "Cambiar fecha" del ActiveBookingCard
          los lleva al flow nuevo en /capacitaciones — no necesitan ver el
          selector viejo acá. */}
      {!isRejected && !assignedCapacitacion && (
        <div className={!canSelect ? 'opacity-50 pointer-events-none' : ''}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Seleccioná tu fecha de capacitación
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAvailableEvents}
              className="text-xs"
              disabled={loading || !canSelect}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              {loading ? 'Cargando...' : hasLoaded ? 'Actualizar' : 'Ver fechas disponibles'}
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" style={{ color: MONCHIS_RED }} />
              <p className="text-sm text-gray-500">Cargando eventos...</p>
            </div>
          ) : !hasLoaded ? (
            <div className="text-center py-6 bg-gray-50 rounded-2xl">
              <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {canSelect
                  ? 'Tocá el botón para ver las fechas de capacitación disponibles.'
                  : 'Cuando cumplas con los requisitos, acá aparecerán las fechas de capacitación disponibles.'}
              </p>
            </div>
          ) : availableEvents.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-2xl">
              <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No hay eventos disponibles en este momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onSelect={() => handleSelectEvent(event)}
                  buttonText="Seleccionar"
                  disabled={!canSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* WhatsApp contact */}
      <div className="bg-gray-50 rounded-2xl p-4 text-center">
        <p className="text-sm text-gray-600">
          ¿Tenés alguna consulta?{' '}
          <a
            href="https://wa.me/595974236666"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
            style={{ color: MONCHIS_RED }}
          >
            Escribinos por WhatsApp
          </a>
        </p>
      </div>

      {/* Confirmation Dialog - Select */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Capacitación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas que querés asistir a la capacitación el{' '}
              <strong>{selectedEvent && formatDate(selectedEvent.scheduledDate)}</strong> a las{' '}
              <strong>{selectedEvent?.startTime}</strong>?
              <br /><br />
              Recibirás un mensaje de WhatsApp con todos los detalles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSelection}
              disabled={isSubmitting}
              style={{ backgroundColor: MONCHIS_RED }}
              className="hover:opacity-90"
            >
              {isSubmitting ? 'Confirmando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog - Change */}
      <AlertDialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar Fecha de Capacitación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas que querés cambiar tu capacitación al{' '}
              <strong>{selectedEvent && formatDate(selectedEvent.scheduledDate)}</strong> a las{' '}
              <strong>{selectedEvent?.startTime}</strong>?
              <br /><br />
              Tu capacitación anterior será cancelada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmChange}
              disabled={isSubmitting}
              style={{ backgroundColor: MONCHIS_RED }}
              className="hover:opacity-90"
            >
              {isSubmitting ? 'Cambiando...' : 'Cambiar Fecha'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Skeleton loading state while selecting/changing capacitación
function CapacitacionSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Payment section skeleton */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>

      {/* Assigned capacitación skeleton */}
      <div className="bg-green-50 rounded-2xl p-4 border border-green-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded-full bg-green-200" />
            <Skeleton className="h-4 w-44 bg-green-200" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full bg-green-200" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 bg-green-200" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-48 bg-green-200" />
              <Skeleton className="h-3 w-28 bg-green-200" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 bg-green-200" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-36 bg-green-200" />
              <Skeleton className="h-3 w-52 bg-green-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Events section skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" style={{ color: MONCHIS_RED }} />
          <p className="text-sm text-gray-500">Procesando tu solicitud...</p>
        </div>
      </div>
    </div>
  )
}

// Compact payment status badge
function PaymentStatusBadge({ payment }: { payment: PaymentInfo }) {
  const config = {
    PENDING: {
      icon: Clock,
      label: payment.paymentProofUrl ? 'Comprobante enviado, pendiente de verificación' : 'Pago pendiente',
      color: 'text-yellow-700',
      bg: 'bg-yellow-100',
    },
    VERIFIED: { icon: CheckCircle, label: 'Pago verificado', color: 'text-green-700', bg: 'bg-green-100' },
    REJECTED: { icon: XCircle, label: 'Comprobante rechazado', color: 'text-red-700', bg: 'bg-red-100' },
    PARTIAL: { icon: Clock, label: 'Pago parcial', color: 'text-orange-700', bg: 'bg-orange-100' },
  }[payment.status]

  const StatusIcon = config.icon

  return (
    <div className="space-y-1">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg}`}>
        <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        {payment.amount && (
          <span className="text-xs text-gray-500 ml-auto">
            Gs. {payment.amount.toLocaleString('es-PY')}
          </span>
        )}
      </div>
      {payment.status === 'REJECTED' && payment.rejectionReason && (
        <p className="text-xs text-red-600 px-3">Motivo: {payment.rejectionReason}</p>
      )}
    </div>
  )
}

// Transfer details accordion with proof upload
function TransferAccordion({
  token,
  payment,
  documents,
  onUpdate,
}: {
  token: string
  payment: PaymentInfo | null
  documents: DocumentWithStatus[]
  onUpdate: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Check if there's already an uploaded proof in documents
  const proofDoc = documents.find((d) => d.documentType === 'PAYMENT_PROOF')
  const hasProof = !!(payment?.paymentProofUrl || proofDoc)
  const proofUrl = payment?.paymentProofUrl || proofDoc?.blobUrl
  const canUploadProof = !payment || payment.status !== 'VERIFIED'

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado al portapapeles')
  }

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten archivos JPG, PNG o PDF')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 5MB')
      return
    }

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', 'PAYMENT_PROOF')

      const response = await fetch(`/api/postulacion/${token}/documents`, {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al subir comprobante')
      }

      toast.success('Comprobante subido correctamente. Lo revisaremos pronto.')
      onUpdate()
    } catch (err: any) {
      toast.error(err.message || 'No se pudo subir el comprobante')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteProof = async () => {
    if (!proofDoc) return
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/postulacion/${token}/documents/${proofDoc.id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar comprobante')
      }
      toast.success('Comprobante eliminado')
      onUpdate()
    } catch (err: any) {
      toast.error(err.message || 'No se pudo eliminar el comprobante')
    } finally {
      setIsDeleting(false)
    }
  }

  const TRANSFER_DATA = [
    { label: 'Entidad', value: 'UENO BANK S.A.' },
    { label: 'Titular', value: 'HANOI S.A.' },
    { label: 'Nro. de cuenta', value: '619751858' },
    { label: 'RUC', value: '80089722-6' },
    { label: 'Monto', value: 'Gs. 200.000' },
  ]

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/jpg,application/pdf"
        onChange={handleUploadProof}
      />

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="transfer" className="border-0">
          <AccordionTrigger className="hover:no-underline py-2 text-xs font-semibold" style={{ color: MONCHIS_RED }}>
            {hasProof ? 'Ver datos de transferencia y comprobante' : 'Pagar por transferencia'}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-1">
              {/* Transfer details */}
              <div className="bg-white rounded-xl p-3 border border-gray-200 space-y-2">
                {TRANSFER_DATA.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-800">{item.value}</span>
                      <button
                        onClick={() => handleCopy(item.value)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Proof upload / view */}
              {hasProof ? (
                <div className="bg-white rounded-xl p-3 border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Comprobante subido</p>
                  <div className="flex items-center gap-2">
                    {proofUrl && (
                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs hover:underline"
                        style={{ color: MONCHIS_RED }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver comprobante
                      </a>
                    )}
                    {canUploadProof && proofDoc?.canDelete && (
                      <button
                        onClick={handleDeleteProof}
                        disabled={isDeleting}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 ml-auto disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {isDeleting ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    )}
                  </div>
                  {payment?.status === 'REJECTED' && canUploadProof && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 text-xs"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      {isUploading ? 'Subiendo...' : 'Subir nuevo comprobante'}
                    </Button>
                  )}
                </div>
              ) : canUploadProof ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {isUploading ? 'Subiendo...' : 'Subir comprobante de transferencia'}
                </Button>
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  )
}

// Requirement row
function RequirementRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <AlertCircle className="w-4 h-4 text-gray-400" />
      )}
      <span className={done ? 'text-green-700' : 'text-gray-500'}>{label}</span>
    </div>
  )
}

// Event card
function EventCard({
  event,
  onSelect,
  buttonText,
  disabled,
}: {
  event: OnboardingEvent
  onSelect: () => void
  buttonText: string
  disabled?: boolean
}) {
  const spots = event.availableSlots
  const fewSpots = spots > 0 && spots < 5

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-PY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-[#e7243f] transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 flex-1">
          <Calendar className="h-4 w-4 mt-0.5" style={{ color: MONCHIS_RED }} />
          <div className="min-w-0">
            <p className="font-medium text-sm">{formatDate(event.scheduledDate)}</p>
            <p className="text-xs text-gray-500">
              {event.startTime} - {event.endTime}
            </p>
          </div>
        </div>
        <Badge
          variant={spots === 0 ? 'destructive' : fewSpots ? 'outline' : 'secondary'}
          className={`shrink-0 text-xs ${fewSpots ? 'border-yellow-400 text-yellow-700 bg-yellow-50' : ''}`}
        >
          {spots === 0 ? 'Sin cupos' : fewSpots ? 'Últimos cupos' : 'Cupos disponibles'}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
        <MapPin className="h-3.5 w-3.5 text-gray-400" />
        <span>{event.location}</span>
      </div>

      <Button
        onClick={onSelect}
        className="w-full text-white text-sm"
        size="sm"
        style={{ backgroundColor: MONCHIS_RED }}
        disabled={disabled || spots === 0}
      >
        {spots === 0 ? 'Sin cupos' : buttonText}
      </Button>
    </div>
  )
}
