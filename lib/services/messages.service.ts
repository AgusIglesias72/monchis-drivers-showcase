// lib/services/messages.service.ts

import { prisma } from '@/lib/prisma';
import {
  WhatsAppMessageType,
  WhatsAppMessageStatus,
  WhatsAppMessageSource,
  Prisma,
} from '@prisma/client';
import { whatsappBotService, WHATSAPP_BOT_ID } from './whatsapp-bot.service';

// Compat: el param `botId` ya no selecciona bot (single-tenant). Se acepta
// para no romper call sites legacy pero se ignora — el bot único es el de
// apps/whatsapp-bot/ corriendo en Railway.
type BotId = string;

// ==================== TYPES ====================

export interface SendWhatsAppMessageParams {
  phone: string;
  name: string;
  type: WhatsAppMessageType;
  step?: string;
  metadata?: Record<string, any>;
  customMessage?: string;
  imageUrl?: string;
  formDriverId?: string;
  source?: WhatsAppMessageSource;
  sentBy?: string;
  ipAddress?: string;
  userAgent?: string;
  botId?: BotId;
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
  botUsed?: string;
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
  botId?: string;
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
  byBot: Record<string, number>;
  successRate: number;
  avgResponseTime: number;
  last24h: number;
  last7d: number;
  last30d: number;
}

// ==================== HELPER FUNCTIONS ====================

function formatPhoneNumber(phone: string): string {
  let cleanPhone = phone.replace(/\D/g, '');

  if (cleanPhone.startsWith('595')) {
    return cleanPhone;
  }

  if (cleanPhone.startsWith('54') && cleanPhone.length >= 12) {
    return cleanPhone;
  }

  if (cleanPhone.length === 9) {
    return '595' + cleanPhone;
  }

  if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    return '595' + cleanPhone.substring(1);
  }

  if (cleanPhone.length === 10 && !cleanPhone.startsWith('0')) {
    return '549' + cleanPhone;
  }

  if (cleanPhone.length >= 12) {
    return cleanPhone;
  }

  return '595' + cleanPhone;
}

