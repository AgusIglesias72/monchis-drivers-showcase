// lib/types/onboarding-rules.types.ts
//
// Contrato compartido entre backend (services + APIs) y frontend (admin UI + public UI)
// para el refresh de capacitaciones tipo Calendly. Cualquier cambio acá afecta los dos
// lados — actualizar de forma consciente.

import type {
  OnboardingModality,
  OnboardingFrequency,
  OnboardingExceptionType,
  OnboardingPaymentMode,
} from '@prisma/client'

export type {
  OnboardingModality,
  OnboardingFrequency,
  OnboardingExceptionType,
  OnboardingPaymentMode,
}

// ==================== LOCATIONS ====================

export interface SavedLocation {
  id: string
  name: string
  address: string
  googleMapsUrl: string
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LocationCreateInput {
  name: string
  address: string
  googleMapsUrl: string
  notes?: string | null
}

export type LocationUpdateInput = Partial<LocationCreateInput> & { isActive?: boolean }

// ==================== RULES ====================

export interface RuleSummary {
  id: string
  slug: string
  title: string
  description: string | null
  instructions: string | null

  modality: OnboardingModality
  locationId: string | null
  savedLocation: SavedLocation | null
  location: string | null // nombre legible (si no hay savedLocation)
  locationAddress: string | null
  googleMapsUrl: string | null
  locationLat: number | null // DEPRECATED — solo lectura para data legacy
  locationLng: number | null // DEPRECATED
  meetingLink: string | null
  meetingPlatform: string | null

  frequency: OnboardingFrequency
  daysOfWeek: number[] // 0=domingo..6=sábado
  startTime: string // "HH:MM"
  durationMinutes: number
  timezone: string

  validFrom: string // ISO
  validTo: string | null // ISO or null

  maxCapacity: number
  minNoticeHours: number
  maxFutureDays: number
  bufferBeforeMin: number
  bufferAfterMin: number
  cancelDeadlineHours: number
  paymentMode: OnboardingPaymentMode

  isActive: boolean
  isPublic: boolean

  defaultOrganizer: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface RuleWithRelations extends RuleSummary {
  exceptions: ScheduleException[]
  organizerName: string | null // full name del defaultOrganizer (para UI)
  upcomingEventsCount: number
  totalAttendeesCount: number
}

// ==================== EXCEPTIONS ====================

export interface ScheduleException {
  id: string
  ruleId: string
  date: string // ISO (00:00 en timezone de la rule)
  type: OnboardingExceptionType

  overrideStartTime: string | null
  overrideDurationMin: number | null
  overrideMaxCapacity: number | null
  overrideMeetingLink: string | null

  reason: string | null
  createdBy: string
  createdAt: string
}

// ==================== SLOTS (computados) ====================

export interface SlotResponse {
  ruleId: string
  ruleSlug: string
  ruleTitle: string
  modality: OnboardingModality

  // Identificación temporal
  date: string // YYYY-MM-DD (en tz de la rule)
  startTime: string // HH:MM
  endTime: string // HH:MM
  scheduledDateUTC: string // ISO UTC del inicio
  durationMinutes: number

  // Capacidad
  maxCapacity: number
  currentCapacity: number
  availableSlots: number
  isFull: boolean

  // Ventana de booking
  isPastNotice: boolean // true si está dentro de minNoticeHours
  isPast: boolean // ya pasó
  isOverride: boolean // el slot viene de una OnboardingScheduleException tipo OVERRIDE

  // Si ya está materializado en BD; null si todavía no (calculado dinámicamente)
  eventId: string | null
}

// ==================== INPUTS (admin form) ====================

export interface RuleCreateInput {
  slug: string
  title: string
  description?: string | null
  instructions?: string | null

  modality: OnboardingModality
  locationId?: string | null
  location?: string | null
  locationAddress?: string | null
  googleMapsUrl?: string | null
  meetingLink?: string | null
  meetingPlatform?: string | null

  frequency?: OnboardingFrequency // default WEEKLY
  daysOfWeek: number[]
  startTime: string
  durationMinutes: number
  timezone?: string // default America/Asuncion

  validFrom: string // ISO date
  validTo?: string | null

  maxCapacity?: number
  minNoticeHours?: number
  maxFutureDays?: number
  bufferBeforeMin?: number
  bufferAfterMin?: number
  cancelDeadlineHours?: number
  paymentMode?: OnboardingPaymentMode

  isActive?: boolean
  isPublic?: boolean

  defaultOrganizer: string // clerkId
}

export type RuleUpdateInput = Partial<RuleCreateInput>

export interface ExceptionCreateInput {
  ruleId: string
  date: string // YYYY-MM-DD
  type: OnboardingExceptionType
  overrideStartTime?: string | null
  overrideDurationMin?: number | null
  overrideMaxCapacity?: number | null
  overrideMeetingLink?: string | null
  reason?: string | null
}

// ==================== PUBLIC BOOKING ====================

export interface PublicBookingSessionInfo {
  shareToken: string
  expiresAt: string
  formDriver: {
    firstName: string | null
    lastName: string | null
    phoneMasked: string // "+595 9** *** 678"
    isEligible: boolean
    notEligibleReason: string | null
  }
}

export interface BookingCreateInput {
  shareToken: string
  // Una de las dos:
  eventId?: string // si el slot ya está materializado
  ruleId?: string
  scheduledDateUTC?: string // ISO; backend lo materializa si hace falta
  // Datos confirmados/editados por el driver en el dialog de confirmación.
  // Si vienen y difieren de los actuales del FormDriver, los actualizamos antes
  // de crear la reserva.
  confirmedProfile?: {
    firstName?: string
    lastName?: string
    cedula?: string
    phoneNumber?: string
    email?: string
  }
}

export interface BookingResponse {
  confirmationToken: string
  eventId: string
  attendeeId: string
  scheduledDateUTC: string
  startTime: string
  endTime: string
  modality: OnboardingModality
  location: string | null
  locationAddress: string | null
  meetingLink: string | null
  ruleTitle: string
  instructions: string | null
}

export interface BookingDetail extends BookingResponse {
  status: string
  cancelDeadlineHours: number
  canCancel: boolean // computado: status activo + dentro del deadline
  canReschedule: boolean
  cancelDeadlineUTC: string
  driverFirstName: string | null
  driverLastName: string | null
}

// ==================== HELPERS UI ====================

export const MODALITY_LABEL: Record<OnboardingModality, string> = {
  IN_PERSON: 'Presencial',
  VIRTUAL: 'Virtual',
  HYBRID: 'Híbrida',
}

export const MODALITY_ICON_NAME: Record<OnboardingModality, string> = {
  IN_PERSON: 'MapPin',
  VIRTUAL: 'Video',
  HYBRID: 'Zap',
}

export const DAY_NAMES_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const DAY_NAMES_ES_LONG = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
]
