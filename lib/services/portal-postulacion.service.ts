// lib/services/portal-postulacion.service.ts
// Servicio para operaciones del portal de postulantes

import { prisma } from '@/lib/prisma'
import { put, del } from '@vercel/blob'
import type {
  PortalData,
  PersonalDataSection,
  DocumentWithStatus,
  NextStepsInfo,
  AssignedCapacitacionInfo,
  AvailableCapacitacionEvent,
  UpdatePersonalDataDto,
  PaymentInfo,
} from '@/lib/types/portal.types'
import { getDocumentTypeName } from '@/lib/types/portal.types'
import { validateAccessToken, type FormDriverWithPortalIncludes } from './portal-access.service'
import { buildDriverDocumentPath } from '@/lib/utils/blob-paths'
import type { FormDriver, DocumentType, OnboardingEvent } from '@prisma/client'

/**
 * Obtiene todos los datos del portal para un postulante
 * @param token - Access token del postulante
 * @returns Datos completos del portal
 */
export async function getPostulacionByToken(token: string): Promise<PortalData> {
  const formDriver = await validateAccessToken(token)

  // Construir datos personales
  const personalData: PersonalDataSection = {
    firstName: formDriver.firstName,
    lastName: formDriver.lastName,
    email: formDriver.email,
    birthDate: formDriver.birthDate,
    department: formDriver.department,
    city: formDriver.city,
    neighborhood: formDriver.neighborhood,
    address: formDriver.address,
    addressLat: formDriver.addressLat,
    addressLng: formDriver.addressLng,
    emergencyName: formDriver.emergencyName,
    emergencyRelationship: formDriver.emergencyRelationship,
    emergencyPhone: formDriver.emergencyPhone,
    workZone: formDriver.workZone,
    howHeardAboutUs: formDriver.howHeardAboutUs,
    referredBy: formDriver.referredBy,
    hasVehicle: formDriver.hasVehicle,
    vehicleBrand: formDriver.vehicleBrand,
    vehicleModel: formDriver.vehicleModel,
    vehicleYear: formDriver.vehicleYear,
    vehiclePlate: formDriver.vehiclePlate,
    experience: formDriver.experience,
    availability: formDriver.availability,
    whenCanStart: formDriver.whenCanStart,
    hasUenoAccount: formDriver.hasUenoAccount,
    uenoAccountNumber: formDriver.uenoAccountNumber,
    canInvoice: formDriver.canInvoice,
  }

  // Construir documentos con información de estado
  const documents: DocumentWithStatus[] = formDriver.documents.map((doc) => ({
    id: doc.id,
    documentType: doc.documentType,
    documentTypeName: getDocumentTypeName(doc.documentType),
    fileName: doc.fileName,
    blobUrl: doc.blobUrl,
    status: doc.status,
    rejectionReason: doc.rejectionReason,
    uploadedAt: doc.uploadedAt,
    reviewedAt: doc.reviewedAt,
    reviewedBy: doc.reviewedByUser?.fullName || null,
    canDelete: doc.status === 'PENDING' || doc.status === 'REJECTED',
    canReplace: doc.status === 'REJECTED',
  }))

  // Calcular próximos pasos
  const nextSteps = calculateNextSteps(formDriver)

  // Obtener capacitación asignada si existe
  const assignedCapacitacion = getAssignedCapacitacion(formDriver)

  // Detectar no-show reciente: si no hay reserva activa pero la última attendance
  // (por scheduledDate) terminó en NO_SHOW, exponer info para que el portal muestre
  // un banner explicativo y un CTA a reagendar.
  const recentNoShow = !assignedCapacitacion ? getRecentNoShow(formDriver) : null

  // Obtener información de pago
  const payment = getPaymentInfo(formDriver)

  return {
    id: formDriver.id,
    fullName: formDriver.fullName,
    cedula: formDriver.cedula,
    phoneNumber: formDriver.phoneNumber,
    email: formDriver.email,
    status: formDriver.status,
    documentsStatus: formDriver.documentsStatus,
    onboardingStatus: formDriver.onboardingStatus,
    personalData,
    documents,
    nextSteps,
    assignedCapacitacion,
    recentNoShow,
    payment,
  }
}

