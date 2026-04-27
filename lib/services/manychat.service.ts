// lib/services/manychat.service.ts

/**
 * Cliente tipado de la API pública de ManyChat.
 *
 * Aunque el canal sea WhatsApp, todos los endpoints viven bajo /fb/ (legacy del
 * tiempo de Messenger). No hay namespace /whatsapp/.
 *
 * Gotchas críticos:
 * - HTTP 200 NO significa éxito. ManyChat responde { status: "error", message: "..." }
 *   con HTTP 200 en errores lógicos. Este cliente parsea `status` y tira error tipado.
 * - `findBySystemField?phone=` NO devuelve subscribers que existen solo en WhatsApp.
 *   Para resolver un candidato por teléfono hay que espejar el número en un custom
 *   field y usar `findSubscriberByCustomField`. Lo ideal es guardar el subscriber_id
 *   en DB al momento de `createSubscriber` y no depender de lookup por teléfono.
 * - `sendContent` (mensaje libre) solo funciona dentro de la ventana de servicio de 24h.
 *   Para outbound fuera de ventana hay que envolver un template Meta aprobado en un Flow
 *   y usar `sendFlow`. Los templates no se mandan directo vía API.
 * - Rate limit oficial: 10 RPS en endpoints de subscriber. Asumir mismo techo en /sending/*
 *   y hacer backoff en 429.
 *
 * Doc: https://api.manychat.com/swagger
 */

// ==================== CONFIG ====================

const DEFAULT_BASE_URL = 'https://api.manychat.com';

function getConfig() {
  const token = process.env.MANYCHAT_API_TOKEN;
  if (!token) {
    throw new ManyChatAuthError('MANYCHAT_API_TOKEN no configurado en env');
  }
  const baseUrl = process.env.MANYCHAT_BASE_URL || DEFAULT_BASE_URL;
  return { token, baseUrl };
}

// ==================== ERRORS ====================

export class ManyChatError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly apiMessage: string,
    public readonly details?: unknown
  ) {
    super(`[ManyChat ${httpStatus}] ${apiMessage}`);
    this.name = 'ManyChatError';
  }
}

export class ManyChatAuthError extends ManyChatError {
  constructor(apiMessage: string, details?: unknown) {
    super(401, apiMessage, details);
    this.name = 'ManyChatAuthError';
  }
}

export class ManyChatRateLimitError extends ManyChatError {
  constructor(apiMessage: string, details?: unknown) {
    super(429, apiMessage, details);
    this.name = 'ManyChatRateLimitError';
  }
}

export class ManyChatNotFoundError extends ManyChatError {
  constructor(apiMessage: string, details?: unknown) {
    super(404, apiMessage, details);
    this.name = 'ManyChatNotFoundError';
  }
}

// ==================== TYPES ====================

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

interface ManyChatApiResponseOk<T> {
  status: 'success';
  data: T;
}

interface ManyChatApiResponseError {
  status: 'error';
  message: string;
  details?: unknown;
}

type ManyChatApiResponse<T> = ManyChatApiResponseOk<T> | ManyChatApiResponseError;

export interface ManyChatSubscriber {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  whatsapp_phone?: string;
  phone?: string;
  profile_pic?: string;
  locale?: string;
  language?: string;
  timezone?: string;
  optin_phone?: boolean;
  subscribed?: string;
  last_interaction?: string;
  last_seen?: string;
  custom_fields?: Array<{
    id: number;
    name: string;
    type: string;
    description?: string;
    value: Json;
  }>;
  tags?: Array<{ id: number; name: string }>;
}

export interface CreateSubscriberParams {
  firstName?: string;
  lastName?: string;
  /** E.164 con `+` y código de país. Ej: `+595981234567`. */
  whatsappPhone: string;
  /** Frase de consentimiento explícito. Requerida por Meta para WhatsApp. */
  consentPhrase: string;
  hasOptInSms?: boolean;
  /** Tags numéricos a asignar en el mismo request. */
  tagIds?: number[];
}

