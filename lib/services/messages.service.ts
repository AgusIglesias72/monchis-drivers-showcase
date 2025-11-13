// lib/services/messages.service.ts

import { prisma } from '@/lib/prisma';
import {
  WhatsAppMessageType,
  WhatsAppMessageStatus,
  WhatsAppMessageSource,
  Prisma,
} from '@prisma/client';

// ==================== TYPES ====================

export interface SendWhatsAppMessageParams {
  phone: string;
  name: string;
  type: WhatsAppMessageType;
  step?: string;
  metadata?: Record<string, any>;
  customMessage?: string; // Para tipo CUSTOM
  formDriverId?: string;
  source?: WhatsAppMessageSource;
  sentBy?: string; // clerkId
  ipAddress?: string;
  userAgent?: string;
}

export interface WhatsAppBotResponse {
  success: boolean;
  data?: {
    phone: string;
    chatId: string;
    name: string;
    type: string;
    step?: string;
    message: string;
    messageLength: number;
    sentAt: string;
    responseTimeMs: number;
    metadata?: Record<string, any>;
  };
  error?: string;
}

export interface MessageFilters {
  type?: WhatsAppMessageType;
  status?: WhatsAppMessageStatus;
  source?: WhatsAppMessageSource;
  formDriverId?: string;
  sentBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string; // Buscar en recipientName, recipientPhone, message
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  orderBy?: 'sentAt' | 'createdAt' | 'updatedAt';
  orderDir?: 'asc' | 'desc';
}

export interface MessageStats {
  total: number;
  byType: Record<WhatsAppMessageType, number>;
  byStatus: Record<WhatsAppMessageStatus, number>;
  bySource: Record<WhatsAppMessageSource, number>;
  successRate: number;
  avgResponseTime: number;
  last24h: number;
  last7d: number;
  last30d: number;
}

// ==================== WHATSAPP BOT CLIENT ====================

const WHATSAPP_BOT_URL = process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL || '';
const WHATSAPP_BOT_API_KEY = process.env.WHATSAPP_BOT_API_KEY || '';

