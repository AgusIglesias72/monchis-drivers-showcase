// lib/actions/postulacion.actions.ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { postulacionService } from '@/lib/services/postulacion.service'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

/**
 * Actualiza datos básicos de una postulación
 */
export async function updatePostulacion(id: string, data: any) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    await postulacionService.updatePostulacion(id, data)

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'DRIVER_UPDATED',
        actionType: 'UPDATE',
        entityType: 'FormDriver',
        entityId: id,
        description: `Datos actualizados para ${data.fullName || data.firstName}`,
        metadata: data
      }
    })

    revalidatePath(`/admin/postulaciones/${id}`)
    revalidatePath('/admin/postulaciones')

    return { success: true, message: 'Postulación actualizada exitosamente' }
  } catch (error: any) {
    console.error('Error al actualizar postulación:', error)
    return { success: false, error: error.message || 'Error al actualizar' }
  }
}

/**
 * Actualiza información de pago
 */
export async function updatePayment(postulacionId: string, paymentData: any) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    await postulacionService.updatePayment(postulacionId, paymentData, userId)

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: paymentData.status === 'VERIFIED' ? 'PAYMENT_VERIFIED' : 'PAYMENT_CREATED',
        actionType: 'UPDATE',
        entityType: 'EquipmentPayment',
        entityId: postulacionId,
        description: `Pago ${paymentData.status === 'VERIFIED' ? 'verificado' : 'actualizado'}`,
        metadata: paymentData
      }
    })

    revalidatePath(`/admin/postulaciones/${postulacionId}`)
    revalidatePath('/admin/postulaciones')

    return { success: true, message: 'Pago actualizado exitosamente' }
  } catch (error: any) {
    console.error('Error al actualizar pago:', error)
    return { success: false, error: error.message || 'Error al actualizar pago' }
  }
}

/**
 * Crea una nota interna
 */
export async function createNote(postulacionId: string, content: string) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    const note = await prisma.formNote.create({
      data: {
        formDriverId: postulacionId,
        content,
        createdBy: userId,
      },
      include: {
        createdByUser: {
          select: {
            firstName: true,
            fullName: true,
          }
        }
      }
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'NOTE_CREATED',
        actionType: 'CREATE',
        entityType: 'InternalNote',
        entityId: note.id,
        description: 'Nota interna creada',
        metadata: { content }
      }
    })

    revalidatePath(`/admin/postulaciones/${postulacionId}`)

    return { success: true, note }
  } catch (error: any) {
    console.error('Error al crear nota:', error)
    return { success: false, error: error.message || 'Error al crear nota' }
  }
}

/**
 * Actualiza una nota interna
 */
export async function updateNote(noteId: string, content: string) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    const note = await prisma.formNote.update({
      where: { id: noteId },
      data: { content },
      include: {
        createdByUser: {
          select: {
            firstName: true,
            fullName: true,
          }
        }
      }
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'NOTE_UPDATED',
        actionType: 'UPDATE',
        entityType: 'InternalNote',
        entityId: noteId,
        description: 'Nota interna actualizada',
        metadata: { content }
      }
    })

    revalidatePath(`/admin/postulaciones/${note.formDriverId}`)

    return { success: true, note }
  } catch (error: any) {
    console.error('Error al actualizar nota:', error)
    return { success: false, error: error.message || 'Error al actualizar nota' }
  }
}

/**
 * Elimina una nota interna
 */
export async function deleteNote(noteId: string) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    const note = await prisma.formNote.findUnique({
      where: { id: noteId }
    })

    if (!note) throw new Error('Nota no encontrada')

    await prisma.formNote.delete({
      where: { id: noteId }
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'NOTE_DELETED',
        actionType: 'DELETE',
        entityType: 'InternalNote',
        entityId: noteId,
        description: 'Nota interna eliminada',
        metadata: { noteId }
      }
    })

    revalidatePath(`/admin/postulaciones/${note.formDriverId}`)

    return { success: true }
  } catch (error: any) {
    console.error('Error al eliminar nota:', error)
    return { success: false, error: error.message || 'Error al eliminar nota' }
  }
}

/**
 * Aprueba un documento
 */
export async function approveDocument(documentId: string) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    const document = await prisma.formDocument.update({
      where: { id: documentId },
      data: {
        status: 'APPROVED',
        reviewedBy: userId,
        reviewedAt: new Date(),
      }
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'DOCUMENT_APPROVED',
        actionType: 'UPDATE',
        entityType: 'FormDocument',
        entityId: documentId,
        description: `Documento aprobado: ${document.documentType}`,
        metadata: { documentId }
      }
    })

    revalidatePath(`/admin/postulaciones`)

    return { success: true, document }
  } catch (error: any) {
    console.error('Error al aprobar documento:', error)
    return { success: false, error: error.message || 'Error al aprobar documento' }
  }
}

/**
 * Rechaza un documento
 */
export async function rejectDocument(documentId: string, reason: string) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    const document = await prisma.formDocument.update({
      where: { id: documentId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedBy: userId,
        reviewedAt: new Date(),
      }
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'DOCUMENT_REJECTED',
        actionType: 'UPDATE',
        entityType: 'FormDocument',
        entityId: documentId,
        description: `Documento rechazado: ${document.documentType}`,
        metadata: { documentId, reason }
      }
    })

    revalidatePath(`/admin/postulaciones`)

    return { success: true, document }
  } catch (error: any) {
    console.error('Error al rechazar documento:', error)
    return { success: false, error: error.message || 'Error al rechazar documento' }
  }
}

/**
 * Elimina un documento
 */
export async function deleteDocument(documentId: string) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    await prisma.formDocument.delete({
      where: { id: documentId }
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'DOCUMENT_DELETED',
        actionType: 'DELETE',
        entityType: 'FormDocument',
        entityId: documentId,
        description: 'Documento eliminado',
        metadata: { documentId }
      }
    })

    revalidatePath(`/admin/postulaciones`)

    return { success: true }
  } catch (error: any) {
    console.error('Error al eliminar documento:', error)
    return { success: false, error: error.message || 'Error al eliminar documento' }
  }
}

// ✅ NOTA: La función uploadDocument fue ELIMINADA
// Ahora usamos el API route: /api/postulaciones/documents/upload