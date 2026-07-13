// lib/services/postulacion.service.ts

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { formatDateOnly } from '@/lib/utils'
import { slugify } from '@/lib/utils/slugify'

export function driverSlugBase(name: string | null | undefined, id: string): string {
  return slugify(name ?? '', 60) || `postulante-${id.slice(0, 6)}`
}

export async function generateUniqueDriverSlug(
  name: string | null | undefined,
  id: string,
): Promise<string> {
  const base = driverSlugBase(name, id)
  const existing = await prisma.formDriver.findMany({
    where: { slug: { startsWith: base }, id: { not: id } },
    select: { slug: true },
  })
  const taken = new Set(existing.map((d) => d.slug))
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`
    if (!taken.has(candidate)) return candidate
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

// Asigna slug con reintentos ante carreras de unicidad (P2002): el candidato se
// recalcula contra la DB en cada intento.
export async function assignDriverSlug(
  driverId: string,
  name: string | null | undefined,
): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = await generateUniqueDriverSlug(name, driverId)
    try {
      await prisma.formDriver.update({ where: { id: driverId }, data: { slug } })
      return slug
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error
    }
  }
  return null
}

export class PostulacionService {

  /**
   * Obtiene una postulación completa por slug o ID
   */
  async getPostulacionById(slugOrId: string) {
    const formDriver = await prisma.formDriver.findFirst({
      where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
      // Json pesados que la vista de detalle no consume
      omit: { rucApiRawResponse: true, metadata: true },
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
        financialService: true,
        whatsappMessagesSent: {
          orderBy: { sentAt: 'desc' },
          select: {
            id: true,
            messageType: true,
            sentAt: true,
            status: true,
            source: true,
            metadata: true,
          }
        },
        agentRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1, // último run; el sheet completo se ve desde la card
          include: {
            actions: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      }
    })

    if (!formDriver) {
      return null
    }

    // Auto-curación: postulaciones creadas por código previo al slug limpio
    if (!formDriver.slug) {
      const name = formDriver.fullName || [formDriver.firstName, formDriver.lastName].filter(Boolean).join(' ')
      formDriver.slug = await assignDriverSlug(formDriver.id, name)
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
    // Preparar datos para actualizar
    const updateData: any = {
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

    // ✅ AGREGAR CÉDULA si viene en data
    if (data.cedula !== undefined) {
      updateData.cedula = data.cedula
    }

    // ✅ AGREGAR CUENTA UENO si viene en data
    if (data.uenoAccountNumber !== undefined) {
      updateData.uenoAccountNumber = data.uenoAccountNumber
    }

    // ✅ AGREGAR FECHA DE NACIMIENTO si viene en data
    if (data.birthDate !== undefined) {
      // Convertir la fecha de YYYY-MM-DD a Date object
      if (data.birthDate) {
        try {
          // Si viene en formato YYYY-MM-DD del input date
          const dateValue = new Date(data.birthDate)
          if (!isNaN(dateValue.getTime())) {
            updateData.birthDate = dateValue
          }
        } catch (error) {
          console.error('Error al convertir fecha:', error)
        }
      } else {
        // Si es null o vacío, permitir actualizar a null
        updateData.birthDate = null
      }
    }

    return prisma.formDriver.update({
      where: { id },
      data: updateData
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