async function callWhatsAppBot(params: {
  phone: string;
  name: string;
  type: string;
  step?: string;
  metadata?: Record<string, any>;
  customMessage?: string;
}): Promise<WhatsAppBotResponse> {
  try {
    // Convertir tipo de UPPERCASE a snake_case para el bot
    const botType = params.type.toLowerCase();

    // Para mensajes CUSTOM, usar el endpoint /send-message
    if (params.type === 'CUSTOM' && params.customMessage) {
      const response = await fetch(`${WHATSAPP_BOT_URL}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WHATSAPP_BOT_API_KEY,
        },
        body: JSON.stringify({
          phone: params.phone,
          message: params.customMessage,
          type: 'custom',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      // Adaptar la respuesta al formato esperado
      return {
        success: true,
        data: {
          phone: data.phone,
          chatId: data.chatId,
          name: params.name,
          type: 'custom',
          message: params.customMessage,
          messageLength: params.customMessage.length,
          sentAt: data.sentAt,
          responseTimeMs: 0,
        },
      };
    }

    // Para mensajes contextuales, usar el endpoint existente
    const response = await fetch(`${WHATSAPP_BOT_URL}/send-contextual-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WHATSAPP_BOT_API_KEY,
      },
      body: JSON.stringify({
        phone: params.phone,
        name: params.name,
        type: botType, // ← Usar el tipo convertido a snake_case
        step: params.step,
        metadata: params.metadata,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('Error calling WhatsApp bot:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==================== HELPER FUNCTIONS ====================

function formatPhoneNumber(phone: string): string {
  // Remover caracteres no numéricos
  let cleanPhone = phone.replace(/\D/g, '');

  // Si no tiene código de país, asumir Argentina (54)
  if (!cleanPhone.startsWith('54') && cleanPhone.length === 10) {
    cleanPhone = '54' + cleanPhone;
  }

  return cleanPhone;
}

function formatPhoneForDisplay(phone: string): string {
  const clean = formatPhoneNumber(phone);

  // Si es argentino (54), formatear como +54 9 11 xxxx-xxxx
  if (clean.startsWith('54')) {
    const areaCode = clean.substring(2, 4);
    const firstPart = clean.substring(4, 8);
    const secondPart = clean.substring(8);
    return `+54 9 ${areaCode} ${firstPart}-${secondPart}`;
  }

  return `+${clean}`;
}

// ==================== SERVICE FUNCTIONS ====================

/**
 * Envía un mensaje de WhatsApp y lo registra en la base de datos
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppMessageParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const startTime = Date.now();

  try {
    // 1. Formatear teléfono
    const formattedPhone = formatPhoneNumber(params.phone);

    // 2. Llamar al bot de WhatsApp
    const botResponse = await callWhatsAppBot({
      phone: formattedPhone,
      name: params.name,
      type: params.type,
      step: params.step,
      metadata: params.metadata,
      customMessage: params.customMessage,
    });

    const endTime = Date.now();
    const responseTimeMs = endTime - startTime;

    // 3. Preparar datos para guardar
    const messageData: Prisma.WhatsAppMessageCreateInput = {
      recipientPhone: formattedPhone,
      recipientName: params.name,
      chatId: botResponse.data?.chatId || `${formattedPhone}@c.us`,
      messageType: params.type,
      step: params.step,
      message: botResponse.data?.message || '',
      messageLength: botResponse.data?.messageLength || 0,
      metadata: params.metadata,
      status: botResponse.success ? WhatsAppMessageStatus.SENT : WhatsAppMessageStatus.FAILED,
      sentAt: botResponse.data?.sentAt ? new Date(botResponse.data.sentAt) : new Date(),
      responseTimeMs: botResponse.data?.responseTimeMs || responseTimeMs,
      errorMessage: botResponse.error,
      source: params.source || WhatsAppMessageSource.MANUAL,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    };

    // 4. Agregar relaciones si existen
    if (params.formDriverId) {
      messageData.formDriver = {
        connect: { id: params.formDriverId },
      };
    }

    if (params.sentBy) {
      messageData.sentByUser = {
        connect: { id: params.sentBy },
      };
    }

    // 5. Guardar en base de datos
    const savedMessage = await prisma.whatsAppMessage.create({
      data: messageData,
    });

    return {
      success: botResponse.success,
      messageId: savedMessage.id,
      error: botResponse.error,
    };
  } catch (error) {
    console.error('Error in sendWhatsAppMessage:', error);

    // Intentar guardar el error en DB de todos modos
    try {
      const errorMessage = await prisma.whatsAppMessage.create({
        data: {
          recipientPhone: formatPhoneNumber(params.phone),
          recipientName: params.name,
          chatId: `${formatPhoneNumber(params.phone)}@c.us`,
          messageType: params.type,
          step: params.step,
          message: '',
          messageLength: 0,
          metadata: params.metadata,
          status: WhatsAppMessageStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          source: params.source || WhatsAppMessageSource.MANUAL,
          formDriver: params.formDriverId
            ? { connect: { id: params.formDriverId } }
            : undefined,
          sentByUser: params.sentBy ? { connect: { id: params.sentBy } } : undefined,
        },
      });

      return {
        success: false,
        messageId: errorMessage.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } catch (dbError) {
      console.error('Error saving failed message to DB:', dbError);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Obtiene mensajes con filtros y paginación
 */
export async function getMessages(
  filters?: MessageFilters,
  pagination?: PaginationParams
) {
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 50;
  const skip = (page - 1) * limit;
  const orderBy = pagination?.orderBy || 'sentAt';
  const orderDir = pagination?.orderDir || 'desc';

  // Construir where clause
  const where: Prisma.WhatsAppMessageWhereInput = {};

  if (filters?.type) {
    where.messageType = filters.type;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.source) {
    where.source = filters.source;
  }

  if (filters?.formDriverId) {
    where.formDriverId = filters.formDriverId;
  }

  if (filters?.sentBy) {
    where.sentBy = filters.sentBy;
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.sentAt = {};
    if (filters.dateFrom) {
      where.sentAt.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      where.sentAt.lte = filters.dateTo;
    }
  }

  if (filters?.search) {
    where.OR = [
      { recipientName: { contains: filters.search, mode: 'insensitive' } },
      { recipientPhone: { contains: filters.search } },
      { message: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // Ejecutar queries
  const [messages, total] = await Promise.all([
    prisma.whatsAppMessage.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderBy]: orderDir },
      include: {
        formDriver: {
          select: {
            id: true,
            fullName: true,
            cedula: true,
            status: true,
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
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
}

/**
 * Obtiene un mensaje por ID
 */
export async function getMessageById(id: string) {
  return prisma.whatsAppMessage.findUnique({
    where: { id },
    include: {
      formDriver: {
        select: {
          id: true,
          fullName: true,
          cedula: true,
          phoneNumber: true,
          email: true,
          status: true,
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
}

/**
 * Obtiene mensajes de un driver específico
 */
export async function getMessagesByDriver(formDriverId: string, limit = 20) {
  return prisma.whatsAppMessage.findMany({
    where: { formDriverId },
    orderBy: { sentAt: 'desc' },
    take: limit,
    include: {
      sentByUser: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });
}

/**
 * Obtiene estadísticas generales de mensajes
 */
export async function getMessageStats(
  dateFrom?: Date,
  dateTo?: Date
): Promise<MessageStats> {
  const where: Prisma.WhatsAppMessageWhereInput = {};

  if (dateFrom || dateTo) {
    where.sentAt = {};
    if (dateFrom) where.sentAt.gte = dateFrom;
    if (dateTo) where.sentAt.lte = dateTo;
  }

  // Total de mensajes
  const total = await prisma.whatsAppMessage.count({ where });

  // Por tipo
  const byTypeRaw = await prisma.whatsAppMessage.groupBy({
    by: ['messageType'],
    where,
    _count: true,
  });

  const byType = Object.fromEntries(
    byTypeRaw.map((item) => [item.messageType, item._count])
  ) as Record<WhatsAppMessageType, number>;

  // Por status
  const byStatusRaw = await prisma.whatsAppMessage.groupBy({
    by: ['status'],
    where,
    _count: true,
  });

  const byStatus = Object.fromEntries(
    byStatusRaw.map((item) => [item.status, item._count])
  ) as Record<WhatsAppMessageStatus, number>;

  // Por source
  const bySourceRaw = await prisma.whatsAppMessage.groupBy({
    by: ['source'],
    where,
    _count: true,
  });

  const bySource = Object.fromEntries(
    bySourceRaw.map((item) => [item.source, item._count])
  ) as Record<WhatsAppMessageSource, number>;

  // Success rate
  const sent = byStatus[WhatsAppMessageStatus.SENT] || 0;
  const failed = byStatus[WhatsAppMessageStatus.FAILED] || 0;
  const successRate = total > 0 ? (sent / total) * 100 : 0;

  // Average response time
  const avgResponseTimeResult = await prisma.whatsAppMessage.aggregate({
    where: {
      ...where,
      responseTimeMs: { not: null },
    },
    _avg: {
      responseTimeMs: true,
    },
  });

  const avgResponseTime = avgResponseTimeResult._avg.responseTimeMs || 0;

  // Mensajes por período
  const now = new Date();
  const last24h = await prisma.whatsAppMessage.count({
    where: {
      sentAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
  });

  const last7d = await prisma.whatsAppMessage.count({
    where: {
      sentAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    },
  });

  const last30d = await prisma.whatsAppMessage.count({
    where: {
      sentAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
    },
  });

  return {
    total,
    byType,
    byStatus,
    bySource,
    successRate,
    avgResponseTime,
    last24h,
    last7d,
    last30d,
  };
}

/**
 * Reintentar envío de mensaje fallido
 */
export async function retryFailedMessage(messageId: string, sentBy?: string) {
  const message = await prisma.whatsAppMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  if (message.status !== WhatsAppMessageStatus.FAILED) {
    throw new Error('Message is not in failed status');
  }

  if (message.retryCount >= message.maxRetries) {
    throw new Error('Max retries reached');
  }

  // Actualizar contador de reintentos
  await prisma.whatsAppMessage.update({
    where: { id: messageId },
    data: {
      retryCount: { increment: 1 },
      status: WhatsAppMessageStatus.SENDING,
    },
  });

  // Intentar reenviar
  return sendWhatsAppMessage({
    phone: message.recipientPhone,
    name: message.recipientName,
    type: message.messageType,
    step: message.step || undefined,
    metadata: (message.metadata as Record<string, any>) || undefined,
    formDriverId: message.formDriverId || undefined,
    source: WhatsAppMessageSource.MANUAL,
    sentBy,
  });
}

/**
 * Obtener mensajes recientes (para dashboard)
 */
export async function getRecentMessages(limit = 10) {
  return prisma.whatsAppMessage.findMany({
    take: limit,
    orderBy: { sentAt: 'desc' },
    include: {
      formDriver: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });
}

/**
 * Marcar mensaje como entregado (para webhooks futuros)
 */
export async function markMessageAsDelivered(messageId: string) {
  return prisma.whatsAppMessage.update({
    where: { id: messageId },
    data: {
      status: WhatsAppMessageStatus.DELIVERED,
      deliveredAt: new Date(),
    },
  });
}

/**
 * Marcar mensaje como leído (para webhooks futuros)
 */
export async function markMessageAsRead(messageId: string) {
  return prisma.whatsAppMessage.update({
    where: { id: messageId },
    data: {
      status: WhatsAppMessageStatus.READ,
      readAt: new Date(),
    },
  });
}

// ==================== EXPORTS ====================

export const messagesService = {
  sendWhatsAppMessage,
  getMessages,
  getMessageById,
  getMessagesByDriver,
  getMessageStats,
  retryFailedMessage,
  getRecentMessages,
  markMessageAsDelivered,
  markMessageAsRead,
  formatPhoneNumber,
  formatPhoneForDisplay,
};