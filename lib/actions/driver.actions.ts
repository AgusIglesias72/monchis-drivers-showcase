// lib/actions/driver.actions.ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { postulacionService } from '@/lib/services/postulacion.service'

/**
 * Obtiene los datos completos de un driver usando el servicio de postulaciones
 */
export async function getDriverById(driverId: string) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error('No autorizado')
    }

    const driver = await postulacionService.getPostulacionById(driverId)
    
    if (!driver) {
      return { success: false, error: 'Driver no encontrado', driver: null }
    }

    // Serializar fechas para el cliente
    const serializedDriver = {
      ...driver,
      startedAt: driver.startedAt.toISOString(),
      completedAt: driver.completedAt?.toISOString() || null,
      birthDate: driver.birthDate || null,
      onboardingScheduledAt: driver.onboardingScheduledAt?.toISOString() || null,
      onboardingCompletedAt: driver.onboardingCompletedAt?.toISOString() || null,
      
      documents: driver.documents.map((doc: any) => ({
        ...doc,
        uploadedAt: doc.uploadedAt.toISOString(),
        reviewedAt: doc.reviewedAt?.toISOString() || null,
      })),
      
      equipmentPayments: driver.equipmentPayments.map((payment: any) => ({
        ...payment,
        paymentDate: payment.paymentDate?.toISOString() || null,
        verifiedAt: payment.verifiedAt?.toISOString() || null,
        createdAt: payment.createdAt.toISOString(),
      })),
      
      onboardingAttendances: driver.onboardingAttendances.map((attendance: any) => ({
        ...attendance,
        confirmedAt: attendance.confirmedAt?.toISOString() || null,
        checkedInAt: attendance.checkedInAt?.toISOString() || null,
        markedNoShowAt: attendance.markedNoShowAt?.toISOString() || null,
        cancelledAt: attendance.cancelledAt?.toISOString() || null,
        invitedAt: attendance.invitedAt.toISOString(),
        event: attendance.event ? {
          ...attendance.event,
          scheduledDate: attendance.event.scheduledDate.toISOString(),
        } : null
      })),

      notes: driver.notes?.map((note: any) => ({
        ...note,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      })) || []
    }

    return { success: true, driver: serializedDriver }
  } catch (error: any) {
    console.error('Error al obtener driver:', error)
    return { 
      success: false, 
      error: error.message || 'Error al cargar driver',
      driver: null 
    }
  }
}