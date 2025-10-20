// hooks/use-onboarding-attendees.ts

import { useState, useEffect } from 'react'
import { OnBoardingAPI } from '@/types/onboarding'
import type { 
  OnboardingAttendeeWithRelations, 
  AttendeeAction,
  EligibleDriver,
  EligibleDriversResponse
} from '@/types/onboarding'

export function useOnboardingAttendees(eventId?: string) {
  const [attendees, setAttendees] = useState<OnboardingAttendeeWithRelations[]>([])
  const [eligibleDriversData, setEligibleDriversData] = useState<EligibleDriversResponse>({
    drivers: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasMore: false,
    }
  })
  const [loading, setLoading] = useState(true)
  const [loadingDrivers, setLoadingDrivers] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const api = new OnBoardingAPI()

  const fetchAttendees = async () => {
    if (!eventId) return
    
    try {
      setLoading(true)
      setError(null)
      const data = await api.getAttendees({ eventId })
      setAttendees(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar asistentes')
      console.error('Error fetching attendees:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchEligibleDrivers = async (params?: {
    page?: number
    search?: string
  }) => {
    if (!eventId) return
    
    try {
      setLoadingDrivers(true)
      const data = await api.getEligibleDrivers({
        eventId,
        page: params?.page || 1,
        limit: 10,
        search: params?.search,
      })
      setEligibleDriversData(data)
    } catch (err) {
      console.error('Error fetching eligible drivers:', err)
    } finally {
      setLoadingDrivers(false)
    }
  }

  useEffect(() => {
    fetchAttendees()
    fetchEligibleDrivers()
  }, [eventId])

  const assignDrivers = async (formDriverIds: string[], notes?: string) => {
    if (!eventId) return { success: false, error: 'No event ID' }
    
    try {
      const result = await api.assignDrivers({
        eventId,
        formDriverIds,
        attendeeNotes: notes,
      })
      
      // Actualizar listas
      await fetchAttendees()
      await fetchEligibleDrivers()
      
      return { success: true, data: result }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Error al asignar drivers' 
      }
    }
  }

  const updateAttendee = async (
    attendeeId: string, 
    action: AttendeeAction,
    data?: { attendeeNotes?: string; newEventId?: string }
  ) => {
    try {
      const updatedAttendee = await api.updateAttendee(attendeeId, {
        action,
        ...data,
      })
      
      // Actualizar en la lista
      setAttendees(prev => 
        prev.map(a => a.id === attendeeId ? updatedAttendee : a)
      )
      
      return { success: true, data: updatedAttendee }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Error al actualizar asistente' 
      }
    }
  }

  const checkIn = async (attendeeId: string, notes?: string) => {
    return updateAttendee(attendeeId, 'CHECK_IN', { attendeeNotes: notes })
  }

  const markNoShow = async (attendeeId: string) => {
    return updateAttendee(attendeeId, 'MARK_NO_SHOW')
  }

  const cancelAttendee = async (attendeeId: string, reason?: string) => {
    return updateAttendee(attendeeId, 'CANCEL', { attendeeNotes: reason })
  }

  const confirmAttendee = async (attendeeId: string) => {
    return updateAttendee(attendeeId, 'CONFIRM')
  }

  const rescheduleAttendee = async (attendeeId: string, newEventId: string, notes?: string) => {
    return updateAttendee(attendeeId, 'RESCHEDULE', { 
      newEventId, 
      attendeeNotes: notes 
    })
  }

  return {
    attendees,
    eligibleDrivers: eligibleDriversData.drivers,
    pagination: eligibleDriversData.pagination,
    loading,
    loadingDrivers,
    error,
    fetchAttendees,
    fetchEligibleDrivers,
    assignDrivers,
    checkIn,
    markNoShow,
    cancelAttendee,
    confirmAttendee,
    rescheduleAttendee,
  }
}