/**
 * Actualiza datos personales del postulante
 * @param token - Access token
 * @param data - Datos a actualizar
 * @returns FormDriver actualizado
 */
export async function updatePersonalData(
  token: string,
  data: UpdatePersonalDataDto
): Promise<FormDriver> {
  const formDriver = await validateAccessToken(token)

  // Convertir birthDate si viene como string
  const updateData: any = { ...data }
  if (updateData.birthDate && typeof updateData.birthDate === 'string') {
    updateData.birthDate = new Date(updateData.birthDate)
  }

  const updated = await prisma.formDriver.update({
    where: { id: formDriver.id },
    data: updateData,
  })

  return updated
}

/**
 * Sube un nuevo documento
 * @param token - Access token
 * @param file - Archivo a subir
 * @param documentType - Tipo de documento
 * @returns Documento creado
 */
export async function uploadDocument(
  token: string,
  file: File,
  documentType: DocumentType
) {
  const formDriver = await validateAccessToken(token)

  // Path opaco con formDriver.id (no cédula) y nombre random.
  // Evita enumeración por cédula y path traversal vía file.name.
  const blobPath = buildDriverDocumentPath({
    formDriverId: formDriver.id,
    documentType,
    mime: file.type,
  })

  const blob = await put(blobPath, file, {
    access: 'public',
    addRandomSuffix: true,
  })

  // Crear registro en BD
  const document = await prisma.formDocument.create({
    data: {
      formDriverId: formDriver.id,
      documentType,
      fileName: file.name,
      blobUrl: blob.url,
      mimeType: file.type,
      fileSize: file.size,
      status: 'PENDING',
      uploadedAt: new Date(),
    },
  })

  // Recalcular documentsStatus
  await recalculateDocumentsStatus(formDriver.id)

  return document
}

/**
 * Elimina un documento
 * Solo permitido para documentos PENDING o REJECTED
 * @param token - Access token
 * @param docId - ID del documento a eliminar
 */
export async function deleteDocument(token: string, docId: string): Promise<void> {
  const formDriver = await validateAccessToken(token)

  // Buscar documento
  const document = await prisma.formDocument.findUnique({
    where: { id: docId },
  })

  if (!document) {
    throw new Error('Documento no encontrado')
  }

  // Verificar que pertenece al postulante
  if (document.formDriverId !== formDriver.id) {
    throw new Error('No tiene permisos para eliminar este documento')
  }

  // Verificar que el status permite eliminación
  if (document.status !== 'PENDING' && document.status !== 'REJECTED') {
    throw new Error('Solo se pueden eliminar documentos pendientes o rechazados')
  }

  // Eliminar de Vercel Blob
  try {
    await del(document.blobUrl)
  } catch (error) {
    console.error('Error eliminando archivo de Vercel Blob:', error)
    // Continuar con la eliminación de BD incluso si falla el blob
  }

  // Eliminar de BD
  await prisma.formDocument.delete({
    where: { id: docId },
  })

  // Recalcular documentsStatus
  await recalculateDocumentsStatus(formDriver.id)
}

/**
 * Obtiene eventos de capacitación disponibles
 * @param token - Access token
 * @returns Lista de eventos disponibles y capacitación actual
 */
