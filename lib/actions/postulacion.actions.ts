// lib/actions/postulacion.actions.ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { postulacionService } from '@/lib/services/postulacion.service'
import { revalidatePath } from 'next/cache'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/prisma'
import { DocumentType } from '@prisma/client'

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
export async function createNote(formDriverId: string, content: string) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    const note = await postulacionService.createNote(formDriverId, content, userId)

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'NOTE_CREATED',
        actionType: 'CREATE',
        entityType: 'FormNote',
        entityId: note.id,
        description: `Nota agregada: ${content.substring(0, 50)}...`,
        metadata: { formDriverId, content }
      }
    })

    revalidatePath(`/admin/postulaciones/${formDriverId}`)

    return { success: true, note }
  } catch (error: any) {
    console.error('Error al crear nota:', error)
    return { success: false, error: error.message || 'Error al crear nota' }
  }
}

/**
 * Aprueba un documento
 */
export async function approveDocument(documentId: string) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    const document = await postulacionService.approveDocument(documentId, userId)

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
        metadata: { documentId, documentType: document.documentType }
      }
    })

    revalidatePath(`/admin/postulaciones/${document.formDriverId}`)
    revalidatePath('/admin/postulaciones')

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

    const document = await postulacionService.rejectDocument(documentId, reason, userId)

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

    revalidatePath(`/admin/postulaciones/${document.formDriverId}`)
    revalidatePath('/admin/postulaciones')

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

    const document = await postulacionService.deleteDocument(documentId)

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'DOCUMENT_DELETED',
        actionType: 'DELETE',
        entityType: 'FormDocument',
        entityId: documentId,
        description: `Documento eliminado`,
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

/**
 * Sube un documento
 */
export async function uploadDocument(formData: FormData) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('No autorizado')

    const file = formData.get('file') as File
    const formDriverId = formData.get('formDriverId') as string
    const documentType = formData.get('documentType') as string

    if (!file || !formDriverId || !documentType) {
      throw new Error('Faltan datos requeridos')
    }

    // Subir a Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    // Crear documento en BD
    const document = await prisma.formDocument.create({
      data: {
        formDriverId,
        documentType: documentType as DocumentType,
        fileName: file.name,
        blobUrl: blob.url,
        fileSize: file.size,
        mimeType: file.type,
        status: 'PENDING',
        uploadedBy: userId,
      }
    })

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: 'admin',
        action: 'DOCUMENT_UPLOADED',
        actionType: 'CREATE',
        entityType: 'FormDocument',
        entityId: document.id,
        description: `Documento subido: ${documentType}`,
        metadata: { formDriverId, documentType, fileName: file.name }
      }
    })

    revalidatePath(`/admin/postulaciones/${formDriverId}`)
    revalidatePath('/admin/postulaciones')

    return { success: true, document }
  } catch (error: any) {
    console.error('Error al subir documento:', error)
    return { success: false, error: error.message || 'Error al subir documento' }
  }
}