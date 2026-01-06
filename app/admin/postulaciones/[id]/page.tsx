// app/admin/postulaciones/[id]/page.tsx

import { notFound } from 'next/navigation'
import { postulacionService } from '@/lib/services/postulacion.service'
import { onboardingService } from '@/lib/services/onboarding.service'
import { PostulacionDetailContent } from '@/components/admin/postulacion-detail-content'

export const revalidate = 0 // Siempre fresh data

async function getPostulacion(id: string) {
  try {
    const postulacion = await postulacionService.getPostulacionById(id)
    
    if (!postulacion) {
      return null
    }

    // ✅ Cargar eventos disponibles en paralelo
    const availableEvents = await onboardingService.getAvailableEvents()

    // Transformar para serialización (convertir Dates, etc)
    return {
      ...postulacion,
      startedAt: postulacion.startedAt.toISOString(),
      completedAt: postulacion.completedAt?.toISOString() || null,
      onboardingScheduledAt: postulacion.onboardingScheduledAt?.toISOString() || null,
      onboardingCompletedAt: postulacion.onboardingCompletedAt?.toISOString() || null,
      
      // Transformar fechas en documentos
      documents: postulacion.documents.map(doc => ({
        ...doc,
        uploadedAt: doc.uploadedAt.toISOString(),
        reviewedAt: doc.reviewedAt?.toISOString() || null,
      })),
      
      // Transformar fechas en pagos
      equipmentPayments: postulacion.equipmentPayments.map(payment => ({
        ...payment,
        paymentDate: payment.paymentDate?.toISOString() || null,
        verifiedAt: payment.verifiedAt?.toISOString() || null,
        createdAt: payment.createdAt.toISOString(),
      })),
      
      // Transformar fechas en onboarding
      onboardingAttendances: postulacion.onboardingAttendances.map(attendance => ({
        ...attendance,
        confirmedAt: attendance.confirmedAt?.toISOString() || null,
        checkedInAt: attendance.checkedInAt?.toISOString() || null,
        markedNoShowAt: attendance.markedNoShowAt?.toISOString() || null,
        cancelledAt: attendance.cancelledAt?.toISOString() || null,
        invitedAt: attendance.invitedAt.toISOString(),
        event: {
          ...attendance.event,
          scheduledDate: attendance.event.scheduledDate.toISOString(),
          createdAt: attendance.event.createdAt.toISOString(),
          updatedAt: attendance.event.updatedAt.toISOString(),
        }
      })),
      
      // Transformar fechas en notas
      notes: postulacion.notes.map(note => ({
        ...note,
        createdAt: note.createdAt.toISOString(),
      })),
      
      // Transformar timeline
      timeline: postulacion.timeline.map(step => ({
        ...step,
        completedAt: step.completedAt?.toISOString() || null,
      })),

      // Transformar mensajes de WhatsApp
      whatsappMessagesSent: postulacion.whatsappMessagesSent.map(msg => ({
        ...msg,
        sentAt: msg.sentAt.toISOString(),
      })),

      // ✅ Agregar eventos disponibles con fechas transformadas
      availableOnboardingEvents: availableEvents.map(event => ({
        ...event,
        scheduledDate: event.scheduledDate.toISOString(),
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        completedAt: event.completedAt?.toISOString() || null,
      })),
    }
  } catch (error) {
    console.error('Error al obtener postulación:', error)
    return null
  }
}

export default async function PostulacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const postulacion = await getPostulacion(id)

  if (!postulacion) {
    notFound()
  }

  return <PostulacionDetailContent postulacion={postulacion} />
}