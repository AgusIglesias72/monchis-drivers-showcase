// lib/services/onboarding-booking.service.ts
//
// Booking público de capacitaciones. Maneja:
// - Validación de shareToken (con expiración)
// - Eligibility (cédula+antecedentes APPROVED, datos personales)
// - Materialización on-demand del slot si hace falta
// - Reserva atómica con OCC (version + currentCapacity guard)
// - Cancel y reschedule (con deadline check)

import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { findSessionByShareToken } from './public-booking-session.service'
import { getOrMaterializeSlot } from './onboarding-materialization.service'
import {
  ShareTokenInvalidError,
  ShareTokenExpiredError,
  EventFullError,
  NotEligibleError,
  BookingNotFoundError,
  CancelDeadlinePassedError,
  AlreadyBookedError,
  ValidationError,
} from './onboarding-errors'
import type {
  PublicBookingSessionInfo,
  BookingCreateInput,
  BookingResponse,
  BookingDetail,
} from '@/lib/types/onboarding-rules.types'

// ==================== ELIGIBILITY ====================

import { checkEligibility } from './onboarding-eligibility'

// Mantenemos los últimos 3 dígitos visibles para que el postulante reconozca
// el número sin exponerlo entero. Genérico, sin asumir prefijo de país (la
// versión anterior cableaba "+595 9** *** XXX" y mostraba "+155 9** *** XXX"
// a usuarios con números no paraguayos).
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 6) return phone
  const last3 = digits.slice(-3)
  return `••• ••• ${last3}`
}

// ==================== VALIDATE SESSION ====================

export async function validateShareToken(shareToken: string): Promise<PublicBookingSessionInfo> {
  if (!shareToken || typeof shareToken !== 'string') {
    throw new ShareTokenInvalidError()
  }

  const session = await findSessionByShareToken(shareToken)
  if (!session) {
    throw new ShareTokenInvalidError()
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    throw new ShareTokenExpiredError()
  }

  const fd = session.formDriver
  const eligibility = checkEligibility({
    status: fd.status,
    documentsStatus: fd.documentsStatus,
    firstName: fd.firstName,
    lastName: fd.lastName,
    documents: fd.documents,
    assistedCompletion: fd.assistedCompletion,
  })

  return {
    shareToken: session.shareToken,
    expiresAt: session.expiresAt.toISOString(),
    formDriver: {
      firstName: fd.firstName,
      lastName: fd.lastName,
      phoneMasked: maskPhone(fd.phoneNumber),
      isEligible: eligibility.isEligible,
      notEligibleReason: eligibility.reason,
    },
  }
}

// ==================== CREATE BOOKING ====================

const MAX_OCC_RETRIES = 3

