// hooks/use-onboarding-attendees.ts

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getOnboardingEventById,
  checkInAttendee,
  markAttendeeNoShow,
  cancelAttendee,
  confirmAttendee
} from '@/lib/actions/onboarding.actions'
import type { OnboardingAttendeeWithRelations } from '@/types/onboarding'

type EventAttendee = {
  id: string
  status: string
  formDriver: {
    id: string
    fullName: string | null
    phoneNumber: string
    email: string | null
    cedula: string
    documentsStatus: string
    equipmentPayments: any[]
  }
  [key: string]: any
}

export function useOnboardingAttendees(eventId?: string) {
  const [attendees, setAttendees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Ref para saber si ya se ejecutó el fetch inicial
  const initialFetchDone = useRef(false)

  const fetchAttendees = useCallback(async () => {
    if (!eventId) return
    
    try {
      setLoading(true)
      setError(null)
      
      const result = await getOnboardingEventById(eventId)
      
      if (result.success && result.event) {
        setAttendees((result.event.attendees || []) as any[])
      } else {
        setError(result.error || 'Error al cargar asistentes')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar asistentes')
      console.error('Error fetching attendees:', err)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  // Solo cargar attendees una vez al montar
  useEffect(() => {
    if (eventId && !initialFetchDone.current) {
      initialFetchDone.current = true
      fetchAttendees()
    }
  }, [eventId, fetchAttendees])

  const checkIn = async (attendeeId: string, notes?: string) => {
    try {
      const result = await checkInAttendee(attendeeId, notes)
      
      if (result.success && result.attendee) {
        setAttendees(prev => 
          prev.map(a => a.id === attendeeId ? result.attendee! as unknown as OnboardingAttendeeWithRelations : a)
        )
        return { success: true, data: result.attendee }
      } else {
        return { 
          success: false, 
          error: result.error || 'Error en check-in' 
        }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Error en check-in' 
      }
    }
  }

  const markNoShow = async (attendeeId: string) => {
    try {
      const result = await markAttendeeNoShow(attendeeId)
      
      if (result.success && result.attendee) {
        setAttendees(prev => 
          prev.map(a => a.id === attendeeId ? result.attendee! as unknown as OnboardingAttendeeWithRelations : a)
        )
        return { success: true, data: result.attendee }
      } else {
        return { 
          success: false, 
          error: result.error || 'Error al marcar no show' 
        }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Error al marcar no show' 
      }
    }
  }

  const cancel = async (attendeeId: string, reason?: string) => {
    try {
      const result = await cancelAttendee(attendeeId, reason)
      
      if (result.success) {
        // Refrescar la lista de asistentes
        await fetchAttendees()
        return { success: true }
      } else {
        return { 
          success: false, 
          error: result.error || 'Error al cancelar' 
        }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Error al cancelar' 
      }
    }
  }

  const confirm = async (attendeeId: string) => {
    try {
      const result = await confirmAttendee(attendeeId)
      
      if (result.success && result.attendee) {
        setAttendees(prev => 
          prev.map(a => a.id === attendeeId ? result.attendee! as unknown as OnboardingAttendeeWithRelations : a)
        )
        return { success: true, data: result.attendee }
      } else {
        return { 
          success: false, 
          error: result.error || 'Error al confirmar' 
        }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Error al confirmar' 
      }
    }
  }

  return {
    attendees,
    loading,
    error,
    fetchAttendees,
    checkIn,
    markNoShow,
    cancelAttendee: cancel,
    confirmAttendee: confirm,
  }
}