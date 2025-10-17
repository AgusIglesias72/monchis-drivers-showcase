// lib/audit.ts
import { prisma } from '@/lib/prisma'
import { AuditAction } from '@prisma/client'
import { headers } from 'next/headers'

type AuditLogInput = {
  userId: string
  userEmail?: string
  action: AuditAction
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'SCHEDULE' | 'COMPLETE' | 'CANCEL' | 'OTHER'
  description?: string
  entityType: string
  entityId: string
  changes?: Record<string, any>
  metadata?: Record<string, any>
}

export async function createAuditLog(input: AuditLogInput) {
  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        userEmail: input.userEmail,
        action: input.action,
        actionType: input.actionType,
        description: input.description,
        entityType: input.entityType,
        entityId: input.entityId,
        changes: input.changes,
        metadata: input.metadata,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    console.error('[AUDIT LOG ERROR]', error)
    // No lanzamos error para que no bloquee la operación principal
  }
}

// Ejemplo de uso en una Server Action:
// await createAuditLog({
//   userId: user.id,
//   userEmail: user.email,
//   action: 'DOCUMENT_APPROVED',
//   actionType: 'APPROVE',
//   description: 'Documento de cédula aprobado',
//   entityType: 'FormDocument',
//   entityId: documentId,
//   changes: {
//     status: { from: 'PENDING', to: 'APPROVED' }
//   }
// })