export interface CustomFieldValue {
  /** ID numérico del custom field. Preferido por estabilidad. */
  id?: number;
  /** Nombre del custom field. Alternativa a `id`. */
  name?: string;
  value: Json;
}

export interface CustomFieldDefinition {
  id: number;
  name: string;
  type: string;
  description?: string;
}

export interface TagDefinition {
  id: number;
  name: string;
}

// ==================== CORE REQUEST ====================

async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
  searchParams?: Record<string, string | number>
): Promise<T> {
  const { token, baseUrl } = getConfig();

  const url = new URL(path, baseUrl);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // ManyChat devuelve JSON tanto en éxito como en error (incluso con HTTP 5xx en muchos casos).
  // Si no es JSON parseable asumimos error de infra (Cloudflare, gateway caído, etc).
  let payload: ManyChatApiResponse<T> | undefined;
  try {
    payload = (await res.json()) as ManyChatApiResponse<T>;
  } catch {
    const text = await res.text().catch(() => '');
    throw new ManyChatError(res.status, 'Respuesta no-JSON de ManyChat', text);
  }

  if (!payload) {
    throw new ManyChatError(res.status, 'Respuesta vacía de ManyChat');
  }

  if (payload.status === 'error') {
    const msg = payload.message || 'Error sin mensaje';
    switch (res.status) {
      case 401:
        throw new ManyChatAuthError(msg, payload.details);
      case 404:
        throw new ManyChatNotFoundError(msg, payload.details);
      case 429:
        throw new ManyChatRateLimitError(msg, payload.details);
      default:
        throw new ManyChatError(res.status, msg, payload.details);
    }
  }

  return payload.data;
}

// ==================== SENDING ====================

/**
 * Envía un Flow al subscriber. Único método válido para outbound fuera de ventana 24h
 * o para disparar templates Meta aprobados (que se envuelven como primer nodo del Flow).
 */
export async function sendFlow(subscriberId: string, flowNs: string): Promise<void> {
  await request<unknown>('POST', '/fb/sending/sendFlow', {
    subscriber_id: subscriberId,
    flow_ns: flowNs,
  });
  console.log('[MANYCHAT] sendFlow ok', { subscriberId, flowNs });
}

/**
 * Envía contenido libre (texto, imagen, etc) al subscriber.
 * Solo funciona dentro de la ventana de servicio de 24h abierta por el usuario.
 * Fuera de ventana, la API devuelve error y hay que usar `sendFlow` con un template.
 */
export async function sendContent(
  subscriberId: string,
  messages: Array<
    | { type: 'text'; text: string }
    | { type: 'image' | 'video' | 'audio' | 'file'; url: string }
  >
): Promise<void> {
  await request<unknown>('POST', '/fb/sending/sendContent', {
    subscriber_id: subscriberId,
    data: { messages },
  });
  console.log('[MANYCHAT] sendContent ok', { subscriberId, count: messages.length });
}

// ==================== SUBSCRIBERS ====================

/**
 * Crea un subscriber de WhatsApp. `consent_phrase` es requerido por Meta.
 * Si ya existe un subscriber con ese teléfono, la API devuelve error — capturar
 * `ManyChatError` y hacer `findSubscriberByCustomField` como fallback.
 */
export async function createSubscriber(
  params: CreateSubscriberParams
): Promise<ManyChatSubscriber> {
  const body: Record<string, unknown> = {
    whatsapp_phone: params.whatsappPhone,
    consent_phrase: params.consentPhrase,
    has_opt_in_sms: params.hasOptInSms ?? false,
  };
  if (params.firstName) body.first_name = params.firstName;
  if (params.lastName) body.last_name = params.lastName;
  if (params.tagIds?.length) body.tags = params.tagIds;

  const data = await request<ManyChatSubscriber>(
    'POST',
    '/fb/subscriber/createSubscriber',
    body
  );
  console.log('[MANYCHAT] createSubscriber ok', {
    id: data.id,
    phone: params.whatsappPhone,
  });
  return data;
}

