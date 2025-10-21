// lib/actions/onboarding.actions.ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { onboardingService } from '@/lib/services/onboarding.service'
import { revalidatePath } from 'next/cache'

/**
 * Obtiene eventos disponibles para onboarding
 */
export async function getAvailableOnboardingEvents() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const events = await onboardingService.getAvailableEvents()
    return { success: true, events }
  } catch (error: any) {
    console.error('Error al obtener eventos:', error)
    return { success: false, error: error.message || 'Error al cargar eventos' }
  }
}

/**
 * Asigna un driver a un evento de onboarding
 */
export async function assignDriverToOnboardingEvent({
  eventId,
  driverId,
  notes
}: {
  eventId: string
  driverId: string
  notes?: string
}) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    if (!eventId || !driverId) {
      throw new Error('eventId y driverId son requeridos')
    }

    const attendee = await onboardingService.assignDriverToEvent({
      eventId,
      driverId,
      assignedBy: userId,
      notes
    })

    // Revalidar las páginas relevantes
    revalidatePath('/admin/postulaciones')
    revalidatePath(`/admin/postulaciones/${driverId}`)
    revalidatePath('/admin/onboarding')

    return { 
      success: true, 
      attendee,
      message: 'Driver asignado exitosamente al evento'
    }
  } catch (error: any) {
    console.error('Error al asignar driver:', error)
    return { 
      success: false, 
      error: error.message || 'Error al asignar driver al evento' 
    }
  }
}

/**
 * Obtiene el estado de onboarding de un driver
 */
export async function getDriverOnboardingStatus(driverId: string) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const status = await onboardingService.getDriverOnboardingStatus(driverId)
    return { success: true, status }
  } catch (error: any) {
    console.error('Error al obtener estado:', error)
    return { success: false, error: error.message || 'Error al obtener estado' }
  }
}