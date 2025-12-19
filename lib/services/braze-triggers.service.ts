// lib/services/braze-triggers.service.ts

import { prisma } from '@/lib/prisma'
import * as brazeService from '@/lib/services/braze.service'
import type { BrazeTriggerType, BrazeExecutionStatus } from '@prisma/client'

// ==================== TYPES ====================

export interface CreateBrazeTriggerData {
  title: string
  description?: string
  triggerType: BrazeTriggerType
  campaignId?: string
  canvasId?: string
  targetAudience?: string
  defaultProperties?: Record<string, any>
  tags?: string[]
  createdBy: string // AdminUser id
}

export interface UpdateBrazeTriggerData {
  title?: string
  description?: string
  campaignId?: string
  canvasId?: string
  targetAudience?: string
  defaultProperties?: Record<string, any>
  tags?: string[]
  isActive?: boolean
}

export interface ExecuteBrazeTriggerData {
  triggerId: string
  executedBy: string // AdminUser id
  ipAddress?: string
  userAgent?: string
}

export interface GetBrazeExecutionsFilters {
  triggerId?: string
  status?: BrazeExecutionStatus
  executedBy?: string
  formDriverId?: string
  dateFrom?: Date
  dateTo?: Date
  limit?: number
  offset?: number
}

// ==================== CRUD DE TRIGGERS ====================

/**
 * Crea un nuevo trigger de Braze
 */
export async function createBrazeTrigger(data: CreateBrazeTriggerData) {
  // Validar que tenga campaign_id o canvas_id según el tipo
  if (data.triggerType === 'CAMPAIGN' && !data.campaignId) {
    throw new Error('campaign_id es requerido para triggers de tipo CAMPAIGN')
  }

  if (data.triggerType === 'CANVAS' && !data.canvasId) {
    throw new Error('canvas_id es requerido para triggers de tipo CANVAS')
  }

  const trigger = await prisma.brazeTrigger.create({
    data: {
      title: data.title,
      description: data.description,
      triggerType: data.triggerType,
      campaignId: data.campaignId,
      canvasId: data.canvasId,
      targetAudience: data.targetAudience,
      defaultProperties: data.defaultProperties || undefined,
      tags: data.tags || [],
      createdBy: data.createdBy,
    },
    include: {
      createdByUser: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
    },
  })

  // Registrar en audit log
  await prisma.auditLog.create({
    data: {
      userId: data.createdBy,
      action: 'BRAZE_TRIGGER_CREATED',
      actionType: 'CREATE',
      description: `Creó trigger de Braze: ${data.title}`,
      entityType: 'BrazeTrigger',
      entityId: trigger.id,
      metadata: {
        triggerType: data.triggerType,
        campaignId: data.campaignId,
        canvasId: data.canvasId,
      },
    },
  })

  return trigger
}

/**
 * Actualiza un trigger existente
 */
export async function updateBrazeTrigger(id: string, data: UpdateBrazeTriggerData, updatedBy: string) {
  const trigger = await prisma.brazeTrigger.findUnique({
    where: { id },
  })

  if (!trigger) {
    throw new Error('Trigger no encontrado')
  }

  const updated = await prisma.brazeTrigger.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.campaignId !== undefined && { campaignId: data.campaignId }),
      ...(data.canvasId !== undefined && { canvasId: data.canvasId }),
      ...(data.targetAudience !== undefined && { targetAudience: data.targetAudience }),
      ...(data.defaultProperties !== undefined && { defaultProperties: data.defaultProperties }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    include: {
      createdByUser: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
    },
  })

  // Registrar en audit log
  await prisma.auditLog.create({
    data: {
      userId: updatedBy,
      action: 'BRAZE_TRIGGER_UPDATED',
      actionType: 'UPDATE',
      description: `Actualizó trigger de Braze: ${updated.title}`,
      entityType: 'BrazeTrigger',
      entityId: id,
      changes: data as any,
    },
  })

  return updated
}

/**
 * Elimina un trigger
 */
export async function deleteBrazeTrigger(id: string, deletedBy: string) {
  const trigger = await prisma.brazeTrigger.findUnique({
    where: { id },
  })

  if (!trigger) {
    throw new Error('Trigger no encontrado')
  }

  await prisma.brazeTrigger.delete({
    where: { id },
  })

  // Registrar en audit log
  await prisma.auditLog.create({
    data: {
      userId: deletedBy,
      action: 'BRAZE_TRIGGER_DELETED',
      actionType: 'DELETE',
      description: `Eliminó trigger de Braze: ${trigger.title}`,
      entityType: 'BrazeTrigger',
      entityId: id,
      metadata: {
        title: trigger.title,
        triggerType: trigger.triggerType,
      },
    },
  })

  return { success: true }
}

/**
 * Obtiene todos los triggers activos
 */
