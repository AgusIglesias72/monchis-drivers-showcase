// app/api/postulaciones/documents/[id]/approve/route.ts

import { prisma } from '@/lib/prisma'
import { FormDocumentsStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. Aprobar el documento específico
    const document = await prisma.formDocument.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
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
    await prisma.formDriver.update({
      where: { id: document.formDriverId },
      data: {
        documentsStatus: newDocumentStatus as FormDocumentsStatus
      }
    })

    // TODO: migrar a WhatsApp multi-bot — notificar DOCUMENTS_ALL_APPROVED cuando newDocumentStatus pasa a APPROVED

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