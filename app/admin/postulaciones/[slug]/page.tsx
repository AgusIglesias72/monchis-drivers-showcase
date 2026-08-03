// app/admin/postulaciones/[slug]/page.tsx

import { notFound, redirect } from 'next/navigation'
import { postulacionService } from '@/lib/services/postulacion.service'
import { onboardingService } from '@/lib/services/onboarding.service'
import { getActiveTemplates } from '@/lib/services/whatsapp-templates.service'
import { PostulacionDetailContent } from '@/components/admin/postulacion-detail-content'

export const revalidate = 0 // Siempre fresh data

async function getPostulacion(slugOrId: string) {
  try {
    const [postulacion, availableEvents, whatsappTemplates] = await Promise.all([
      postulacionService.getPostulacionById(slugOrId),
      onboardingService.getAvailableEvents(),
      getActiveTemplates(),
    ])

    if (!postulacion) {
      return null
    }

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

      // ✅ Agregar plantillas de WhatsApp activas
      whatsappTemplates: whatsappTemplates.map(template => ({
        id: template.id,
        key: template.key,
        name: template.name,
        content: template.content,
      })),
    }
  } catch (error) {
    console.error('Error al obtener postulación:', error)
    return null
  }
}

export default async function PostulacionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const postulacion = await getPostulacion(slug)

  if (!postulacion) {
    notFound()
  }

  // URL canónica: si se entró por id (o slug viejo), redirigir al slug limpio
  // preservando el query string (?tab=, etc.)
  if (postulacion.slug && slug !== postulacion.slug) {
    const sp = new URLSearchParams()
    for (const [key, value] of Object.entries(await searchParams)) {
      if (typeof value === 'string') sp.set(key, value)
      else if (Array.isArray(value)) value.forEach((v) => sp.append(key, v))
    }
    redirect(`/admin/postulaciones/${postulacion.slug}${sp.size ? `?${sp}` : ''}`)
  }

  return <PostulacionDetailContent postulacion={postulacion} />
}