function formatPhoneForDisplay(phone: string): string {
  const clean = formatPhoneNumber(phone);

  if (clean.startsWith('595')) {
    const number = clean.substring(3);
    return `+595 ${number.substring(0, 3)} ${number.substring(3)}`;
  }

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
  botUsed?: string;
}> {
  const startTime = Date.now();

  try {
    const formattedPhone = formatPhoneNumber(params.phone);

    console.log('📞 Formatting phone:', {
      original: params.phone,
      formatted: formattedPhone,
    });

    // Single-tenant: siempre el mismo bot. botId legacy se ignora.
    const botId = WHATSAPP_BOT_ID;

    let botResponse;

    // Si el caller ya armó el texto (customMessage) o manda imagen, lo enviamos
    // directo — sin importar el `type`. El `type` se usa solo para auditoría.
    // Solo caemos al template contextual del bot cuando NO hay texto propio
    // (camino legacy, prácticamente sin uso hoy).
    if (params.customMessage || params.imageUrl) {
      botResponse = await whatsappBotService.sendMessage({
        phone: formattedPhone,
        message: params.customMessage || '',
        type: params.type.toLowerCase(),
        ...(params.imageUrl ? { imageUrl: params.imageUrl } : {}),
      });
    } else {
      botResponse = await whatsappBotService.sendContextualMessage({
        phone: formattedPhone,
        name: params.name,
        type: params.type.toLowerCase(),
        step: params.step,
        metadata: params.metadata,
      });
    }

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
            botId: botId,
            formDriver: params.formDriverId ? { connect: { id: params.formDriverId } } : undefined,
            sentByUser: params.sentBy ? { connect: { id: params.sentBy } } : undefined,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
          },
        });

        return {
          success: false,
          messageId: errorMessage.id,
          error: botResponse.error,
          botUsed: botId,
        };
      } catch (dbError) {
        console.error('Error saving failed message to DB:', dbError);
        return {
          success: false,
          error: botResponse.error,
          botUsed: botId,
        };
      }
    }

    const messageData: Prisma.WhatsAppMessageCreateInput = {
      recipientPhone: formattedPhone,
      recipientName: params.name,
      chatId: botResponse.data?.chatId || `${formattedPhone}@c.us`,
      messageType: params.type,
      step: params.step,
      message: botResponse.data?.message || params.customMessage || '',
      messageLength: botResponse.data?.messageLength || params.customMessage?.length || 0,
      metadata: params.metadata,
      status: WhatsAppMessageStatus.SENT,
      sentAt: botResponse.data?.sentAt ? new Date(botResponse.data.sentAt) : new Date(),
      responseTimeMs: botResponse.data?.responseTimeMs || responseTimeMs,
      source: params.source || WhatsAppMessageSource.MANUAL,
      botId: botId,
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
        botUsed: botId,
      };
    } catch (dbError) {
      console.error('⚠️ Message sent but NOT saved to DB:', dbError);

      return {
        success: true,
        error: undefined,
        warning: 'El mensaje se envió correctamente pero no se pudo registrar en la base de datos',
        botUsed: botId,
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

export async function getMessages(filters?: MessageFilters, pagination?: PaginationParams) {
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
  if (filters?.botId) where.botId = filters.botId;

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

export async function getMessageStats(dateFrom?: Date, dateTo?: Date): Promise<MessageStats> {
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

  const byBotRaw = await prisma.whatsAppMessage.groupBy({
    by: ['botId'],
    where,
    _count: true,
  });

  const byBot = Object.fromEntries(
    byBotRaw.map((item) => [item.botId || 'unknown', item._count])
  ) as Record<string, number>;

  const sent = byStatus[WhatsAppMessageStatus.SENT] || 0;
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
    byBot,
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
    botId: (message.botId as BotId) || undefined,
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

// ==================== BULK MESSAGING ====================

export interface BulkRecipient {
  phone: string;
  name?: string;
  variables: Record<string, string>;
}

export interface ParsedRecipientsResult {
  recipients: BulkRecipient[];
  headers: string[];
  errors: string[];
}

export interface BulkSendResult {
  phone: string;
  name?: string;
  success: boolean;
  messageId?: string;
  botUsed?: string;
  error?: string;
  sentAt?: string;
  hasImage?: boolean;
  warning?: string;
}

export interface SendBulkMessagesParams {
  recipients: BulkRecipient[];
  message: string;
  imageUrl?: string;
  botId?: BotId;
  delayMs?: number;
  sentBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Parsea entrada de destinatarios con soporte para:
 * - Solo números (uno por línea)
 * - CSV con headers (primera línea = nombres de columnas)
 * - CSV sin headers (asume: telefono, nombre)
 * 
 * Headers especiales:
 * - telefono, phone, numero, number → campo de teléfono (requerido)
 * - nombre, name → se usa también como fallback para {nombre}
 * - Cualquier otro header → variable disponible
 */
export function parseRecipients(input: string): ParsedRecipientsResult {
  const lines = input.trim().split('\n').map(line => line.trim()).filter(Boolean);
  const recipients: BulkRecipient[] = [];
  const errors: string[] = [];
  
  if (lines.length === 0) {
    return { recipients: [], headers: [], errors: ['No hay datos para procesar'] };
  }

  // Detectar si la primera línea es un header
  const firstLine = lines[0];
  const firstLineParts = firstLine.split(',').map(p => p.trim().toLowerCase());
  
  // Palabras clave que indican que es un header
  const phoneKeywords = ['telefono', 'teléfono', 'phone', 'numero', 'número', 'number', 'cel', 'celular', 'mobile', 'whatsapp'];
  const hasHeader = firstLineParts.some(part => phoneKeywords.includes(part));
  
  let headers: string[] = [];
  let phoneIndex = 0;
  let startIndex = 0;

  if (hasHeader) {
    // Primera línea es header
    headers = firstLine.split(',').map(h => h.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    phoneIndex = headers.findIndex(h => phoneKeywords.includes(h));
    
    if (phoneIndex === -1) {
      return { recipients: [], headers: [], errors: ['No se encontró columna de teléfono en el header'] };
    }
    
    startIndex = 1; // Empezar desde la segunda línea
  } else {
    // Sin header - detectar formato
    const hasComma = firstLine.includes(',');
    
    if (hasComma) {
      // Asumir formato: telefono, nombre, ...otras columnas
      const sampleParts = firstLine.split(',');
      headers = ['telefono', 'nombre'];
      
      // Agregar columnas genéricas si hay más
      for (let i = 2; i < sampleParts.length; i++) {
        headers.push(`columna${i + 1}`);
      }
    } else {
      // Solo números
      headers = ['telefono'];
    }
    
    phoneIndex = 0;
    startIndex = 0;
  }

  // Procesar líneas de datos
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    
    if (!line.includes(',') && headers.length === 1) {
      // Solo número de teléfono
      const phone = line.replace(/\D/g, '');
      
      if (phone.length < 8) {
        errors.push(`Línea ${lineNumber}: Número muy corto "${line}"`);
        continue;
      }
      
      recipients.push({
        phone,
        name: undefined,
        variables: { nombre: 'Usuario' },
      });
    } else {
      // CSV con columnas
      const parts = line.split(',').map(p => p.trim());
      
      if (parts.length < headers.length) {
        // Rellenar con vacíos si faltan columnas
        while (parts.length < headers.length) {
          parts.push('');
        }
      }
      
      const phone = parts[phoneIndex]?.replace(/\D/g, '');
      
      if (!phone || phone.length < 8) {
        errors.push(`Línea ${lineNumber}: Teléfono inválido "${parts[phoneIndex] || '(vacío)'}"`);
        continue;
      }
      
      // Construir variables desde todas las columnas
      const variables: Record<string, string> = {};
      
      headers.forEach((header, idx) => {
        if (idx !== phoneIndex && parts[idx]) {
          variables[header] = parts[idx];
        }
      });
      
      // Asegurar que siempre exista {nombre}
      const nameIndex = headers.findIndex(h => ['nombre', 'name'].includes(h));
      const name = nameIndex !== -1 ? parts[nameIndex] : undefined;
      
      if (!variables['nombre']) {
        variables['nombre'] = name || 'Usuario';
      }
      
      recipients.push({
        phone,
        name,
        variables,
      });
    }
  }

  // Filtrar headers para no incluir el de teléfono en las variables disponibles
  const variableHeaders = headers.filter((_, idx) => idx !== phoneIndex);

  return { 
    recipients, 
    headers: variableHeaders,
    errors,
  };
}

/**
 * Reemplaza todas las variables en el mensaje
 */
export function replaceMessageVariables(
  template: string,
  variables: Record<string, string>
): string {
  let message = template;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'gi');
    message = message.replace(regex, value || '');
  });

  // Limpiar variables no reemplazadas (opcional: dejar o quitar)
  // message = message.replace(/\{[^}]+\}/g, '');

  return message;
}

/**
 * Extrae las variables usadas en un template
 */
export function extractVariablesFromTemplate(template: string): string[] {
  const matches = template.match(/\{([^}]+)\}/g) || [];
  return matches.map(m => m.slice(1, -1).toLowerCase());
}

export async function validateBulkRecipients(params: {
  recipients: BulkRecipient[];
  message: string;
  imageUrl?: string;
  delayMs?: number;
}): Promise<{
  success: boolean;
  recipients: Array<{
    phone: string;
    name?: string;
    message: string;
    variables: Record<string, string>;
    hasImage: boolean;
  }>;
  total: number;
  estimatedTimeMinutes: number;
  variablesUsed: string[];
  variablesAvailable: string[];
  error?: string;
}> {
  const { recipients, message, imageUrl, delayMs = 2000 } = params;

  if (recipients.length === 0) {
    return {
      success: false,
      recipients: [],
      total: 0,
      estimatedTimeMinutes: 0,
      variablesUsed: [],
      variablesAvailable: [],
      error: 'No hay destinatarios válidos',
    };
  }

  if (recipients.length > 100) {
    return {
      success: false,
      recipients: [],
      total: 0,
      estimatedTimeMinutes: 0,
      variablesUsed: [],
      variablesAvailable: [],
      error: 'Máximo 100 destinatarios por envío',
    };
  }

  const variablesUsed = extractVariablesFromTemplate(message);
  
  // Obtener todas las variables disponibles de los recipients
  const variablesAvailable = [...new Set(
    recipients.flatMap(r => Object.keys(r.variables))
  )];

  const validatedRecipients = recipients.map((recipient) => ({
    phone: formatPhoneNumber(recipient.phone),
    name: recipient.name,
    message: replaceMessageVariables(message, recipient.variables),
    variables: recipient.variables,
    hasImage: !!imageUrl,
  }));

  const estimatedTimeMinutes = Math.ceil((recipients.length * (delayMs / 1000)) / 60);

  return {
    success: true,
    recipients: validatedRecipients,
    total: recipients.length,
    estimatedTimeMinutes,
    variablesUsed,
    variablesAvailable,
  };
}

/**
 * Envía mensajes en masa - Delega TODO al backend
 */
export async function sendBulkMessages(
  params: SendBulkMessagesParams
): Promise<{
  success: boolean;
  summary: {
    total: number;
    successful: number;
    failed: number;
    successRate: string;
    withImage?: number;
    textOnly?: number;
  };
  results: BulkSendResult[];
  completedAt: string;
  error?: string;
}> {
  const {
    recipients,
    message: messageTemplate,
    imageUrl,
    botId,
    delayMs = 2000,
    sentBy,
    ipAddress,
    userAgent,
  } = params;

  if (recipients.length === 0) {
    return {
      success: false,
      summary: { total: 0, successful: 0, failed: 0, successRate: '0' },
      results: [],
      completedAt: new Date().toISOString(),
      error: 'No hay destinatarios válidos',
    };
  }

  console.log(`📤 Iniciando envío masivo a ${recipients.length} destinatarios`);
  console.log(`📷 Con imagen: ${!!imageUrl}`);

  // Single-tenant: ya no se selecciona bot; conservamos el ID para persistirlo.
  const selectedBotId = WHATSAPP_BOT_ID;

  try {
    // Preparar mensajes con personalización. imageUrl global aplica a todos.
    const messages = recipients.map(recipient => {
      const formattedPhone = formatPhoneNumber(recipient.phone);
      const personalizedMessage = replaceMessageVariables(messageTemplate, recipient.variables);
      return {
        phone: formattedPhone,
        message: personalizedMessage,
        ...(imageUrl ? { imageUrl } : {}),
      };
    });

    const bulkResp = await whatsappBotService.sendBulk(messages, { delayMs });

    if (!bulkResp.success || !bulkResp.data) {
      return {
        success: false,
        summary: {
          total: recipients.length,
          successful: 0,
          failed: recipients.length,
          successRate: '0',
        },
        results: [],
        completedAt: new Date().toISOString(),
        error: bulkResp.error || 'Error del bot',
      };
    }

    const bulkResult = bulkResp.data;

    const results: BulkSendResult[] = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const result = bulkResult.results?.[i];
      const formattedPhone = formatPhoneNumber(recipient.phone);

      if (result && result.success) {
        try {
          const messageData: Prisma.WhatsAppMessageCreateInput = {
            recipientPhone: formattedPhone,
            recipientName: recipient.name || 'Usuario',
            chatId: `${formattedPhone}@c.us`,
            messageType: WhatsAppMessageType.CUSTOM,
            message: messages[i].message,
            messageLength: messages[i].message.length,
            metadata: {
              bulkSend: true,
              bulkIndex: i + 1,
              bulkTotal: recipients.length,
              hasImage: !!imageUrl,
              variables: recipient.variables,
              ...(imageUrl ? { imageUrl } : {}),
            },
            status: WhatsAppMessageStatus.SENT,
            sentAt: result.sentAt ? new Date(result.sentAt) : new Date(),
            source: WhatsAppMessageSource.MANUAL,
            botId: selectedBotId,
            sentByUser: sentBy ? { connect: { id: sentBy } } : undefined,
            ipAddress,
            userAgent,
          };

          const savedMessage = await prisma.whatsAppMessage.create({ data: messageData });

          results.push({
            phone: recipient.phone,
            name: recipient.name,
            success: true,
            messageId: savedMessage.id,
            botUsed: selectedBotId,
            sentAt: result.sentAt || new Date().toISOString(),
            hasImage: !!imageUrl,
          });
        } catch (dbError) {
          console.error('⚠️ Mensaje enviado pero no guardado en BD:', dbError);
          results.push({
            phone: recipient.phone,
            name: recipient.name,
            success: true,
            botUsed: selectedBotId,
            sentAt: result.sentAt || new Date().toISOString(),
            hasImage: !!imageUrl,
            warning: 'Enviado pero no registrado en BD',
          });
        }
      } else {
        results.push({
          phone: recipient.phone,
          name: recipient.name,
          success: false,
          error: result?.error || 'Error desconocido',
        });
      }
    }

    const successful = bulkResult.summary?.successful ?? results.filter(r => r.success).length;
    const summary = {
      total: bulkResult.summary?.total ?? recipients.length,
      successful,
      failed: bulkResult.summary?.failed ?? results.filter(r => !r.success).length,
      successRate: ((successful / recipients.length) * 100).toFixed(2),
      ...(imageUrl
        ? {
            withImage: results.filter(r => r.success && r.hasImage).length,
            textOnly: 0,
          }
        : {}),
    };

    console.log(`📊 Envío masivo completado: ${summary.successful}/${summary.total} exitosos`);

    return {
      success: true,
      summary,
      results,
      completedAt: new Date().toISOString(),
    };

  } catch (error: any) {
    console.error('❌ Error en sendBulkMessages:', error);
    return {
      success: false,
      summary: { total: recipients.length, successful: 0, failed: recipients.length, successRate: '0' },
      results: [],
      completedAt: new Date().toISOString(),
      error: error.message || 'Error desconocido',
    };
  }
}

// ==================== EXPORT ====================

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
  
  // Envío masivo
  parseRecipients,
  replaceMessageVariables,
  extractVariablesFromTemplate,
  validateBulkRecipients,
  sendBulkMessages,
};