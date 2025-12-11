// lib/services/messages-history.service.ts
import { prisma } from '@/lib/prisma';
import { Prisma, WhatsAppMessageStatus, WhatsAppMessageType, WhatsAppMessageSource } from '@prisma/client';

export interface MessageFilters {
  search?: string;
  messageType?: WhatsAppMessageType | 'all';
  botId?: string | 'all';
  status?: WhatsAppMessageStatus | 'all';
  source?: WhatsAppMessageSource | 'all';
  dateFrom?: Date;
  dateTo?: Date;
}

export interface MessageStats {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  successRate: string;
  byBot: Record<string, number>;
  byType: Record<string, number>;
  bySource: Record<string, number>;
  avgResponseTime?: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Obtener mensajes con filtros y paginación
 * Se puede usar en Server Components
 */
export async function getMessagesWithFilters(
  filters: MessageFilters,
  pagination: PaginationParams
) {
  const { page, pageSize } = pagination;
  const skip = (page - 1) * pageSize;

  // Construir where clause
  const where: Prisma.WhatsAppMessageWhereInput = {};

  if (filters.search) {
    where.OR = [
      { recipientPhone: { contains: filters.search, mode: 'insensitive' } },
      { recipientName: { contains: filters.search, mode: 'insensitive' } },
      { message: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.messageType && filters.messageType !== 'all') {
    where.messageType = filters.messageType;
  }

  if (filters.botId && filters.botId !== 'all') {
    where.botId = filters.botId;
  }

  if (filters.status && filters.status !== 'all') {
    where.status = filters.status;
  }

  if (filters.source && filters.source !== 'all') {
    where.source = filters.source;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.sentAt = {};
    if (filters.dateFrom) where.sentAt.gte = filters.dateFrom;
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.sentAt.lte = endDate;
    }
  }

  // Obtener mensajes y total en paralelo
  const [messages, total] = await Promise.all([
    prisma.whatsAppMessage.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { sentAt: 'desc' },
      include: {
        formDriver: {
          select: {
            id: true,
            fullName: true,
          },
        },
        sentByUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    }),
    prisma.whatsAppMessage.count({ where }),
  ]);

  return {
    messages,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Obtener estadísticas de mensajes
 * Se puede usar en Server Components
 */
export async function getMessageStats(filters?: {
  dateFrom?: Date;
  dateTo?: Date;
}): Promise<MessageStats> {
  // Filtro de fecha
  const where: Prisma.WhatsAppMessageWhereInput = {};
  if (filters?.dateFrom || filters?.dateTo) {
    where.sentAt = {};
    if (filters.dateFrom) where.sentAt.gte = filters.dateFrom;
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.sentAt.lte = endDate;
    }
  }

  // Obtener estadísticas agregadas en paralelo
  const [
    total,
    successful,
    failed,
    pending,
    byBot,
    byType,
    bySource,
    avgResponseTime,
  ] = await Promise.all([
    // Total
    prisma.whatsAppMessage.count({ where }),
    
    // Exitosos (SENT, DELIVERED, READ)
    prisma.whatsAppMessage.count({
      where: {
        ...where,
        status: { in: [WhatsAppMessageStatus.SENT, WhatsAppMessageStatus.DELIVERED, WhatsAppMessageStatus.READ] },
      },
    }),
    
    // Fallidos
    prisma.whatsAppMessage.count({
      where: {
        ...where,
        status: WhatsAppMessageStatus.FAILED,
      },
    }),
    
    // Pendientes (SENDING)
    prisma.whatsAppMessage.count({
      where: {
        ...where,
        status: WhatsAppMessageStatus.SENDING,
      },
    }),
    
    // Por bot
    prisma.whatsAppMessage.groupBy({
      by: ['botId'],
      where,
      _count: true,
    }),
    
    // Por tipo
    prisma.whatsAppMessage.groupBy({
      by: ['messageType'],
      where,
      _count: true,
    }),
    
    // Por fuente
    prisma.whatsAppMessage.groupBy({
      by: ['source'],
      where,
      _count: true,
    }),
    
    // Tiempo promedio de respuesta
    prisma.whatsAppMessage.aggregate({
      where: {
        ...where,
        responseTimeMs: { not: null },
      },
      _avg: {
        responseTimeMs: true,
      },
    }),
  ]);

  // Calcular tasa de éxito
  const successRate = total > 0 ? ((successful / total) * 100).toFixed(2) : '0';

  // Transformar datos agrupados
  const byBotObj: Record<string, number> = {};
  byBot.forEach((item: any) => {
    byBotObj[item.botId || 'sin-bot'] = item._count;
  });

  const byTypeObj: Record<string, number> = {};
  byType.forEach((item: any) => {
    byTypeObj[item.messageType] = item._count;
  });

  const bySourceObj: Record<string, number> = {};
  bySource.forEach((item: any) => {
    bySourceObj[item.source] = item._count;
  });

  return {
    total,
    successful,
    failed,
    pending,
    successRate,
    byBot: byBotObj,
    byType: byTypeObj,
    bySource: bySourceObj,
    avgResponseTime: avgResponseTime._avg.responseTimeMs || undefined,
  };
}

/**
 * Obtener mensajes recientes (para el panel de pruebas)
 * Se puede usar en Server Components o Client Components
 */
export async function getRecentMessages(params?: {
  limit?: number;
  botId?: string;
}) {
  const limit = params?.limit || 20;
  const where: Prisma.WhatsAppMessageWhereInput = {};

  if (params?.botId) {
    where.botId = params.botId;
  }

  const messages = await prisma.whatsAppMessage.findMany({
    where,
    take: limit,
    orderBy: { sentAt: 'desc' },
    include: {
      formDriver: {
        select: {
          id: true,
          fullName: true,
        },
      },
      sentByUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  return { messages };
}

/**
 * Exportar mensajes a formato CSV (retorna los datos, no el archivo)
 * Se puede usar en Server Actions
 */
export async function getMessagesForExport(filters: MessageFilters) {
  const where: Prisma.WhatsAppMessageWhereInput = {};

  if (filters.search) {
    where.OR = [
      { recipientPhone: { contains: filters.search, mode: 'insensitive' } },
      { recipientName: { contains: filters.search, mode: 'insensitive' } },
      { message: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.messageType && filters.messageType !== 'all') {
    where.messageType = filters.messageType;
  }

  if (filters.botId && filters.botId !== 'all') {
    where.botId = filters.botId;
  }

  if (filters.status && filters.status !== 'all') {
    where.status = filters.status;
  }

  if (filters.source && filters.source !== 'all') {
    where.source = filters.source;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.sentAt = {};
    if (filters.dateFrom) where.sentAt.gte = filters.dateFrom;
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.sentAt.lte = endDate;
    }
  }

  // Máximo 10,000 registros para export
  const messages = await prisma.whatsAppMessage.findMany({
    where,
    take: 10000,
    orderBy: { sentAt: 'desc' },
    include: {
      formDriver: {
        select: {
          id: true,
          fullName: true,
        },
      },
      sentByUser: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });

  return messages;
}