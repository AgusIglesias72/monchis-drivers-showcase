// app/admin/postulaciones/[id]/page.tsx

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { PostulacionDetailContent } from '@/components/admin/postulacion-detail-content'

async function getPostulacion(id: string) {
  try {
    const formDriver = await prisma.formDriver.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        documents: {
          orderBy: {
            uploadedAt: 'desc'
          },
          include: {
            reviewedByUser: {
              select: {
                firstName: true,
                fullName: true,
                email: true,
              }
            }
          }
        },
        equipmentPayments: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1 // Solo el más reciente
        },
        onboardingAttendances: {
          include: {
            event: true
          },
          orderBy: {
            invitedAt: 'desc'
          },
          take: 1 // Solo el más reciente
        },
        financialService: true
      }
    })

    if (!formDriver) {
      return null
    }

    // Transformar los datos de la BD al formato esperado por el componente
    const postulacion = {
      id: formDriver.id,
      cedula: formDriver.cedula,
      firstName: formDriver.firstName,
      lastName: formDriver.lastName,
      fullName: formDriver.fullName,
      birthDate: formDriver.birthDate ? new Date(formDriver.birthDate).toLocaleDateString('es-PY') : null,
      phoneNumber: formDriver.phoneNumber,
      email: formDriver.email,
      department: formDriver.department,
      city: formDriver.city,
      address: formDriver.address,
      hasVehicle: formDriver.hasVehicle,
      vehicleBrand: formDriver.vehicleBrand,
      vehicleModel: formDriver.vehicleModel,
      vehicleYear: formDriver.vehicleYear,
      vehiclePlate: formDriver.vehiclePlate,
      status: formDriver.status,
      documentsStatus: formDriver.documentsStatus,
      currentStep: formDriver.currentStep,
      completedSteps: formDriver.completedSteps,
      startedAt: formDriver.startedAt,
      completedAt: formDriver.completedAt,
      workZone: formDriver.workZone,
      emergencyName: formDriver.emergencyName,
      emergencyPhone: formDriver.emergencyPhone,
      emergencyRelationship: formDriver.emergencyRelationship,
      howHeardAboutUs: formDriver.howHeardAboutUs,
      referredBy: formDriver.referredBy,
      experience: formDriver.experience,
      availability: formDriver.availability,
      whenCanStart: formDriver.whenCanStart,
      hasUenoAccount: formDriver.hasUenoAccount ? 'si' : 'no',
      uenoAccountNumber: formDriver.uenoAccountNumber,
      canInvoice: formDriver.canInvoice ? 'si' : 'no',
      onboardingStatus: formDriver.onboardingStatus,
      onboardingScheduledAt: formDriver.onboardingScheduledAt,
      onboardingCompletedAt: formDriver.onboardingCompletedAt,
      onboardingNotes: formDriver.onboardingNotes,
      
      // Documentos desde la tabla FormDocument
      documents: formDriver.documents.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        blobUrl: doc.blobUrl,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        reviewedAt: doc.reviewedAt,
//        reviewedBy: doc.reviewedBy,
        reviewedBy: doc.reviewedByUser?.fullName || doc.reviewedBy,
        reviewedByUser: doc.reviewedByUser,
        rejectionReason: doc.rejectionReason,
        adminNotes: doc.adminNotes,
        metadata: doc.metadata,
      })),
      
      // Pagos de equipamiento
      equipmentPayments: formDriver.equipmentPayments.map(payment => ({
        id: payment.id,
        paymentMethod: payment.paymentMethod,
        paymentNumber: payment.paymentNumber,
        invoiceNumber: payment.invoiceNumber,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentProofUrl: payment.paymentProofUrl,
        status: payment.status,
        verifiedAt: payment.verifiedAt,
        verifiedBy: payment.verifiedBy,
        adminNotes: payment.adminNotes,
        rejectionReason: payment.rejectionReason,
        metadata: payment.metadata,
        createdAt: payment.createdAt,
      })),
      
      // OnBoarding attendances
      onboardingAttendances: formDriver.onboardingAttendances.map(attendance => ({
        id: attendance.id,
        status: attendance.status,
        confirmedAt: attendance.confirmedAt,
        checkedInAt: attendance.checkedInAt,
        markedNoShowAt: attendance.markedNoShowAt,
        cancelledAt: attendance.cancelledAt,
        cancelledReason: attendance.cancelledReason,
        attendeeNotes: attendance.attendeeNotes,
        event: {
          id: attendance.event.id,
          title: attendance.event.title,
          scheduledDate: attendance.event.scheduledDate,
          startTime: attendance.event.startTime,
          endTime: attendance.event.endTime,
          location: attendance.event.location,
          status: attendance.event.status,
        }
      })),
      
      // Financial Service
      financialService: formDriver.financialService ? {
        id: formDriver.financialService.id,
        hasInvoice: formDriver.financialService.hasInvoice,
        invoiceRuc: formDriver.financialService.invoiceRuc,
        taxComplianceUrl: formDriver.financialService.taxComplianceUrl,
        interestedInConto: formDriver.financialService.interestedInConto,
        contoStatus: formDriver.financialService.contoStatus,
      } : null,
      
      // Notas
      notes: formDriver.notes.map(note => ({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt,
        createdBy: note.createdBy,
      })),
      
      // Timeline basado en los pasos completados
      timeline: [
        { 
          step: 1, 
          name: 'Contacto Básico', 
          completedAt: formDriver.completedSteps.includes(1) ? formDriver.startedAt : null 
        },
        { 
          step: 2, 
          name: 'Datos Personales', 
          completedAt: formDriver.completedSteps.includes(2) ? formDriver.startedAt : null 
        },
        { 
          step: 3, 
          name: 'Trabajo y Vehículo', 
          completedAt: formDriver.completedSteps.includes(3) ? formDriver.startedAt : null 
        },
        { 
          step: 4, 
          name: 'Documentos', 
          completedAt: formDriver.completedSteps.includes(4) ? formDriver.startedAt : null 
        },
        { 
          step: 5, 
          name: 'Información Adicional', 
          completedAt: formDriver.completedSteps.includes(5) ? formDriver.completedAt : null 
        },
      ],
    }

    return postulacion
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