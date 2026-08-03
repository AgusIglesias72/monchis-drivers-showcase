// lib/actions/postulacion-archive.actions.ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function archivePostulacion(formDriverId: string) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    const driver = await prisma.formDriver.findUnique({
      where: { id: formDriverId },
      select: { fullName: true, cedula: true, archivedAt: true },
    })

    if (!driver) throw new Error('Postulación no encontrada')
    if (driver.archivedAt) throw new Error('La postulación ya está archivada')

    const updatedDriver = await prisma.formDriver.update({
      where: { id: formDriverId },
      data: {
        archivedAt: new Date(),
        archivedBy: userId,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'DRIVER_UPDATED',
        actionType: 'UPDATE',
        entityType: 'FormDriver',
        entityId: formDriverId,
        description: `Postulación archivada: ${driver.fullName || driver.cedula}`,
        changes: {
          before: { archivedAt: null },
          after: { archivedAt: updatedDriver.archivedAt?.toISOString() },
        },
        metadata: {
          driverName: driver.fullName,
          driverCedula: driver.cedula,
        },
      },
    })

    revalidatePath('/admin/postulaciones')

    return { success: true, driver: updatedDriver }
  } catch (error: any) {
    console.error('Error al archivar postulación:', error)
    return {
      success: false,
      error: error.message || 'Error al archivar postulación',
    }
  }
}

export async function unarchivePostulacion(formDriverId: string) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    const driver = await prisma.formDriver.findUnique({
      where: { id: formDriverId },
      select: { fullName: true, cedula: true, archivedAt: true },
    })

    if (!driver) throw new Error('Postulación no encontrada')
    if (!driver.archivedAt) throw new Error('La postulación no está archivada')

    const updatedDriver = await prisma.formDriver.update({
      where: { id: formDriverId },
      data: {
        archivedAt: null,
        archivedBy: null,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'DRIVER_UPDATED',
        actionType: 'UPDATE',
        entityType: 'FormDriver',
        entityId: formDriverId,
        description: `Postulación desarchivada: ${driver.fullName || driver.cedula}`,
        changes: {
          before: { archivedAt: driver.archivedAt.toISOString() },
          after: { archivedAt: null },
        },
        metadata: {
          driverName: driver.fullName,
          driverCedula: driver.cedula,
        },
      },
    })

    revalidatePath('/admin/postulaciones')

    return { success: true, driver: updatedDriver }
  } catch (error: any) {
    console.error('Error al desarchivar postulación:', error)
    return {
      success: false,
      error: error.message || 'Error al desarchivar postulación',
    }
  }
}
