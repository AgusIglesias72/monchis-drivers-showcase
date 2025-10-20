// hooks/use-onboarding-attendees.ts

import { useState, useEffect, useCallback, useRef } from 'react'
import { OnBoardingAPI } from '@/types/onboarding'
import type { 
  OnboardingAttendeeWithRelations, 
  AttendeeAction,
} from '@/types/onboarding'

export function useOnboardingAttendees(eventId?: string) {
  const [attendees, setAttendees] = useState<OnboardingAttendeeWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Ref para mantener la misma instancia del API
  const apiRef = useRef(new OnBoardingAPI())
  // Ref para saber si ya se ejecutó el fetch inicial
  const initialFetchDone = useRef(false)

  const fetchAttendees = useCallback(async () => {
    if (!eventId) return
    
    try {
      setLoading(true)
      setError(null)
      const data = await apiRef.current.getAttendees({ eventId })
      setAttendees(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar asistentes')
      console.error('Error fetching attendees:', err)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  // ✅ SOLO cargar attendees una vez al montar
  useEffect(() => {
    if (eventId && !initialFetchDone.current) {
      initialFetchDone.current = true
      fetchAttendees()
    }
  }, [eventId, fetchAttendees])

  const updateAttendee = async (
    attendeeId: string, 
    action: AttendeeAction,
    data?: { attendeeNotes?: string; newEventId?: string }
  ) => {
    try {
      const updatedAttendee = await apiRef.current.updateAttendee(attendeeId, {
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
    loading,
    error,
    fetchAttendees,
    checkIn,
    markNoShow,
    cancelAttendee,
    confirmAttendee,
    rescheduleAttendee,
  }
}