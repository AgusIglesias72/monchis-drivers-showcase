// app/api/postulaciones/documents/[id]/approve/route.ts

import { prisma } from '@/lib/prisma'
import { FormDocumentsStatus, WhatsAppMessageSource, WhatsAppMessageType } from '@prisma/client'
import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { sendTemplateByKey } from '@/lib/services/whatsapp-messenger.service'
import { requireAdminApi } from '@/lib/auth'

const POSTULACION_APROBADA_TEMPLATE_KEY = 'capacitaciones'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminApi()
    if (!guard.ok) return guard.response
    const adminUser = guard.user

    const { id } = await params

    // 1. Aprobar el documento específico
    const document = await prisma.formDocument.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: adminUser.id,
        rejectionReason: null, // Limpiar razón de rechazo si existía
      },
      include: {
        formDriver: {
          include: {
            documents: true // Traer todos los documentos del driver
          }
        }
      }
    })

    // 2. Recalcular el documentStatus general del FormDriver
    const allDocuments = document.formDriver.documents
    
    // Verificar el estado de todos los documentos
    const allApproved = allDocuments.every(doc => doc.status === 'APPROVED')
    const anyRejected = allDocuments.some(doc => doc.status === 'REJECTED')
    const anyPending = allDocuments.some(doc => doc.status === 'PENDING')
    const anyInReview = allDocuments.some(doc => doc.status === 'IN_REVIEW')

    // Determinar el nuevo estado general
    let newDocumentStatus = 'IN_REVIEW' // Default
    
    if (allApproved && allDocuments.length > 0) {
      // Todos aprobados = APPROVED
      newDocumentStatus = 'APPROVED'
    } else if (anyRejected) {
      // Si hay alguno rechazado = CORRECTIONS
      newDocumentStatus = 'CORRECTIONS'
    } else if (anyPending) {
      // Si hay alguno pendiente = PENDING
      newDocumentStatus = 'PENDING'
    } else if (anyInReview) {
      // Si hay alguno en revisión = IN_REVIEW
      newDocumentStatus = 'IN_REVIEW'
    }

    // 3. Actualizar el FormDriver con el nuevo estado
    const updatedDriver = await prisma.formDriver.update({
      where: { id: document.formDriverId },
      data: {
        documentsStatus: newDocumentStatus as FormDocumentsStatus
      }
    })

    // 4. Si este approve dejó documentsStatus = APPROVED y todavía no mandamos el
    //    mensaje de "postulación aprobada", lo disparamos por el bot WhatsApp.
    //    Idempotente vía approvalNotifiedAt: si ya tiene timestamp no se vuelve a mandar.
    if (newDocumentStatus === 'APPROVED' && !updatedDriver.approvalNotifiedAt) {
      // Lock optimista: el update solo entra si el campo sigue null. Si dos approves
      // casi simultáneos pisan, solo uno gana el lock.
      const lockResult = await prisma.formDriver.updateMany({
        where: {
          id: updatedDriver.id,
          approvalNotifiedAt: null,
        },
        data: {
          approvalNotifiedAt: new Date(),
        },
      })

      if (lockResult.count === 1) {
        const driverForNotify = updatedDriver
        after(async () => {
          try {
            const result = await sendTemplateByKey(driverForNotify, POSTULACION_APROBADA_TEMPLATE_KEY, {
              source: WhatsAppMessageSource.TRIGGER,
              messageType: WhatsAppMessageType.APPLICATION_RECEIVED,
              step: 'postulacion_aprobada',
            })
            if (result.status !== 'sent') {
              console.warn('[DOC_APPROVE] bot no envió mensaje de aprobación', {
                driverId: driverForNotify.id,
                result,
              })
              // Soltar el lock para que un retry futuro pueda volver a intentar.
              await prisma.formDriver.update({
                where: { id: driverForNotify.id },
                data: { approvalNotifiedAt: null },
              })
            }
          } catch (err) {
            console.error('[DOC_APPROVE] Error inesperado enviando WhatsApp', {
              driverId: driverForNotify.id,
              error: err instanceof Error ? err.message : err,
            })
            await prisma.formDriver.update({
              where: { id: driverForNotify.id },
              data: { approvalNotifiedAt: null },
            }).catch(() => undefined)
          }
        })
      }
    }

    return NextResponse.json({
      document,
      documentStatus: newDocumentStatus,
      message: 'Documento aprobado exitosamente'
    })
  } catch (error) {
    console.error('Error al aprobar documento:', error)
    return NextResponse.json(
      { error: 'Error al aprobar el documento' },
      { status: 500 }
    )
  }
}