/**
 * Busca subscriber por campo de sistema.
 * OJO: `phone` NO encuentra subscribers solo-WhatsApp (solo los que tienen phone
 * en Messenger/SMS). Para WhatsApp usar `findSubscriberByCustomField`.
 * Devuelve null si no hay match.
 */
export async function findSubscriberBySystemField(
  field: 'phone' | 'email' | 'name',
  value: string
): Promise<ManyChatSubscriber | null> {
  try {
    const data = await request<ManyChatSubscriber[] | null>(
      'GET',
      '/fb/subscriber/findBySystemField',
      undefined,
      { [field]: value }
    );
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data[0];
  } catch (err) {
    if (err instanceof ManyChatNotFoundError) return null;
    throw err;
  }
}

/**
 * Busca subscriber por custom field. Es el workaround oficial para resolver
 * subscribers de WhatsApp por número — requiere tener un custom field que
 * espeje el `whatsapp_phone` y haberlo populado al crear.
 */
export async function findSubscriberByCustomField(
  fieldId: number,
  value: string
): Promise<ManyChatSubscriber | null> {
  try {
    const data = await request<ManyChatSubscriber[] | null>(
      'GET',
      '/fb/subscriber/findByCustomField',
      undefined,
      { field_id: fieldId, field_value: value }
    );
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return data[0];
  } catch (err) {
    if (err instanceof ManyChatNotFoundError) return null;
    throw err;
  }
}

export async function getSubscriberInfo(
  subscriberId: string
): Promise<ManyChatSubscriber> {
  return request<ManyChatSubscriber>('GET', '/fb/subscriber/getInfo', undefined, {
    subscriber_id: subscriberId,
  });
}

export async function setCustomField(
  subscriberId: string,
  field: { id: number } | { name: string },
  value: Json
): Promise<void> {
  const body: Record<string, unknown> = {
    subscriber_id: subscriberId,
    field_value: value,
    ...('id' in field ? { field_id: field.id } : { field_name: field.name }),
  };
  await request<unknown>('POST', '/fb/subscriber/setCustomField', body);
  console.log('[MANYCHAT] setCustomField ok', { subscriberId, field });
}

export async function setCustomFields(
  subscriberId: string,
  fields: CustomFieldValue[]
): Promise<void> {
  await request<unknown>('POST', '/fb/subscriber/setCustomFields', {
    subscriber_id: subscriberId,
    fields: fields.map((f) => ({
      ...(f.id !== undefined ? { field_id: f.id } : {}),
      ...(f.name !== undefined ? { field_name: f.name } : {}),
      field_value: f.value,
    })),
  });
  console.log('[MANYCHAT] setCustomFields ok', { subscriberId, count: fields.length });
}

export async function addTag(subscriberId: string, tagId: number): Promise<void> {
  await request<unknown>('POST', '/fb/subscriber/addTag', {
    subscriber_id: subscriberId,
    tag_id: tagId,
  });
}

export async function removeTag(subscriberId: string, tagId: number): Promise<void> {
  await request<unknown>('POST', '/fb/subscriber/removeTag', {
    subscriber_id: subscriberId,
    tag_id: tagId,
  });
}

// ==================== PAGE METADATA ====================

/** Lista todos los custom fields del bot. Útil para descubrir IDs en setup. */
export async function listCustomFields(): Promise<CustomFieldDefinition[]> {
  return request<CustomFieldDefinition[]>('GET', '/fb/page/getCustomFields');
}

/** Lista todos los tags del bot. */
export async function listTags(): Promise<TagDefinition[]> {
  return request<TagDefinition[]>('GET', '/fb/page/getTags');
}
