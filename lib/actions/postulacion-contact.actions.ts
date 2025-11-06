// lib/actions/postulacion-contact.actions.ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

/**
 * Rechaza una postulación completa (guarda estado anterior para restaurar)
 */
export async function rejectPostulacion(formDriverId: string) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    // Obtener info del driver para el audit log
    const driver = await prisma.formDriver.findUnique({
      where: { id: formDriverId },
      select: { 
        fullName: true, 
        cedula: true, 
        status: true,
        currentStep: true,
        completedSteps: true,
        metadata: true
      }
    })

    if (!driver) {
      throw new Error('Postulación no encontrada')
    }

    // Guardar el estado anterior en metadata para poder restaurarlo
    const previousState = {
      status: driver.status,
      currentStep: driver.currentStep,
      completedSteps: driver.completedSteps,
      rejectedAt: new Date().toISOString()
    }

    // Actualizar estado a REJECTED y guardar estado anterior
    const updatedDriver = await prisma.formDriver.update({
      where: { id: formDriverId },
      data: {
        status: 'REJECTED',
        metadata: {
          ...(driver.metadata as any || {}),
          previousState // Guardar estado anterior aquí
        },
        updatedAt: new Date()
      }
    })

    // Crear audit log
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'DRIVER_REJECTED',
        actionType: 'UPDATE',
        entityType: 'FormDriver',
        entityId: formDriverId,
        description: `Postulación rechazada: ${driver.fullName || driver.cedula}`,
        changes: {
          before: { status: driver.status },
          after: { status: 'REJECTED' }
        },
        metadata: { 
          driverName: driver.fullName,
          driverCedula: driver.cedula,
          previousState
        }
      }
    })

    // Revalidar la página
    revalidatePath('/admin/postulaciones')

    return { 
      success: true, 
      driver: updatedDriver 
    }
  } catch (error: any) {
    console.error('Error al rechazar postulación:', error)
    return { 
      success: false, 
      error: error.message || 'Error al rechazar postulación' 
    }
  }
}

/**
 * Habilita una postulación rechazada (restaura el estado anterior)
 */
export async function enablePostulacion(formDriverId: string) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    // Obtener info del driver para el audit log
    const driver = await prisma.formDriver.findUnique({
      where: { id: formDriverId },
      select: { 
        fullName: true, 
        cedula: true, 
        status: true,
        metadata: true
      }
    })

    if (!driver) {
      throw new Error('Postulación no encontrada')
    }

    if (driver.status !== 'REJECTED') {
      throw new Error('La postulación no está rechazada')
    }

    // Extraer el estado anterior de metadata
    const metadata = driver.metadata as any
    const previousState = metadata?.previousState

    // Determinar el estado a restaurar
    let statusToRestore = 'COMPLETED' // fallback por defecto
    let currentStepToRestore = 6
    let completedStepsToRestore = [1, 2, 3, 4, 5, 6]

    if (previousState) {
      statusToRestore = previousState.status || 'COMPLETED'
      currentStepToRestore = previousState.currentStep || 6
      completedStepsToRestore = previousState.completedSteps || [1, 2, 3, 4, 5, 6]
    }

    // Actualizar con el estado anterior
    const updatedDriver = await prisma.formDriver.update({
      where: { id: formDriverId },
      data: {
        status: statusToRestore as any,
        currentStep: currentStepToRestore,
        completedSteps: completedStepsToRestore,
        updatedAt: new Date()
      }
    })

    // Crear audit log
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'DRIVER_UPDATED',
        actionType: 'UPDATE',
        entityType: 'FormDriver',
        entityId: formDriverId,
        description: `Postulación habilitada: ${driver.fullName || driver.cedula}`,
        changes: {
          before: { status: 'REJECTED' },
          after: { status: statusToRestore }
        },
        metadata: { 
          driverName: driver.fullName,
          driverCedula: driver.cedula,
          restoredState: {
            status: statusToRestore,
            currentStep: currentStepToRestore,
            completedSteps: completedStepsToRestore
          }
        }
      }
    })

    // Revalidar la página
    revalidatePath('/admin/postulaciones')

    return { 
      success: true, 
      driver: updatedDriver 
    }
  } catch (error: any) {
    console.error('Error al habilitar postulación:', error)
    return { 
      success: false, 
      error: error.message || 'Error al habilitar postulación' 
    }
  }
}

/**
 * Registra que se contactó a un driver
 */
export async function registerDriverContact(
  formDriverId: string,
  contactMethod: 'WHATSAPP' | 'PHONE' | 'EMAIL' | 'IN_PERSON' | 'OTHER' = 'WHATSAPP'
) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    // Verificar que el driver existe
    const driver = await prisma.formDriver.findUnique({
      where: { id: formDriverId },
      select: { 
        fullName: true, 
        cedula: true, 
        phoneNumber: true,
        status: true 
      }
    })

    if (!driver) {
      throw new Error('Driver no encontrado')
    }

    // No permitir contactar postulaciones rechazadas
    if (driver.status === 'REJECTED') {
      throw new Error('No se puede contactar una postulación rechazada')
    }

    // Crear registro de contacto
    const contact = await prisma.driverContact.create({
      data: {
        formDriverId,
        contactMethod,
        contactedBy: userId,
        contactedAt: new Date(),
        metadata: {
          driverName: driver.fullName,
          driverPhone: driver.phoneNumber
        }
      }
    })

    // Crear audit log
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'DRIVER_CONTACTED',
        actionType: 'CREATE',
        entityType: 'DriverContact',
        entityId: contact.id,
        description: `Contacto registrado vía ${contactMethod}: ${driver.fullName || driver.cedula}`,
        metadata: {
          formDriverId,
          contactMethod,
          driverName: driver.fullName,
          driverCedula: driver.cedula
        }
      }
    })

    // Revalidar la página
    revalidatePath('/admin/postulaciones')

    return { 
      success: true, 
      contact 
    }
  } catch (error: any) {
    console.error('Error al registrar contacto:', error)
    return { 
      success: false, 
      error: error.message || 'Error al registrar contacto' 
    }
  }
}

/**
 * Obtiene todos los contactos de un driver
 */
export async function getDriverContacts(formDriverId: string) {
  try {
    const contacts = await prisma.driverContact.findMany({
      where: { formDriverId },
      include: {
        contactedByUser: {
          select: {
            fullName: true,
            email: true
          }
        }
      },
      orderBy: {
        contactedAt: 'desc'
      }
    })

    return { success: true, contacts }
  } catch (error: any) {
    console.error('Error al obtener contactos:', error)
    return { 
      success: false, 
      error: error.message,
      contacts: []
    }
  }
}

/**
 * Verifica si ya se contactó a un driver
 */
export async function hasBeenContacted(formDriverId: string): Promise<boolean> {
  try {
    const count = await prisma.driverContact.count({
      where: { formDriverId }
    })
    return count > 0
  } catch (error) {
    console.error('Error al verificar contacto:', error)
    return false
  }
}