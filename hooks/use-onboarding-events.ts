// hooks/use-onboarding-events.ts

import { useState, useEffect } from 'react'
import { OnBoardingAPI } from '@/types/onboarding'
import type { OnboardingEventWithRelations, OnboardingEventStatus } from '@/types/onboarding'

export function useOnboardingEvents() {
  const [events, setEvents] = useState<OnboardingEventWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const api = new OnBoardingAPI()

  const fetchEvents = async (params?: {
    status?: OnboardingEventStatus
    upcoming?: boolean
    past?: boolean
  }) => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getEvents(params)
      setEvents(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar eventos'
      setError(errorMessage)
      console.error('Error fetching events:', err)
      
      // Si es un error de autenticación, mostrar mensaje más específico
      if (errorMessage.includes('401') || errorMessage.includes('No autorizado')) {
        setError('No tienes permisos para acceder a esta información. Por favor, inicia sesión.')
      } else if (errorMessage.includes('403') || errorMessage.includes('Usuario admin no encontrado')) {
        setError('No tienes permisos de administrador para acceder a esta información.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const createEvent = async (eventData: any) => {
    try {
      const newEvent = await api.createEvent(eventData)
      setEvents(prev => [...prev, newEvent])
      return { success: true, data: newEvent }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Error al crear evento' 
      }
    }
  }

  const updateEvent = async (eventId: string, eventData: any) => {
    try {
      const updatedEvent = await api.updateEvent(eventId, eventData)
      setEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e))
      return { success: true, data: updatedEvent }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Error al actualizar evento' 
      }
    }
  }

  const deleteEvent = async (eventId: string) => {
    try {
      await api.deleteEvent(eventId)
      setEvents(prev => prev.filter(e => e.id !== eventId))
      return { success: true }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Error al eliminar evento' 
      }
    }
  }

  return {
    events,
    loading,
    error,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  }
}