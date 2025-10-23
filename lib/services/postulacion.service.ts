// lib/services/postulacion.service.ts

import { prisma } from '@/lib/prisma'
import { formatDateOnly } from '@/lib/utils'

export class PostulacionService {
  
  /**
   * Obtiene una postulación completa por ID
   */
  async getPostulacionById(id: string) {
    const formDriver = await prisma.formDriver.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdByUser: {
              select: {
                firstName: true,
                fullName: true,
                email: true,
              }
            }
          }
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
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
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        onboardingAttendances: {
          include: {
            event: true
          },
          orderBy: { invitedAt: 'desc' },
          take: 1
        },
        financialService: true
      }
    })

    if (!formDriver) {
      return null
    }

    // Generar timeline
    const timeline = this.generateTimeline(
      formDriver.completedSteps, 
      formDriver.startedAt, 
      formDriver.completedAt
    )

    return {
      ...formDriver,
      timeline,
      // Formatear fechas para serialización
      birthDate: formDriver.birthDate 
        ? formatDateOnly(formDriver.birthDate)
        : null,
    }
  }

  /**
   * Actualiza datos básicos de una postulación
   */
  async updatePostulacion(id: string, data: any) {
    return prisma.formDriver.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: `${data.firstName} ${data.lastName}`,
        phoneNumber: data.phoneNumber,
        email: data.email,
        department: data.department,
        city: data.city,
        address: data.address,
        emergencyName: data.emergencyName,
        emergencyPhone: data.emergencyPhone,
        emergencyRelationship: data.emergencyRelationship,
        // Vehículo
        hasVehicle: data.hasVehicle,
        vehicleBrand: data.vehicleBrand,
        vehicleModel: data.vehicleModel,
        vehicleYear: data.vehicleYear,
        vehiclePlate: data.vehiclePlate,
        workZone: data.workZone,
        // Otros
        experience: data.experience,
        availability: data.availability,
        whenCanStart: data.whenCanStart,
      }
    })
  }

  /**
   * Actualiza el pago de equipamiento
   */
  async updatePayment(postulacionId: string, paymentData: any, verifiedBy: string) {
    // Buscar si existe un pago
    const existingPayment = await prisma.equipmentPayment.findFirst({
      where: { formDriverId: postulacionId },
      orderBy: { createdAt: 'desc' }
    })

    const paymentPayload = {
      formDriverId: postulacionId,
      paymentMethod: paymentData.paymentMethod || null,
      paymentNumber: paymentData.paymentNumber || null,
      invoiceNumber: paymentData.invoiceNumber || null,
      amount: paymentData.amount ? parseFloat(paymentData.amount) : null,
      status: paymentData.status || 'PENDING',
      adminNotes: paymentData.adminNotes || null,
      rejectionReason: paymentData.status === 'REJECTED' ? paymentData.rejectionReason : null,
      verifiedBy: paymentData.status === 'VERIFIED' ? verifiedBy : null,
      verifiedAt: paymentData.status === 'VERIFIED' ? new Date() : null,
    }

    if (existingPayment) {
      return prisma.equipmentPayment.update({
        where: { id: existingPayment.id },
        data: paymentPayload
      })
    } else {
      return prisma.equipmentPayment.create({
        data: paymentPayload
      })
    }
  }

  /**
   * Crea una nota interna
   */
  async createNote(formDriverId: string, content: string, createdBy: string) {
    return prisma.formNote.create({
      data: {
        formDriverId,
        content,
        createdBy,
      },
      include: {
        createdByUser: {
          select: {
            firstName: true,
            fullName: true,
            email: true,
          }
        }
      }
    })
  }

  /**
   * Aprueba un documento
   */
  async approveDocument(documentId: string, reviewedBy: string) {
    return prisma.formDocument.update({
      where: { id: documentId },
      data: {
        status: 'APPROVED',
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason: null,
      }
    })
  }

  /**
   * Rechaza un documento
   */
  async rejectDocument(documentId: string, reason: string, reviewedBy: string) {
    return prisma.formDocument.update({
      where: { id: documentId },
      data: {
        status: 'REJECTED',
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason: reason,
      }
    })
  }

  /**
   * Elimina un documento
   */
  async deleteDocument(documentId: string) {
    // Obtener URL del blob para eliminarlo después si es necesario
    const document = await prisma.formDocument.findUnique({
      where: { id: documentId },
      select: { blobUrl: true }
    })

    await prisma.formDocument.delete({
      where: { id: documentId }
    })

    return document
  }

  /**
   * Genera el timeline basado en steps completados
   */
  private generateTimeline(completedSteps: number[], startedAt: Date, completedAt: Date | null) {
    const stepNames = [
      'Contacto Básico',
      'Datos Personales',
      'Trabajo y Vehículo',
      'Documentos',
      'Información Adicional',
      'Pago de Equipamiento'
    ]

    return stepNames.map((name, index) => {
      const step = index + 1
      const isCompleted = completedSteps.includes(step)
      
      let completedAtEstimate = null
      if (isCompleted) {
        if (step === completedSteps.length && completedAt) {
          completedAtEstimate = completedAt
        } else {
          const progressRatio = step / completedSteps.length
          const totalTime = completedAt 
            ? completedAt.getTime() - startedAt.getTime()
            : Date.now() - startedAt.getTime()
          completedAtEstimate = new Date(startedAt.getTime() + (totalTime * progressRatio))
        }
      }

      return {
        step,
        name,
        completedAt: completedAtEstimate
      }
    })
  }
}

export const postulacionService = new PostulacionService()