export async function createBooking(input: BookingCreateInput): Promise<BookingResponse> {
  if (!input.shareToken) throw new ValidationError('shareToken es obligatorio')

  const session = await findSessionByShareToken(input.shareToken)
  if (!session) throw new ShareTokenInvalidError()
  if (session.expiresAt.getTime() <= Date.now()) throw new ShareTokenExpiredError()

  const fd = session.formDriver

  // Si vienen datos confirmados del dialog, los aplicamos al FormDriver antes
  // de la verificación de eligibility (un nombre vacío puede bloquear y el
  // driver puede haberlo completado en el dialog).
  if (input.confirmedProfile) {
    // IMPORTANTE: `cedula` y `phoneNumber` se consideran identidad inmutable
    // desde el portal público. Si alguien con shareToken las cambia, puede
    // suplantar a otro postulante en la BD o colisionar con uno existente.
    // Solo permitimos corregir nombre y email desde acá; cédula/teléfono
    // requieren acción admin explícita.
    const updates: Record<string, string> = {}
    const trim = (v?: string) => (v ?? '').trim()
    const nf = trim(input.confirmedProfile.firstName)
    const nl = trim(input.confirmedProfile.lastName)
    const ne = trim(input.confirmedProfile.email)
    if (nf && nf !== (fd.firstName ?? '')) updates.firstName = nf
    if (nl && nl !== (fd.lastName ?? '')) updates.lastName = nl
    if (nf || nl) {
      updates.fullName = `${nf || fd.firstName || ''} ${nl || fd.lastName || ''}`.trim()
    }
    if (ne && ne !== (fd.email ?? '')) updates.email = ne

    // Loguear (sin valores) si el cliente intentó cambiar campos inmutables.
    const triedCedula = trim(input.confirmedProfile.cedula)
    const triedPhone = trim(input.confirmedProfile.phoneNumber)
    if ((triedCedula && triedCedula !== fd.cedula) || (triedPhone && triedPhone !== fd.phoneNumber)) {
      console.warn('[BOOKING] Intento de cambiar cedula/phoneNumber desde portal público — ignorado', {
        formDriverId: fd.id,
        cedulaChanged: !!(triedCedula && triedCedula !== fd.cedula),
        phoneChanged: !!(triedPhone && triedPhone !== fd.phoneNumber),
      })
    }

    if (Object.keys(updates).length > 0) {
      await prisma.formDriver.update({ where: { id: fd.id }, data: updates })
      // Refrescamos los campos en memoria para los checks siguientes
      Object.assign(fd, updates)
    }
  }

  const eligibility = checkEligibility({
    status: fd.status,
    documentsStatus: fd.documentsStatus,
    firstName: fd.firstName,
    lastName: fd.lastName,
    documents: fd.documents,
    assistedCompletion: fd.assistedCompletion,
  })
  if (!eligibility.isEligible) {
    throw new NotEligibleError(eligibility.reason ?? undefined)
  }

  // No double-booking: si ya tiene un attendee activo en evento futuro, rechazar.
  const now = new Date()
  const activeAttendee = await prisma.onboardingAttendee.findFirst({
    where: {
      formDriverId: fd.id,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      event: { scheduledDate: { gte: now } },
    },
  })
  if (activeAttendee) {
    throw new AlreadyBookedError()
  }

  // Resolver/materializar el slot.
  let slot: { id: string; currentCapacity: number; maxCapacity: number | null; version: number; status: string }
  if (input.eventId) {
    const event = await prisma.onboardingEvent.findUnique({
      where: { id: input.eventId },
      select: { id: true, currentCapacity: true, maxCapacity: true, version: true, status: true },
    })
    if (!event) throw new ValidationError('Evento no encontrado')
    slot = event
  } else if (input.ruleId && input.scheduledDateUTC) {
    const date = new Date(input.scheduledDateUTC)
    if (isNaN(date.getTime())) throw new ValidationError('scheduledDateUTC inválido')
    slot = await getOrMaterializeSlot(input.ruleId, date)
  } else {
    throw new ValidationError('Debes pasar eventId o (ruleId + scheduledDateUTC)')
  }

  if (slot.status !== 'SCHEDULED') {
    throw new ValidationError('El evento no está disponible para reservas')
  }
  if (slot.maxCapacity != null && slot.currentCapacity >= slot.maxCapacity) {
    throw new EventFullError()
  }

  // OCC: try-loop. Si la versión cambió mientras leíamos, releemos y reintentamos.
  let acquiredEvent: typeof slot | null = null
  for (let attempt = 0; attempt < MAX_OCC_RETRIES; attempt++) {
    const result = await prisma.onboardingEvent.updateMany({
      where: {
        id: slot.id,
        version: slot.version,
        ...(slot.maxCapacity != null
          ? { currentCapacity: { lt: slot.maxCapacity } }
          : {}),
      },
      data: {
        currentCapacity: { increment: 1 },
        version: { increment: 1 },
      },
    })
    if (result.count === 1) {
      acquiredEvent = slot
      break
    }
    // Reread y reintenta.
    const reread = await prisma.onboardingEvent.findUnique({
      where: { id: slot.id },
      select: { id: true, currentCapacity: true, maxCapacity: true, version: true, status: true },
    })
    if (!reread) throw new ValidationError('Evento desapareció durante reserva')
    if (reread.maxCapacity != null && reread.currentCapacity >= reread.maxCapacity) {
      throw new EventFullError()
    }
    slot = reread
  }
  if (!acquiredEvent) {
    throw new EventFullError()
  }

  const confirmationToken = nanoid(32)

  // Upsert por unique (eventId, formDriverId): si el postulante reagendó al mismo
  // evento más adelante, queremos pisar el row existente y no chocar con la unique.
  const attendee = await prisma.onboardingAttendee.upsert({
    where: {
      eventId_formDriverId: { eventId: acquiredEvent.id, formDriverId: fd.id },
    },
    update: {
      status: 'SCHEDULED',
      confirmationToken,
      invitedAt: new Date(),
      cancelledAt: null,
      cancelledBy: null,
      cancelledReason: null,
      rescheduledFrom: null,
      rescheduledAt: null,
      rescheduledBy: null,
    },
    create: {
      eventId: acquiredEvent.id,
      formDriverId: fd.id,
      status: 'SCHEDULED',
      confirmationToken,
      invitedAt: new Date(),
    },
    include: { event: true },
  })

  await prisma.publicBookingSession.update({
    where: { id: session.id },
    data: { usedAt: new Date() },
  })

  await prisma.formDriver.update({
    where: { id: fd.id },
    data: {
      onboardingStatus: 'SCHEDULED',
      onboardingScheduledAt: attendee.event.scheduledDate,
    },
  })

  return buildBookingResponse(confirmationToken, attendee.id, attendee.event)
}