export async function getActiveBrazeTriggers() {
  return await prisma.brazeTrigger.findMany({
    where: {
      isActive: true,
    },
    include: {
      createdByUser: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
      _count: {
        select: {
          executions: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

/**
 * Obtiene un trigger por ID con sus últimas ejecuciones
 */
export async function getBrazeTriggerById(id: string) {
  return await prisma.brazeTrigger.findUnique({
    where: { id },
    include: {
      createdByUser: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
      executions: {
        take: 5,
        orderBy: {
          executedAt: 'desc',
        },
        include: {
          executedByUser: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      },
      _count: {
        select: {
          executions: true,
        },
      },
    },
  })
}

// ==================== EJECUCIÓN DE TRIGGERS ====================

/**
 * Ejecuta un trigger de Braze (FUNCIÓN CORE)
 *
 * Dispara la campaña/canvas en modo broadcast.
 * La audiencia se gestiona directamente en Braze.
 *
 * 1. Crea registro de BrazeExecution (status: PENDING)
 * 2. Llama a brazeService.triggerCampaign() o triggerCanvas() con broadcast: true
 * 3. Actualiza BrazeExecution con send_id/dispatch_id y status: SENT/FAILED
 * 4. Registra en AuditLog
 * 5. Retorna resultado
 */
export async function executeBrazeTrigger(data: ExecuteBrazeTriggerData) {
  // 1. Obtener trigger y validar que está activo
  const trigger = await prisma.brazeTrigger.findUnique({
    where: { id: data.triggerId },
  })

  if (!trigger) {
    throw new Error('Trigger no encontrado')
  }

  if (!trigger.isActive) {
    throw new Error('El trigger está inactivo')
  }

  // 2. Crear registro de ejecución (status: PENDING)
  const execution = await prisma.brazeExecution.create({
    data: {
      triggerId: data.triggerId,
      recipientCount: 0, // Se desconoce hasta que Braze procese
      triggerProperties: undefined,
      status: 'PENDING',
      executedBy: data.executedBy,
      formDriverId: undefined,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  })

  try {
    // 3. Llamar a Braze API en modo broadcast
    let brazeResult: brazeService.BrazeApiResponse

    if (trigger.triggerType === 'CAMPAIGN') {
      if (!trigger.campaignId) {
        throw new Error('Campaign ID no configurado en el trigger')
      }

      brazeResult = await brazeService.triggerCampaign({
        campaign_id: trigger.campaignId,
        broadcast: true,
      })
    } else if (trigger.triggerType === 'CANVAS') {
      if (!trigger.canvasId) {
        throw new Error('Canvas ID no configurado en el trigger')
      }

      brazeResult = await brazeService.triggerCanvas({
        canvas_id: trigger.canvasId,
        broadcast: true,
      })
    } else {
      throw new Error(`Tipo de trigger no soportado: ${trigger.triggerType}`)
    }

    // 4. Si Braze falló, actualizar execution como FAILED
    if (!brazeResult.success) {
      const failedExecution = await prisma.brazeExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          errorMessage: brazeResult.error?.message || 'Error desconocido',
          brazeResponse: brazeResult.error as any,
          failedAt: new Date(),
        },
        include: {
          trigger: true,
          executedByUser: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      })

      return {
        success: false,
        error: brazeResult.error?.message || 'Error al ejecutar trigger',
        execution: failedExecution,
      }
    }

    // 5. Si Braze fue exitoso, actualizar execution como SENT
    const successExecution = await prisma.brazeExecution.update({
      where: { id: execution.id },
      data: {
        status: 'SENT',
        brazeMessageId: brazeResult.data?.dispatch_id,
        brazeResponse: brazeResult.data as any,
        completedAt: new Date(),
      },
      include: {
        trigger: true,
        executedByUser: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    })

    // 6. Registrar en audit log
    const auditAction = trigger.triggerType === 'CAMPAIGN' ? 'BRAZE_CAMPAIGN_EXECUTED' : 'BRAZE_CANVAS_EXECUTED'

    await prisma.auditLog.create({
      data: {
        userId: data.executedBy,
        action: auditAction,
        actionType: 'OTHER',
        description: `Ejecutó ${trigger.triggerType === 'CAMPAIGN' ? 'campaña' : 'canvas'} de Braze: ${trigger.title} (broadcast)`,
        entityType: 'BrazeExecution',
        entityId: execution.id,
        metadata: {
          triggerId: data.triggerId,
          dispatchId: brazeResult.data?.dispatch_id,
          sendId: brazeResult.data?.send_id,
          triggerType: trigger.triggerType,
          broadcast: true,
        },
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    })

    return {
      success: true,
      sendId: brazeResult.data?.send_id,
      dispatchId: brazeResult.data?.dispatch_id,
      execution: successExecution,
    }
  } catch (error) {
    // Si hubo error, actualizar execution
    await prisma.brazeExecution.update({
      where: { id: execution.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date(),
      },
    })

    throw error
  }
}

// ==================== HISTORIAL ====================

/**
 * Obtiene el historial de ejecuciones con filtros
 */
export async function getBrazeExecutions(filters: GetBrazeExecutionsFilters = {}) {
  const where: any = {}

  if (filters.triggerId) {
    where.triggerId = filters.triggerId
  }

  if (filters.status) {
    where.status = filters.status
  }

  if (filters.executedBy) {
    where.executedBy = filters.executedBy
  }

  if (filters.formDriverId) {
    where.formDriverId = filters.formDriverId
  }

  if (filters.dateFrom || filters.dateTo) {
    where.executedAt = {}

    if (filters.dateFrom) {
      where.executedAt.gte = filters.dateFrom
    }

    if (filters.dateTo) {
      where.executedAt.lte = filters.dateTo
    }
  }

  const executions = await prisma.brazeExecution.findMany({
    where,
    take: filters.limit || 50,
    skip: filters.offset || 0,
    orderBy: {
      executedAt: 'desc',
    },
    include: {
      trigger: {
        select: {
          id: true,
          title: true,
          triggerType: true,
        },
      },
      executedByUser: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
      formDriver: {
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          cedula: true,
        },
      },
    },
  })

  const total = await prisma.brazeExecution.count({ where })

  return {
    executions,
    total,
    limit: filters.limit || 50,
    offset: filters.offset || 0,
  }
}
