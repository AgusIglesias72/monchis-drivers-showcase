// lib/actions/postulacion.actions.ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { postulacionService } from '@/lib/services/postulacion.service'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { messagesService } from '@/lib/services/messages.service'
import { WhatsAppMessageType, WhatsAppMessageSource } from '@prisma/client'

/**
 * Actualiza datos básicos de una postulación
 * ✅ Solo revalida la LISTA, no el detalle (actualización optimista en cliente)
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

    // ✅ Solo revalidar la lista, NO el detalle
    revalidatePath('/admin/postulaciones')

    return { success: true, message: 'Postulación actualizada exitosamente' }
  } catch (error: any) {
    console.error('Error al actualizar postulación:', error)
    return { success: false, error: error.message || 'Error al actualizar' }
  }
}

/**
 * Actualiza información de pago
 * ✅ Solo revalida la LISTA, no el detalle
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

    // ✅ Solo revalidar la lista
    revalidatePath('/admin/postulaciones')

    return { success: true, message: 'Pago actualizado exitosamente' }
  } catch (error: any) {
    console.error('Error al actualizar pago:', error)
    return { success: false, error: error.message || 'Error al actualizar pago' }
  }
}

/**
 * Crea una nota interna
 * ✅ No revalida nada (actualización optimista)
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

    // ✅ No revalidar - el cliente ya actualizó optimísticamente
    // El router.refresh() con delay en el cliente sincronizará después

    return { success: true, note }
  } catch (error: any) {
    console.error('Error al crear nota:', error)
    return { success: false, error: error.message || 'Error al crear nota' }
  }
}

/**
 * Actualiza una nota interna
 * ✅ No revalida nada (actualización optimista)
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

    // ✅ No revalidar - actualización optimista

    return { success: true, note }
  } catch (error: any) {
    console.error('Error al actualizar nota:', error)
    return { success: false, error: error.message || 'Error al actualizar nota' }
  }
}

/**
 * Elimina una nota interna
 * ✅ No revalida nada (actualización optimista)
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

    // ✅ No revalidar - actualización optimista

    return { success: true }
  } catch (error: any) {
    console.error('Error al eliminar nota:', error)
    return { success: false, error: error.message || 'Error al eliminar nota' }
  }
}

/**
 * Aprueba un documento
 * ✅ Solo revalida la lista
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

    // ✅ Solo revalidar la lista para que se actualicen badges/contadores
    revalidatePath('/admin/postulaciones')

    return { success: true, document }
  } catch (error: any) {
    console.error('Error al aprobar documento:', error)
    return { success: false, error: error.message || 'Error al aprobar documento' }
  }
}

/**
 * Rechaza un documento
 * ✅ Solo revalida la lista
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

    // Enviar notificación de WhatsApp si es un documento de Antecedentes Penales
    const isCriminalRecord = document.documentType === 'CRIMINAL_RECORD'

    if (isCriminalRecord) {
      try {
        // Obtener información del conductor para enviar el mensaje
        const driver = await prisma.formDriver.findUnique({
          where: { id: document.formDriverId },
          select: {
            id: true,
            phoneNumber: true,
            fullName: true,
          }
        })

        if (driver && driver.phoneNumber && driver.fullName) {
          // Extraer primer nombre
          const firstName = driver.fullName.split(' ')[0]

          // Enviar mensaje de WhatsApp
          const messageResult = await messagesService.sendWhatsAppMessage({
            phone: driver.phoneNumber,
            name: firstName,
            type: WhatsAppMessageType.DOCUMENT_REJECTED,
            formDriverId: driver.id,
            source: WhatsAppMessageSource.TRIGGER,
            botId: 'bot-adquisicion-prod',
            metadata: {
              documentType: document.documentType,
              documentTypeName: 'Certificado de Antecedentes Penales',
              rejectionReason: reason,
              rejectedAt: new Date().toISOString(),
              documentId: document.id,
              triggeredBy: 'document_rejection',
              adminId: userId,
            },
          })

          console.log('✅ WhatsApp message sent for document rejection:', messageResult)
        } else {
          console.warn('⚠️ No se pudo enviar WhatsApp: conductor sin teléfono o nombre')
        }
      } catch (whatsappError) {
        // No fallar el rechazo si falla el envío de WhatsApp
        console.error('❌ Error al enviar mensaje de WhatsApp:', whatsappError)
      }
    }

    // ✅ Solo revalidar la lista
    revalidatePath('/admin/postulaciones')

    return { success: true, document }
  } catch (error: any) {
    console.error('Error al rechazar documento:', error)
    return { success: false, error: error.message || 'Error al rechazar documento' }
  }
}

/**
 * Elimina un documento
 * ✅ Solo revalida la lista
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

    // ✅ Solo revalidar la lista
    revalidatePath('/admin/postulaciones')

    return { success: true }
  } catch (error: any) {
    console.error('Error al eliminar documento:', error)
    return { success: false, error: error.message || 'Error al eliminar documento' }
  }
}

// ✅ NOTA: La función uploadDocument fue ELIMINADA
// Ahora usamos el API route: /api/postulaciones/documents/upload