// ==================== READ BY CONFIRMATION TOKEN ====================

export async function getBookingByConfirmationToken(token: string): Promise<BookingDetail> {
  const attendee = await prisma.onboardingAttendee.findUnique({
    where: { confirmationToken: token },
    include: {
      event: { include: { scheduleRule: true } },
      formDriver: { select: { firstName: true, lastName: true } },
    },
  })
  if (!attendee) throw new BookingNotFoundError()

  const event = attendee.event
  const cancelDeadlineHours =
    event.scheduleRule?.cancelDeadlineHours ?? 4
  const cancelDeadlineMs = cancelDeadlineHours * 60 * 60 * 1000
  const cancelDeadlineDate = new Date(event.scheduledDate.getTime() - cancelDeadlineMs)
  const now = new Date()
  const isActive = !['CANCELLED', 'NO_SHOW', 'ATTENDED'].includes(attendee.status)
  const beforeDeadline = now.getTime() < cancelDeadlineDate.getTime()
  const canCancel = isActive && beforeDeadline
  const canReschedule = canCancel

  const base = buildBookingResponseFromEvent(token, attendee.id, {
    ...event,
    ruleSlug: event.scheduleRule?.slug ?? null,
  })

  return {
    ...base,
    status: attendee.status,
    cancelledReason: attendee.cancelledReason ?? null,
    cancelDeadlineHours,
    canCancel,
    canReschedule,
    cancelDeadlineUTC: cancelDeadlineDate.toISOString(),
    driverFirstName: attendee.formDriver.firstName,
    driverLastName: attendee.formDriver.lastName,
  }
}

// ==================== CANCEL ====================

