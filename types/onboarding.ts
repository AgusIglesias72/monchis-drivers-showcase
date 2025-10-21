// types/onboarding.ts

import type { Prisma, OnboardingEventStatus, OnboardingAttendeeStatus, OnboardingStatus } from '@prisma/client'

// ==================== RE-EXPORTAR ENUMS DE PRISMA ====================

export type { OnboardingEventStatus, OnboardingAttendeeStatus, OnboardingStatus }

// ==================== TIPOS PERSONALIZADOS ====================

export type AttendeeAction = 
  | 'CHECK_IN'
  | 'MARK_NO_SHOW'
  | 'CANCEL'
  | 'RESCHEDULE'
  | 'CONFIRM'

// ==================== PRISMA PAYLOAD TYPES ====================

// Tipo para eventos con relaciones básicas (usado en listas)
export type OnboardingEventWithRelations = Prisma.OnboardingEventGetPayload<{
  include: {
    organizerUser: {
      select: {
        id: true
        email: true
        fullName: true
      }
    }
    attendees: true
  }
}>

// Tipo para asistentes con relaciones completas
export type OnboardingAttendeeWithRelations = Prisma.OnboardingAttendeeGetPayload<{
  include: {
    event: {
      select: {
        id: true
        title: true
        scheduledDate: true
        startTime: true
        location: true
      }
    }
    formDriver: {
      select: {
        id: true
        fullName: true
        phoneNumber: true
        email: true
        documentsStatus: true
        onboardingStatus: true
      }
    }
    invitedByUser: {
      select: {
        id: true
        fullName: true
        email: true
      }
    }
  }
}>

// ==================== API REQUEST TYPES ====================

export interface CreateEventRequest {
  title: string
  description?: string
  scheduledDate: string | Date
  startTime: string
  endTime?: string
  location?: string
  locationAddress?: string
  meetingLink?: string
  maxCapacity?: number
  reminderHoursBefore?: number
  status?: OnboardingEventStatus
  notes?: string
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {}

export interface AssignDriversRequest {
  eventId: string
  formDriverIds: string[]
  attendeeNotes?: string
}

export interface UpdateAttendeeRequest {
  action: AttendeeAction
  attendeeNotes?: string
  newEventId?: string
}

export interface CompleteEventRequest {
  eventId: string
  notes?: string
}

export interface SendRemindersRequest {
  eventId: string
}

export interface PublicConfirmRequest {
  token: string
  action: 'confirm' | 'cancel'
}

// ==================== API RESPONSE TYPES ====================

export interface EligibleDriver {
  id: string
  fullName: string | null
  phoneNumber: string
  email: string | null
  documentsStatus: string
  onboardingStatus: string | null
  onboardingScheduledAt: Date | null
  isAssignedToOtherEvent: boolean
  canBeSelected: boolean
  disabledReason: string | null
  assignedEvent: {
    id: string
    title: string
    scheduledDate: Date
  } | null
}

export interface EligibleDriversResponse {
  drivers: EligibleDriver[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

export interface DashboardStats {
  recentCompleted: number
  pendingDrivers: number
  inProgressDrivers: number
  attendanceRate: number
  recentNoShows: number
}

export interface DashboardResponse {
  upcomingEvents: OnboardingEventWithRelations[]
  stats: DashboardStats
}

export interface CompleteEventResponse {
  success: boolean
  event: OnboardingEventWithRelations
  driversCompleted: number
}

export interface AssignDriversResponse {
  success: boolean
  attendees: OnboardingAttendeeWithRelations[]
  message: string
}

export interface SendRemindersResponse {
  success: boolean
  remindersSent: number
  message: string
}

export interface PublicEventInfoResponse {
  attendee: {
    id: string
    status: OnboardingAttendeeStatus
    confirmedAt: Date | null
    driver: {
      id: string
      fullName: string | null
      phoneNumber: string
      email: string | null
    }
  }
  event: {
    id: string
    title: string
    description: string | null
    scheduledDate: Date
    startTime: string
    endTime: string | null
    location: string | null
    locationAddress: string | null
    meetingLink: string | null
    status: OnboardingEventStatus
  }
}

export interface PublicConfirmResponse {
  success: boolean
  message: string
  attendee: OnboardingAttendeeWithRelations
}

// ==================== API CLIENT HELPER ====================
// NOTA: Esta clase todavía se usa en algunos componentes legacy
// Eventualmente migraremos todo a Server Actions

export class OnBoardingAPI {
  private baseUrl: string

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl
  }

  // ==================== EVENTS ====================

  async getEvents(params?: {
    status?: OnboardingEventStatus
    upcoming?: boolean
    past?: boolean
  }): Promise<OnboardingEventWithRelations[]> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.set('status', params.status)
    if (params?.upcoming) queryParams.set('upcoming', 'true')
    if (params?.past) queryParams.set('past', 'true')

    const query = queryParams.toString()
    const url = `${this.baseUrl}/onboarding/events${query ? `?${query}` : ''}`
    
    const response = await fetch(url)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`
      throw new Error(`Failed to fetch events: ${errorMessage}`)
    }
    return response.json()
  }

  async createEvent(data: CreateEventRequest): Promise<OnboardingEventWithRelations> {
    const response = await fetch(`${this.baseUrl}/onboarding/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to create event')
    return response.json()
  }