export async function getAvailableCapacitaciones(token: string): Promise<{
  canSelect: boolean
  reason: string | null
  events: AvailableCapacitacionEvent[]
  currentAssignment: AssignedCapacitacionInfo | null
}> {
  const formDriver = await validateAccessToken(token)

  // Verificar elegibilidad usando documentos individuales (no el campo resumen)
  // Requisitos: Cédula + Antecedentes Policiales aprobados
  const cedulaOk = formDriver.documents.some(
    (d: any) => d.documentType === 'CEDULA' && d.status === 'APPROVED'
  )
  const antecedentesOk = formDriver.documents.some(
    (d: any) => d.documentType === 'CRIMINAL_RECORD' && d.status === 'APPROVED'
  )
  const docsApproved = cedulaOk && antecedentesOk
  const dataComplete = !!(formDriver.firstName && formDriver.lastName)
  const canSelect = docsApproved && dataComplete && formDriver.status !== 'REJECTED'

  const reason = !canSelect
    ? 'Debes completar tus datos y tener cédula y antecedentes aprobados'
    : null

  // Obtener capacitación actual si existe
  const currentAssignment = getAssignedCapacitacion(formDriver)

  // Siempre buscar eventos disponibles (el frontend los muestra disabled si no puede seleccionar)
  const now = new Date()
  const events = await prisma.onboardingEvent.findMany({
    where: {
      scheduledDate: {
        gte: now,
      },
      status: 'SCHEDULED',
    },
    orderBy: {
      scheduledDate: 'asc',
    },
  })

  const availableEvents: AvailableCapacitacionEvent[] = events.map((event) => ({
    id: event.id,
    title: event.title || 'Capacitación',
    scheduledDate: event.scheduledDate,
    startTime: event.startTime || '09:00',
    endTime: event.endTime || '12:00',
    location: event.location || 'Oficina Central',
    locationAddress: event.locationAddress || '',
    meetingLink: event.meetingLink || null,
    availableSlots: event.maxCapacity
      ? event.maxCapacity - event.currentCapacity
      : 999,
    maxCapacity: event.maxCapacity || 999,
    description: event.description || null,
  }))

  return {
    canSelect,
    reason,
    events: availableEvents,
    currentAssignment,
  }
}

/**
 * Selecciona un evento de capacitación
 * @param token - Access token
 * @param eventId - ID del evento a seleccionar
 * @returns Información de la asignación
 */
export async function selectCapacitacion(
  token: string,
  eventId: string
): Promise<AssignedCapacitacionInfo> {
  const formDriver = await validateAccessToken(token)

  // Verificar elegibilidad usando documentos individuales
  const hasCedula = formDriver.documents.some(
    (d: any) => d.documentType === 'CEDULA' && d.status === 'APPROVED'
  )
  const hasAntecedentes = formDriver.documents.some(
    (d: any) => d.documentType === 'CRIMINAL_RECORD' && d.status === 'APPROVED'
  )
  if (!hasCedula || !hasAntecedentes || !formDriver.firstName || !formDriver.lastName) {
    throw new Error('Debes completar tus datos y tener cédula y antecedentes aprobados para seleccionar capacitación')
  }
  if (formDriver.status === 'REJECTED') {
    throw new Error('Tu postulación fue rechazada')
  }

  // Verificar que el evento existe y tiene capacidad
  const initialEvent = await prisma.onboardingEvent.findUnique({
    where: { id: eventId },
  })

  if (!initialEvent) {
    throw new Error('Evento no encontrado')
  }

  if (initialEvent.status !== 'SCHEDULED') {
    throw new Error('El evento no está disponible para selección')
  }

  if (initialEvent.maxCapacity && initialEvent.currentCapacity >= initialEvent.maxCapacity) {
    throw new Error('El evento no tiene cupos disponibles')
  }

  // Verificar que no esté ya asignado a otro evento activo
  const existingAssignment = await prisma.onboardingAttendee.findFirst({
    where: {
      formDriverId: formDriver.id,
      status: {
        in: ['INVITED', 'CONFIRMED', 'SCHEDULED'],
      },
    },
  })

  if (existingAssignment) {
    throw new Error('Ya tienes una capacitación asignada')
  }

  // OCC: increment de currentCapacity con conditional version + capacidad lt max.
  // Sin esto, dos postulantes pidiendo el último cupo a la vez pasaban ambos el
  // check y terminaban con currentCapacity > maxCapacity.
  let event: NonNullable<typeof initialEvent> = initialEvent
  const MAX_RETRIES = 3
  let acquired = false
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await prisma.onboardingEvent.updateMany({
      where: {
        id: event.id,
        version: event.version,
        ...(event.maxCapacity != null
          ? { currentCapacity: { lt: event.maxCapacity } }
          : {}),
      },
      data: {
        currentCapacity: { increment: 1 },
        version: { increment: 1 },
      },
    })
    if (result.count === 1) {
      acquired = true
      break
    }
    const reread = await prisma.onboardingEvent.findUnique({
      where: { id: event.id },
    })
    if (!reread) throw new Error('Evento no encontrado')
    if (reread.maxCapacity != null && reread.currentCapacity >= reread.maxCapacity) {
      throw new Error('El evento no tiene cupos disponibles')
    }
    event = reread
  }
  if (!acquired) {
    throw new Error('El evento no tiene cupos disponibles')
  }

  // Crear o reactivar asignación (capacidad ya está reservada arriba)
  const attendee = await prisma.onboardingAttendee.upsert({
    where: {
      eventId_formDriverId: { eventId: event.id, formDriverId: formDriver.id },
    },
    update: {
      status: 'SCHEDULED',
      invitedAt: new Date(),
      cancelledAt: null,
      cancelledBy: null,
      cancelledReason: null,
    },
    create: {
      formDriverId: formDriver.id,
      eventId: event.id,
      status: 'SCHEDULED',
      invitedAt: new Date(),
    },
    include: {
      event: { include: { scheduleRule: true } },
    },
  })

  // Actualizar estado del formDriver
  await prisma.formDriver.update({
    where: { id: formDriver.id },
    data: {
      onboardingStatus: 'SCHEDULED',
      onboardingScheduledAt: event.scheduledDate,
    },
  })

  return buildAssignedCapacitacionInfo(attendee)
}

