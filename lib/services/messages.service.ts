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
  customMessage?: string;
  formDriverId?: string;
  source?: WhatsAppMessageSource;
  sentBy?: string;
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
  search?: string;
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
    const botType = params.type.toLowerCase();

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

    const response = await fetch(`${WHATSAPP_BOT_URL}/send-contextual-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WHATSAPP_BOT_API_KEY,
      },
      body: JSON.stringify({
        phone: params.phone,
        name: params.name,
        type: botType,
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

/**
 * Formatea un número de teléfono al formato internacional correcto
 * Soporta: Paraguay (595) y Argentina (54)
 * 
 * Ejemplos:
 * "984039476" → "595984039476"
 * "0984039476" → "595984039476"
 * "595984039476" → "595984039476"
 * "1158165977" → "541158165977"
 */
function formatPhoneNumber(phone: string): string {
  // Remover caracteres no numéricos
  let cleanPhone = phone.replace(/\D/g, '');

  // Si ya tiene código de país de Paraguay (595), retornar
  if (cleanPhone.startsWith('595')) {
    return cleanPhone;
  }

  // Si es argentino (54), mantener
  if (cleanPhone.startsWith('54') && cleanPhone.length >= 12) {
    return cleanPhone;
  }

  // Si tiene 9 dígitos, asumir Paraguay (595 + número)
  if (cleanPhone.length === 9) {
    return '595' + cleanPhone;
  }

  // Si empieza con 0 y tiene 10 dígitos, remover 0 y agregar 595 (Paraguay)
  if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    return '595' + cleanPhone.substring(1);
  }

  // Si tiene 10 dígitos y NO empieza con 0, asumir Argentina sin código
  if (cleanPhone.length === 10 && !cleanPhone.startsWith('0')) {
    return '54' + cleanPhone;
  }

  // Si ya tiene longitud correcta (12-13 dígitos), retornar como está
  if (cleanPhone.length >= 12) {
    return cleanPhone;
  }

  // Último recurso: si tiene 9 dígitos sin código, asumir Paraguay
  if (cleanPhone.length === 9) {
    return '595' + cleanPhone;
  }

  // Default: agregar 595 (Paraguay es el país principal)
  return '595' + cleanPhone;
}

function formatPhoneForDisplay(phone: string): string {
  const clean = formatPhoneNumber(phone);

  // Si es paraguayo (595)
  if (clean.startsWith('595')) {
    const number = clean.substring(3);
    return `+595 ${number.substring(0, 3)} ${number.substring(3)}`;
  }

  // Si es argentino (54)
  if (clean.startsWith('54')) {
    const areaCode = clean.substring(2, 4);
    const firstPart = clean.substring(4, 8);
    const secondPart = clean.substring(8);
    return `+54 9 ${areaCode} ${firstPart}-${secondPart}`;
  }

  return `+${clean}`;
}

// ==================== SERVICE FUNCTIONS ====================

export async function sendWhatsAppMessage(
  params: SendWhatsAppMessageParams
): Promise<{ 
  success: boolean; 
  messageId?: string; 
  error?: string;
  warning?: string;
}> {
  const startTime = Date.now();

  try {
    const formattedPhone = formatPhoneNumber(params.phone);
    
    console.log('📞 Formatting phone:', {
      original: params.phone,
      formatted: formattedPhone
    });

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

    if (!botResponse.success) {
      try {
        const errorMessage = await prisma.whatsAppMessage.create({
          data: {
            recipientPhone: formattedPhone,
            recipientName: params.name,
            chatId: `${formattedPhone}@c.us`,
            messageType: params.type,
            step: params.step,
            message: '',
            messageLength: 0,
            metadata: params.metadata,
            status: WhatsAppMessageStatus.FAILED,
            errorMessage: botResponse.error,
            source: params.source || WhatsAppMessageSource.MANUAL,
            formDriver: params.formDriverId
              ? { connect: { id: params.formDriverId } }
              : undefined,
            sentByUser: params.sentBy ? { connect: { id: params.sentBy } } : undefined,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
          },
        });

        return {
          success: false,
          messageId: errorMessage.id,
          error: botResponse.error,
        };
      } catch (dbError) {
        console.error('Error saving failed message to DB:', dbError);
        return {
          success: false,
          error: botResponse.error,
        };
      }
    }

    const messageData: Prisma.WhatsAppMessageCreateInput = {
      recipientPhone: formattedPhone,
      recipientName: params.name,
      chatId: botResponse.data?.chatId || `${formattedPhone}@c.us`,
      messageType: params.type,
      step: params.step,
      message: botResponse.data?.message || '',
      messageLength: botResponse.data?.messageLength || 0,
      metadata: params.metadata,
      status: WhatsAppMessageStatus.SENT,
      sentAt: botResponse.data?.sentAt ? new Date(botResponse.data.sentAt) : new Date(),
      responseTimeMs: botResponse.data?.responseTimeMs || responseTimeMs,
      source: params.source || WhatsAppMessageSource.MANUAL,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    };

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

    try {
      const savedMessage = await prisma.whatsAppMessage.create({
        data: messageData,
      });

      return {
        success: true,
        messageId: savedMessage.id,
      };
    } catch (dbError) {
      console.error('⚠️ Message sent but NOT saved to DB:', dbError);
      
      return {
        success: true,
        error: undefined,
        warning: 'El mensaje se envió correctamente pero no se pudo registrar en la base de datos',
      };
    }
  } catch (error) {
    console.error('Error in sendWhatsAppMessage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getMessages(
  filters?: MessageFilters,
  pagination?: PaginationParams
) {
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 50;
  const skip = (page - 1) * limit;
  const orderBy = pagination?.orderBy || 'sentAt';
  const orderDir = pagination?.orderDir || 'desc';

  const where: Prisma.WhatsAppMessageWhereInput = {};

  if (filters?.type) where.messageType = filters.type;
  if (filters?.status) where.status = filters.status;
  if (filters?.source) where.source = filters.source;
  if (filters?.formDriverId) where.formDriverId = filters.formDriverId;
  if (filters?.sentBy) where.sentBy = filters.sentBy;

  if (filters?.dateFrom || filters?.dateTo) {
    where.sentAt = {};
    if (filters.dateFrom) where.sentAt.gte = filters.dateFrom;
    if (filters.dateTo) where.sentAt.lte = filters.dateTo;
  }

  if (filters?.search) {
    where.OR = [
      { recipientName: { contains: filters.search, mode: 'insensitive' } },
      { recipientPhone: { contains: filters.search } },
      { message: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

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

  const total = await prisma.whatsAppMessage.count({ where });

  const byTypeRaw = await prisma.whatsAppMessage.groupBy({
    by: ['messageType'],
    where,
    _count: true,
  });

  const byType = Object.fromEntries(
    byTypeRaw.map((item) => [item.messageType, item._count])
  ) as Record<WhatsAppMessageType, number>;

  const byStatusRaw = await prisma.whatsAppMessage.groupBy({
    by: ['status'],
    where,
    _count: true,
  });

  const byStatus = Object.fromEntries(
    byStatusRaw.map((item) => [item.status, item._count])
  ) as Record<WhatsAppMessageStatus, number>;

  const bySourceRaw = await prisma.whatsAppMessage.groupBy({
    by: ['source'],
    where,
    _count: true,
  });

  const bySource = Object.fromEntries(
    bySourceRaw.map((item) => [item.source, item._count])
  ) as Record<WhatsAppMessageSource, number>;

  const sent = byStatus[WhatsAppMessageStatus.SENT] || 0;
  const failed = byStatus[WhatsAppMessageStatus.FAILED] || 0;
  const successRate = total > 0 ? (sent / total) * 100 : 0;

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

  await prisma.whatsAppMessage.update({
    where: { id: messageId },
    data: {
      retryCount: { increment: 1 },
      status: WhatsAppMessageStatus.SENDING,
    },
  });

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

export async function markMessageAsDelivered(messageId: string) {
  return prisma.whatsAppMessage.update({
    where: { id: messageId },
    data: {
      status: WhatsAppMessageStatus.DELIVERED,
      deliveredAt: new Date(),
    },
  });
}

export async function markMessageAsRead(messageId: string) {
  return prisma.whatsAppMessage.update({
    where: { id: messageId },
    data: {
      status: WhatsAppMessageStatus.READ,
      readAt: new Date(),
    },
  });
}

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