  async updateEvent(eventId: string, data: UpdateEventRequest): Promise<OnboardingEventWithRelations> {
    const response = await fetch(`${this.baseUrl}/onboarding/events?id=${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update event')
    return response.json()
  }

  async deleteEvent(eventId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/onboarding/events?id=${eventId}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete event')
    return response.json()
  }

  // ==================== ATTENDEES ====================

  async getAttendees(params: {
    eventId?: string
    formDriverId?: string
  }): Promise<OnboardingAttendeeWithRelations[]> {
    const queryParams = new URLSearchParams()
    if (params.eventId) queryParams.set('eventId', params.eventId)
    if (params.formDriverId) queryParams.set('formDriverId', params.formDriverId)

    const query = queryParams.toString()
    const url = `${this.baseUrl}/onboarding/attendees${query ? `?${query}` : ''}`
    
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch attendees')
    return response.json()
  }

  async updateAttendee(attendeeId: string, data: UpdateAttendeeRequest): Promise<OnboardingAttendeeWithRelations> {
    const response = await fetch(`${this.baseUrl}/onboarding/attendees?id=${attendeeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update attendee')
    return response.json()
  }

  // ==================== ACTIONS ====================

  async assignDrivers(data: AssignDriversRequest): Promise<AssignDriversResponse> {
    const response = await fetch(`${this.baseUrl}/onboarding/actions/assign-drivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to assign drivers')
    return response.json()
  }

  async getEligibleDrivers(params: {
    eventId: string
    page?: number
    limit?: number
    search?: string
  }): Promise<EligibleDriversResponse> {
    const queryParams = new URLSearchParams()
    if (params.eventId) queryParams.set('eventId', params.eventId)
    if (params.page) queryParams.set('page', params.page.toString())
    if (params.limit) queryParams.set('limit', params.limit.toString())
    if (params.search) queryParams.set('search', params.search)

    const query = queryParams.toString()
    const url = `${this.baseUrl}/onboarding/actions/eligible-drivers${query ? `?${query}` : ''}`
    
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch eligible drivers')
    return response.json()
  }

  async getDashboard(): Promise<DashboardResponse> {
    const response = await fetch(`${this.baseUrl}/onboarding/actions/dashboard`)
    if (!response.ok) throw new Error('Failed to fetch dashboard')
    return response.json()
  }

  async completeEvent(data: CompleteEventRequest): Promise<CompleteEventResponse> {
    const response = await fetch(`${this.baseUrl}/onboarding/actions/complete-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to complete event')
    return response.json()
  }

  async sendReminders(data: SendRemindersRequest): Promise<SendRemindersResponse> {
    const response = await fetch(`${this.baseUrl}/onboarding/actions/send-reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to send reminders')
    return response.json()
  }

  // ==================== PUBLIC ====================

  async getPublicEventInfo(token: string): Promise<PublicEventInfoResponse> {
    const response = await fetch(`${this.baseUrl}/public/onboarding/confirm?token=${token}`)
    if (!response.ok) throw new Error('Invalid token or event not found')
    return response.json()
  }

  async confirmAttendance(data: PublicConfirmRequest): Promise<PublicConfirmResponse> {
    const response = await fetch(`${this.baseUrl}/public/onboarding/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to confirm attendance')
    return response.json()
  }
}

// ==================== HELPER FUNCTIONS ====================

export function getEventStatusLabel(status: OnboardingEventStatus): string {
  const labels: Record<OnboardingEventStatus, string> = {
    DRAFT: 'Borrador',
    SCHEDULED: 'Programado',
    IN_PROGRESS: 'En Curso',
    COMPLETED: 'Completado',
    CANCELLED: 'Cancelado',
    POSTPONED: 'Pospuesto',
  }
  return labels[status]
}

export function getAttendeeStatusLabel(status: OnboardingAttendeeStatus): string {
  const labels: Record<OnboardingAttendeeStatus, string> = {
    INVITED: 'Invitado',
    CONFIRMED: 'Confirmado',
    ATTENDED: 'Asistió',
    NO_SHOW: 'No Asistió',
    SCHEDULED: 'Agendado',  
    CANCELLED: 'Cancelado',
    RESCHEDULED: 'Reagendado',
  }
  return labels[status]
}

export function getAttendeeStatusColor(status: OnboardingAttendeeStatus): string {
  const colors: Record<OnboardingAttendeeStatus, string> = {
    INVITED: 'gray',
    CONFIRMED: 'blue',
    ATTENDED: 'green',
    NO_SHOW: 'red',
    SCHEDULED: 'yellow',
    CANCELLED: 'orange',
    RESCHEDULED: 'purple',
  }
  return colors[status]
}

export function canCheckIn(attendee: { status: OnboardingAttendeeStatus }): boolean {
  return ['INVITED', 'CONFIRMED'].includes(attendee.status)
}

export function canReschedule(attendee: { status: OnboardingAttendeeStatus }): boolean {
  return ['INVITED', 'CONFIRMED', 'NO_SHOW'].includes(attendee.status)
}

export function canCancel(attendee: { status: OnboardingAttendeeStatus }): boolean {
  return ['INVITED', 'CONFIRMED'].includes(attendee.status)
}