export async function cancelBooking(token: string, reason?: string): Promise<{ ok: true }> {
  const attendee = await prisma.onboardingAttendee.findUnique({
    where: { confirmationToken: token },
    include: { event: { include: { scheduleRule: true } } },
  })
  if (!attendee) throw new BookingNotFoundError()

  if (['CANCELLED', 'NO_SHOW', 'ATTENDED'].includes(attendee.status)) {
    throw new ValidationError('La reserva ya está finalizada o cancelada')
  }

  const cancelDeadlineHours = attendee.event.scheduleRule?.cancelDeadlineHours ?? 4
  const deadline = new Date(
    attendee.event.scheduledDate.getTime() - cancelDeadlineHours * 60 * 60 * 1000,
  )
  if (Date.now() >= deadline.getTime()) {
    throw new CancelDeadlinePassedError()
  }

  await prisma.$transaction(async (tx) => {
    await tx.onboardingAttendee.update({
      where: { id: attendee.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: 'self',
        cancelledReason: reason ?? null,
      },
    })
    // OCC-safe decrement: aunque updateMany sin guard también funciona,
    // mantenemos el bump de version para que cualquier lector concurrente
    // detecte el cambio.
    await tx.onboardingEvent.updateMany({
      where: { id: attendee.eventId, currentCapacity: { gt: 0 } },
      data: {
        currentCapacity: { decrement: 1 },
        version: { increment: 1 },
      },
    })
    await tx.formDriver.update({
      where: { id: attendee.formDriverId },
      data: {
        onboardingStatus: 'CANCELLED',
        onboardingScheduledAt: null,
      },
    })
  })

  return { ok: true }
}

// ==================== RESCHEDULE ====================

