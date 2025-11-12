'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function markAssistedCompletion(driverId: string) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return { success: false, error: 'No autenticado' }
    }

    await prisma.formDriver.update({
      where: { id: driverId },
      data: {
        assistedCompletion: true,
        assistedCompletionBy: userId,
        assistedCompletionAt: new Date(),
      }
    })

    revalidatePath('/admin/postulaciones')
    return { success: true }
  } catch (error) {
    console.error('Error marking assisted completion:', error)
    return { success: false, error: 'Error al marcar como asistida' }
  }
}

export async function unmarkAssistedCompletion(driverId: string) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return { success: false, error: 'No autenticado' }
    }

    await prisma.formDriver.update({
      where: { id: driverId },
      data: {
        assistedCompletion: false,
        assistedCompletionBy: null,
        assistedCompletionAt: null,
      }
    })

    revalidatePath('/admin/postulaciones')
    return { success: true }
  } catch (error) {
    console.error('Error unmarking assisted completion:', error)
    return { success: false, error: 'Error al desmarcar como asistida' }
  }
}