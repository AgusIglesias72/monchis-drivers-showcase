// lib/services/portal-audit.service.ts
import { prisma } from '@/lib/prisma'
import { AuditAction } from '@prisma/client'

interface CreatePortalAuditLogParams {
  formDriverId: string
  action: AuditAction
  actionType: 'UPDATE' | 'DELETE' | 'CREATE'
  entityType: string
  entityId: string
  description?: string
  changes?: Record<string, { old: any; new: any }>
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Crea un registro de auditoría para acciones realizadas desde el portal
 */
export async function createPortalAuditLog({
  formDriverId,
  action,
  actionType,
  entityType,
  entityId,
  description,
  changes,
  metadata,
  ipAddress,
  userAgent,
}: CreatePortalAuditLogParams) {
  try {
    // Obtener info del driver para metadata
    const driver = await prisma.formDriver.findUnique({
      where: { id: formDriverId },
      select: {
        cedula: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      },
    })

    const auditLog = await prisma.auditLog.create({
      data: {
        userId: formDriverId,
        userEmail: driver?.phoneNumber || null, // Usamos phone como identificador
        action,
        actionType,
        description:
          description ||
          `${driver?.firstName || 'Driver'} ${driver?.lastName || ''} realizó ${actionType.toLowerCase()} desde el portal`,
        entityType,
        entityId,
        changes: changes || undefined,
        metadata: {
          source: 'portal',
          driverInfo: {
            cedula: driver?.cedula,
            name: `${driver?.firstName} ${driver?.lastName}`,
            phone: driver?.phoneNumber,
          },
          ...metadata,
        },
        ipAddress,
        userAgent,
      },
    })

    return auditLog
  } catch (error) {
    console.error('Error creating portal audit log:', error)
    // No lanzar error para no bloquear la operación principal
    return null
  }
}

/**
 * Registra actualización de datos personales
 */
export async function logPersonalDataUpdate(
  formDriverId: string,
  updatedFields: Record<string, any>,
  previousData: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) {
  const changes: Record<string, { old: any; new: any }> = {}

  // Construir objeto de cambios
  Object.keys(updatedFields).forEach((key) => {
    if (updatedFields[key] !== previousData[key]) {
      changes[key] = {
        old: previousData[key],
        new: updatedFields[key],
      }
    }
  })

  const fieldsList = Object.keys(changes).join(', ')

  return createPortalAuditLog({
    formDriverId,
    action: AuditAction.DRIVER_UPDATED,
    actionType: 'UPDATE',
    entityType: 'FormDriver',
    entityId: formDriverId,
    description: `Datos personales actualizados desde el portal: ${fieldsList}`,
    changes,
    metadata: {
      updatedFields: Object.keys(changes),
      updateCount: Object.keys(changes).length,
    },
    ipAddress,
    userAgent,
  })
}

/**
 * Registra carga de documento
 */
export async function logDocumentUpload(
  formDriverId: string,
  documentId: string,
  documentType: string,
  fileName: string,
  ipAddress?: string,
  userAgent?: string
) {
  return createPortalAuditLog({
    formDriverId,
    action: AuditAction.DOCUMENT_UPLOADED,
    actionType: 'CREATE',
    entityType: 'FormDocument',
    entityId: documentId,
    description: `Documento subido desde el portal: ${documentType}`,
    metadata: {
      documentType,
      fileName,
      fileSize: null, // Se podría agregar si se guarda
    },
    ipAddress,
    userAgent,
  })
}

/**
 * Registra eliminación de documento
 */
export async function logDocumentDelete(
  formDriverId: string,
  documentId: string,
  documentType: string,
  fileName: string,
  documentStatus: string,
  ipAddress?: string,
  userAgent?: string
) {
  return createPortalAuditLog({
    formDriverId,
    action: AuditAction.DOCUMENT_DELETED,
    actionType: 'DELETE',
    entityType: 'FormDocument',
    entityId: documentId,
    description: `Documento eliminado desde el portal: ${documentType} (estado: ${documentStatus})`,
    metadata: {
      documentType,
      fileName,
      previousStatus: documentStatus,
    },
    ipAddress,
    userAgent,
  })
}

/**
 * Registra selección de capacitación
 */
export async function logCapacitacionSelected(
  formDriverId: string,
  attendeeId: string,
  eventId: string,
  eventDate: Date,
  ipAddress?: string,
  userAgent?: string
) {
  return createPortalAuditLog({
    formDriverId,
    action: AuditAction.DRIVER_UPDATED, // O crear TRAINING_SELECTED si se prefiere
    actionType: 'CREATE',
    entityType: 'OnboardingAttendee',
    entityId: attendeeId,
    description: `Capacitación seleccionada desde el portal para ${new Date(eventDate).toLocaleDateString('es-PY')}`,
    metadata: {
      eventId,
      eventDate: eventDate.toISOString(),
    },
    ipAddress,
    userAgent,
  })
}

/**
 * Registra cambio de capacitación
 */
export async function logCapacitacionChanged(
  formDriverId: string,
  newAttendeeId: string,
  previousEventId: string,
  newEventId: string,
  previousEventDate: Date,
  newEventDate: Date,
  ipAddress?: string,
  userAgent?: string
) {
  return createPortalAuditLog({
    formDriverId,
    action: AuditAction.DRIVER_UPDATED, // O crear TRAINING_CHANGED si se prefiere
    actionType: 'UPDATE',
    entityType: 'OnboardingAttendee',
    entityId: newAttendeeId,
    description: `Capacitación cambiada desde el portal`,
    changes: {
      eventId: { old: previousEventId, new: newEventId },
      eventDate: {
        old: previousEventDate.toISOString(),
        new: newEventDate.toISOString(),
      },
    },
    metadata: {
      previousEventId,
      newEventId,
      previousDate: previousEventDate.toISOString(),
      newDate: newEventDate.toISOString(),
    },
    ipAddress,
    userAgent,
  })
}

/**
 * Registra acceso al portal
 */
export async function logPortalAccess(
  formDriverId: string,
  ipAddress?: string,
  userAgent?: string
) {
  return createPortalAuditLog({
    formDriverId,
    action: AuditAction.DRIVER_UPDATED, // Usar acción genérica
    actionType: 'UPDATE',
    entityType: 'FormDriver',
    entityId: formDriverId,
    description: 'Acceso al portal de postulación',
    metadata: {
      accessType: 'portal_view',
    },
    ipAddress,
    userAgent,
  })
}