export async function rescheduleBooking(
  token: string,
  input: { eventId?: string; ruleId?: string; scheduledDateUTC?: string },
): Promise<BookingResponse> {
  const attendee = await prisma.onboardingAttendee.findUnique({
    where: { confirmationToken: token },
    include: {
      event: { include: { scheduleRule: true } },
      formDriver: {
        select: {
          id: true,
          status: true,
          documentsStatus: true,
          firstName: true,
          lastName: true,
          assistedCompletion: true,
          documents: { select: { documentType: true, status: true } },
        },
      },
    },
  })
  if (!attendee) throw new BookingNotFoundError()

  if (['CANCELLED', 'NO_SHOW', 'ATTENDED'].includes(attendee.status)) {
    throw new ValidationError('La reserva ya no se puede reagendar')
  }

  const cancelDeadlineHours = attendee.event.scheduleRule?.cancelDeadlineHours ?? 4
  const deadline = new Date(
    attendee.event.scheduledDate.getTime() - cancelDeadlineHours * 60 * 60 * 1000,
  )
  if (Date.now() >= deadline.getTime()) {
    throw new CancelDeadlinePassedError()
  }

  const eligibility = checkEligibility(attendee.formDriver)
  if (!eligibility.isEligible) {
    throw new NotEligibleError(eligibility.reason ?? undefined)
  }

  // Resolver nuevo slot.
  let target: { id: string; currentCapacity: number; maxCapacity: number | null; version: number; status: string }
  if (input.eventId) {
    if (input.eventId === attendee.eventId) {
      throw new ValidationError('Ya estás reservado en ese evento')
    }
    const event = await prisma.onboardingEvent.findUnique({
      where: { id: input.eventId },
      select: { id: true, currentCapacity: true, maxCapacity: true, version: true, status: true },
    })
    if (!event) throw new ValidationError('Evento no encontrado')
    target = event
  } else if (input.ruleId && input.scheduledDateUTC) {
    const date = new Date(input.scheduledDateUTC)
    if (isNaN(date.getTime())) throw new ValidationError('scheduledDateUTC inválido')
    target = await getOrMaterializeSlot(input.ruleId, date)
    if (target.id === attendee.eventId) {
      throw new ValidationError('Ya estás reservado en ese evento')
    }
  } else {
    throw new ValidationError('Debes pasar eventId o (ruleId + scheduledDateUTC)')
  }

  if (target.status !== 'SCHEDULED') {
    throw new ValidationError('El evento destino no está disponible')
  }
  if (target.maxCapacity != null && target.currentCapacity >= target.maxCapacity) {
    throw new EventFullError()
  }

  // OCC en target: incrementa capacidad atómicamente.
  let acquired = false
  for (let attempt = 0; attempt < MAX_OCC_RETRIES; attempt++) {
    const result = await prisma.onboardingEvent.updateMany({
      where: {
        id: target.id,
        version: target.version,
        ...(target.maxCapacity != null
          ? { currentCapacity: { lt: target.maxCapacity } }
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
      where: { id: target.id },
      select: { id: true, currentCapacity: true, maxCapacity: true, version: true, status: true },
    })
    if (!reread) throw new ValidationError('Evento destino desapareció')
    if (reread.maxCapacity != null && reread.currentCapacity >= reread.maxCapacity) {
      throw new EventFullError()
    }
    target = reread
  }
  if (!acquired) throw new EventFullError()

  const newConfirmationToken = nanoid(32)

  const oldEventId = attendee.eventId
  const result = await prisma.$transaction(async (tx) => {
    await tx.onboardingAttendee.update({
      where: { id: attendee.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: 'self',
        cancelledReason: 'reschedule',
        rescheduledAt: new Date(),
        rescheduledBy: 'self',
        rescheduledToEventId: target.id,
      },
    })
    await tx.onboardingEvent.updateMany({
      where: { id: oldEventId, currentCapacity: { gt: 0 } },
      data: {
        currentCapacity: { decrement: 1 },
        version: { increment: 1 },
      },
    })

    const newAttendee = await tx.onboardingAttendee.upsert({
      where: {
        eventId_formDriverId: {
          eventId: target.id,
          formDriverId: attendee.formDriverId,
        },
      },
      update: {
        status: 'SCHEDULED',
        confirmationToken: newConfirmationToken,
        invitedAt: new Date(),
        cancelledAt: null,
        cancelledBy: null,
        cancelledReason: null,
        rescheduledFrom: oldEventId,
        rescheduledAt: new Date(),
        rescheduledBy: 'self',
      },
      create: {
        eventId: target.id,
        formDriverId: attendee.formDriverId,
        status: 'SCHEDULED',
        confirmationToken: newConfirmationToken,
        invitedAt: new Date(),
        rescheduledFrom: oldEventId,
        rescheduledAt: new Date(),
        rescheduledBy: 'self',
      },
      include: { event: true },
    })

    await tx.formDriver.update({
      where: { id: attendee.formDriverId },
      data: {
        onboardingStatus: 'SCHEDULED',
        onboardingScheduledAt: newAttendee.event.scheduledDate,
      },
    })

    return newAttendee
  })

  return buildBookingResponse(newConfirmationToken, result.id, result.event)
}

// ==================== HELPERS ====================

interface EventForResponse {
  id: string
  scheduledDate: Date
  startTime: string
  endTime: string | null
  modality: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID' | null
  location: string | null
  locationAddress: string | null
  meetingLink: string | null
  title: string | null
  ruleSlug?: string | null // se popula cuando incluimos scheduleRule en el query
  instructions: string | null
  durationMinutes: number | null
}

function buildBookingResponse(
  confirmationToken: string,
  attendeeId: string,
  event: EventForResponse,
): BookingResponse {
  return buildBookingResponseFromEvent(confirmationToken, attendeeId, event)
}

function buildBookingResponseFromEvent(
  confirmationToken: string,
  attendeeId: string,
  event: EventForResponse,
): BookingResponse {
  const endTime =
    event.endTime ??
    (event.startTime && event.durationMinutes
      ? addEndtimeFallback(event.startTime, event.durationMinutes)
      : event.startTime ?? '')
  return {
    confirmationToken,
    eventId: event.id,
    attendeeId,
    scheduledDateUTC: event.scheduledDate.toISOString(),
    startTime: event.startTime,
    endTime,
    modality: (event.modality ?? 'IN_PERSON') as 'IN_PERSON' | 'VIRTUAL' | 'HYBRID',
    location: event.location,
    locationAddress: event.locationAddress,
    meetingLink: event.meetingLink,
    ruleTitle: event.title ?? 'Capacitación',
    ruleSlug: event.ruleSlug ?? '',
    instructions: event.instructions,
  }
}

function addEndtimeFallback(start: string, minutes: number): string {
  const [h, m] = start.split(':').map((s) => parseInt(s, 10))
  const total = h * 60 + m + minutes
  const nh = Math.floor((total % (24 * 60)) / 60)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}