/**
 * Cambia la capacitación asignada por otra
 * @param token - Access token
 * @param newEventId - ID del nuevo evento
 * @returns Información de la nueva asignación
 */
export async function changeCapacitacion(
  token: string,
  newEventId: string
): Promise<{ previousEvent: { id: string; scheduledDate: Date }; newAssignment: AssignedCapacitacionInfo }> {
  const formDriver = await validateAccessToken(token)

  // Buscar asignación actual
  const currentAssignment = await prisma.onboardingAttendee.findFirst({
    where: {
      formDriverId: formDriver.id,
      status: {
        in: ['INVITED', 'CONFIRMED', 'SCHEDULED'],
      },
    },
    include: {
      event: true,
    },
  })

  if (!currentAssignment) {
    throw new Error('No tienes una capacitación asignada actualmente')
  }

  // Verificar que el nuevo evento es diferente
  if (currentAssignment.eventId === newEventId) {
    throw new Error('Ya estás asignado a este evento')
  }

  // Verificar que el nuevo evento existe y tiene capacidad
  const newEvent = await prisma.onboardingEvent.findUnique({
    where: { id: newEventId },
  })

  if (!newEvent) {
    throw new Error('Evento no encontrado')
  }

  if (newEvent.status !== 'SCHEDULED') {
    throw new Error('El evento no está disponible')
  }

  if (newEvent.maxCapacity && newEvent.currentCapacity >= newEvent.maxCapacity) {
    throw new Error('El evento no tiene cupos disponibles')
  }

  // Guardar info del evento anterior
  const previousEvent = {
    id: currentAssignment.eventId,
    scheduledDate: currentAssignment.event.scheduledDate,
  }

  // OCC: reservar cupo en el nuevo evento ANTES de liberar el viejo, para que
  // si el nuevo se llenó entre el check y el commit no nos quedemos sin nada.
  let evNew = newEvent
  const MAX_RETRIES = 3
  let acquired = false
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await prisma.onboardingEvent.updateMany({
      where: {
        id: evNew.id,
        version: evNew.version,
        ...(evNew.maxCapacity != null
          ? { currentCapacity: { lt: evNew.maxCapacity } }
          : {}),
      },
      data: {
        currentCapacity: { increment: 1 },
        version: { increment: 1 },
      },
    })
    if (result.count === 1) {
      acquired = true
      break
    }
    const reread = await prisma.onboardingEvent.findUnique({ where: { id: evNew.id } })
    if (!reread) throw new Error('Evento no encontrado')
    if (reread.maxCapacity != null && reread.currentCapacity >= reread.maxCapacity) {
      throw new Error('El evento no tiene cupos disponibles')
    }
    evNew = reread
  }
  if (!acquired) {
    throw new Error('El evento no tiene cupos disponibles')
  }

  // Recién ahora cancelamos la asignación anterior y liberamos su cupo.
  await prisma.onboardingAttendee.update({
    where: { id: currentAssignment.id },
    data: { status: 'CANCELLED' },
  })

  await prisma.onboardingEvent.update({
    where: { id: currentAssignment.eventId },
    data: { currentCapacity: { decrement: 1 } },
  })

  // Crear o reactivar asignación en nuevo evento (capacidad ya reservada).
  const newAttendee = await prisma.onboardingAttendee.upsert({
    where: {
      eventId_formDriverId: { eventId: evNew.id, formDriverId: formDriver.id },
    },
    update: {
      status: 'SCHEDULED',
      invitedAt: new Date(),
      invitedBy: currentAssignment.invitedBy,
      cancelledAt: null,
      cancelledBy: null,
      cancelledReason: null,
    },
    create: {
      formDriverId: formDriver.id,
      eventId: evNew.id,
      status: 'SCHEDULED',
      invitedAt: new Date(),
      invitedBy: currentAssignment.invitedBy,
    },
    include: {
      event: { include: { scheduleRule: true } },
    },
  })

  // Actualizar formDriver
  await prisma.formDriver.update({
    where: { id: formDriver.id },
    data: {
      onboardingScheduledAt: newEvent.scheduledDate,
    },
  })

  return {
    previousEvent,
    newAssignment: buildAssignedCapacitacionInfo(newAttendee),
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Calcula los próximos pasos y permisos del postulante
 */
function calculateNextSteps(formDriver: any): NextStepsInfo {
  const pendingActions: string[] = []
  let progressPercentage = 0

  // Calcular progreso
  const totalSteps = 5
  let completedSteps = 0

  // 1. Formulario completado
  if (formDriver.status === 'COMPLETED') {
    completedSteps++
  } else {
    pendingActions.push('Completar formulario de postulación')
  }

  // 2. Documentos aprobados
  if (formDriver.documentsStatus === 'APPROVED') {
    completedSteps++
  } else if (formDriver.documentsStatus === 'CORRECTIONS') {
    pendingActions.push('Corregir documentos rechazados')
  } else {
    pendingActions.push('Subir documentos requeridos')
  }

  // 3. Capacitación seleccionada
  if (formDriver.onboardingStatus === 'SCHEDULED' || formDriver.onboardingStatus === 'COMPLETED') {
    completedSteps++
  } else if (formDriver.documentsStatus === 'APPROVED') {
    pendingActions.push('Seleccionar fecha de capacitación')
  }

  // 4. Capacitación completada
  if (formDriver.onboardingStatus === 'COMPLETED') {
    completedSteps++
  }

  // 5. Activación
  if (formDriver.status === 'ACTIVE') {
    completedSteps++
  }

  progressPercentage = Math.round((completedSteps / totalSteps) * 100)

  return {
    canUploadDocuments: true, // Siempre puede subir documentos
    canSelectCapacitacion: formDriver.documentsStatus === 'APPROVED',
    pendingActions,
    progressPercentage,
  }
}

/**
 * Obtiene la información de pago más reciente
 */
function getPaymentInfo(formDriver: any): PaymentInfo | null {
  const payments = formDriver.equipmentPayments
  if (!payments || payments.length === 0) return null

  const latestPayment = payments[0] // Already ordered by createdAt desc
  return {
    id: latestPayment.id,
    amount: latestPayment.amount,
    status: latestPayment.status,
    paymentMethod: latestPayment.paymentMethod,
    paymentDate: latestPayment.paymentDate,
    paymentProofUrl: latestPayment.paymentProofUrl,
    rejectionReason: latestPayment.rejectionReason,
    verifiedAt: latestPayment.verifiedAt,
  }
}

/**
 * Obtiene la capacitación asignada si existe
 */
/**
 * Mapea un attendee con event + scheduleRule al shape público AssignedCapacitacionInfo.
 * scheduleRule puede ser null para attendees legacy creados antes del modelo de Rules;
 * en ese caso caemos a campos del event y a un deadline default de 4h.
 */
function buildAssignedCapacitacionInfo(attendee: any): AssignedCapacitacionInfo {
  const rule = attendee.event.scheduleRule
  return {
    id: attendee.id,
    eventId: attendee.eventId,
    confirmationToken: attendee.confirmationToken,
    scheduledDate: attendee.event.scheduledDate,
    startTime: attendee.event.startTime || '09:00',
    endTime: attendee.event.endTime || '12:00',
    location: attendee.event.location || rule?.title || 'Oficina Central',
    locationAddress: attendee.event.locationAddress || '',
    meetingLink: attendee.event.meetingLink,
    status: attendee.status,
    canChange: true,
    confirmedAt: attendee.confirmedAt,
    ruleSlug: rule?.slug ?? null,
    ruleTitle: rule?.title ?? attendee.event.title ?? null,
    modality: rule?.modality ?? attendee.event.modality ?? null,
    cancelDeadlineHours: rule?.cancelDeadlineHours ?? 4,
    durationMinutes: rule?.durationMinutes ?? attendee.event.durationMinutes ?? null,
  }
}

function getAssignedCapacitacion(formDriver: any): AssignedCapacitacionInfo | null {
  const activeAssignment = formDriver.onboardingAttendances.find(
    (attendance: any) =>
      attendance.status === 'INVITED' ||
      attendance.status === 'CONFIRMED' ||
      attendance.status === 'SCHEDULED'
  )

  if (!activeAssignment) {
    return null
  }

  return buildAssignedCapacitacionInfo(activeAssignment)
}

/**
 * Devuelve la attendance NO_SHOW más reciente (por scheduledDate) si existe
 * dentro de la ventana de relevancia, con info mínima para mostrar un banner
 * en el portal. Sin esto el driver que faltó a una capacitación ve el selector
 * vacío sin entender por qué.
 *
 * Filtramos a los últimos NO_SHOW_RELEVANT_DAYS para no mostrar un banner
 * eterno: si el driver faltó hace 6 meses, ya no le sirve la info — preferimos
 * mostrarle el selector limpio.
 */
const NO_SHOW_RELEVANT_DAYS = 90

function getRecentNoShow(
  formDriver: any,
): { scheduledDateUTC: string; ruleTitle: string } | null {
  const cutoff = Date.now() - NO_SHOW_RELEVANT_DAYS * 24 * 60 * 60 * 1000
  const noShows = (formDriver.onboardingAttendances || []).filter(
    (a: any) =>
      a.status === 'NO_SHOW' &&
      a.event?.scheduledDate &&
      new Date(a.event.scheduledDate).getTime() >= cutoff,
  )
  if (noShows.length === 0) return null
  // Más reciente primero
  noShows.sort(
    (a: any, b: any) =>
      new Date(b.event.scheduledDate).getTime() - new Date(a.event.scheduledDate).getTime(),
  )
  const latest = noShows[0]
  return {
    scheduledDateUTC: new Date(latest.event.scheduledDate).toISOString(),
    ruleTitle: latest.event.title || latest.event.scheduleRule?.title || 'tu capacitación',
  }
}

/**
 * Recalcula el documentsStatus basado en los documentos actuales
 */
async function recalculateDocumentsStatus(formDriverId: string): Promise<void> {
  const documents = await prisma.formDocument.findMany({
    where: { formDriverId },
  })

  let newStatus: any = 'INCOMPLETE'

  if (documents.length === 0) {
    newStatus = 'INCOMPLETE'
  } else {
    const hasRejected = documents.some((doc) => doc.status === 'REJECTED')
    const hasPending = documents.some(
      (doc) => doc.status === 'PENDING' || doc.status === 'IN_REVIEW'
    )
    const allApproved = documents.every((doc) => doc.status === 'APPROVED')

    if (allApproved && documents.length > 0) {
      newStatus = 'APPROVED'
    } else if (hasRejected) {
      newStatus = 'CORRECTIONS'
    } else if (hasPending) {
      newStatus = 'IN_REVIEW'
    } else {
      newStatus = 'PENDING'
    }
  }

  await prisma.formDriver.update({
    where: { id: formDriverId },
    data: { documentsStatus: newStatus },
  })
}
