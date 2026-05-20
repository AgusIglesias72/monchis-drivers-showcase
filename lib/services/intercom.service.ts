// lib/services/intercom.service.ts
//
// Conector con la API de Intercom.
//
// Fase 1 (implementada): resolver el contact_id de Intercom para un driver
// nuestro y cachearlo en monchis_driver_cache. El search de Intercom cuesta
// 1 request por lookup, así que persistimos el resultado.
//
// Fase 2 (pendiente, ver TODOs al final): mensajería 1-1 y eventos para
// disparar campañas. Requiere confirmar qué endpoint NO consume el cupo
// outbound del plan.

import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { Prisma, type MonchisDriverCache } from '@prisma/client';

// ==================== CONFIG ====================

const INTERCOM_BASE_URL =
  process.env.INTERCOM_BASE_URL ?? 'https://api.intercom.io';
const INTERCOM_ACCESS_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;

// Intercom acepta hasta ~166 req/s sostenidos en API REST; nos quedamos muy
// por debajo para el bulk para no gatillar 429. Ajustable si hace falta.
const BULK_CONCURRENCY = 4;
const BULK_DELAY_MS = 100;

// La API versionada se setea por header. Si no se pasa, Intercom usa la
// versión "Stable" del workspace. Pinneamos para evitar sorpresas.
const INTERCOM_API_VERSION = '2.11';

// ==================== TYPES ====================

export interface IntercomContact {
  type: 'contact';
  id: string;
  workspace_id: string;
  external_id: string | null;
  role: 'user' | 'lead';
  email: string | null;
  phone: string | null;
  name: string | null;
  custom_attributes?: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  // ...muchos más campos. Tipamos solo lo que usamos.
}

interface IntercomList<T> {
  type: 'list';
  data: T[];
  total_count: number;
  pages: { type: 'pages'; page: number; per_page: number; total_pages: number };
}

type SearchOperator = '=' | '!=' | 'IN' | 'NIN' | '~' | '!~';
type SearchField =
  | 'external_id'
  | 'name'
  | 'email'
  | 'phone'
  | 'role'
  | 'id';

interface SingleQuery {
  field: SearchField;
  operator: SearchOperator;
  value: string | string[];
}

interface CompoundQuery {
  operator: 'AND' | 'OR';
  value: Array<SingleQuery | CompoundQuery>;
}

type SearchQuery = SingleQuery | CompoundQuery;

export interface SearchContactInput {
  externalId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export class IntercomError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'IntercomError';
  }
}

// ==================== HTTP CLIENT ====================

function authHeader(): string {
  if (!INTERCOM_ACCESS_TOKEN) {
    throw new Error(
      'INTERCOM_ACCESS_TOKEN no está seteado en el entorno.',
    );
  }
  return `Bearer ${INTERCOM_ACCESS_TOKEN}`;
}

async function intercomFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = path.startsWith('http')
    ? path
    : `${INTERCOM_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Intercom-Version': INTERCOM_API_VERSION,
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 429) {
    // Retry una sola vez con el Retry-After. Si Intercom sigue throttling,
    // que el caller decida (puede ser bulk y querer reintentar después).
    const retryAfter = Number(res.headers.get('Retry-After') ?? '1');
    await sleep(retryAfter * 1000);
    return intercomFetch<T>(path, init);
  }

  const text = await res.text();
  const body = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    throw new IntercomError(
      `Intercom ${init.method ?? 'GET'} ${path} → ${res.status}`,
      res.status,
      body,
    );
  }

  return body as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==================== SEARCH ====================

/**
 * Busca un contact en Intercom con estrategia de fallback en cascada:
 * external_id → email → phone → name. Devuelve el primer hit con resultado.
 * Si ningún campo matchea, devuelve null.
 *
 * Nota: el match por name es frágil (puede haber homónimos). Cuando devuelve
 * múltiples resultados, se toma el primero — los callers que necesiten
 * desambiguar pueden usar `searchContactsRaw` directamente.
 */
export async function searchContact(
  input: SearchContactInput,
): Promise<IntercomContact | null> {
  const attempts: Array<{ field: SearchField; value: string }> = [];

  if (input.externalId) {
    attempts.push({ field: 'external_id', value: input.externalId });
  }
  if (input.email) {
    attempts.push({ field: 'email', value: input.email });
  }
  if (input.phone) {
    attempts.push({ field: 'phone', value: input.phone });
  }
  if (input.name) {
    attempts.push({ field: 'name', value: input.name });
  }

  for (const attempt of attempts) {
    const list = await searchContactsRaw({
      field: attempt.field,
      operator: '=',
      value: attempt.value,
    });
    if (list.data.length > 0) {
      return list.data[0];
    }
  }

  return null;
}

/**
 * Wrapper bajo del endpoint /contacts/search. Útil cuando el caller necesita
 * pasar queries compuestas (AND/OR) o paginar.
 *
 * Ref: https://developers.intercom.com/intercom-api-reference/reference/searchcontacts
 */
export async function searchContactsRaw(
  query: SearchQuery,
): Promise<IntercomList<IntercomContact>> {
  return intercomFetch<IntercomList<IntercomContact>>('/contacts/search', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

// ==================== RESOLVE + CACHE ====================

export interface ResolveOptions {
  /** Si true, ignora el cache y vuelve a buscar contra Intercom. */
  force?: boolean;
}

/**
 * Resuelve el intercom_contact_id de un driver y lo persiste en DB.
 *
 * Orden:
 *   1. Si el driver ya tiene `intercomContactId` y no se pasó `force`,
 *      lo devuelve sin tocar la API.
 *   2. Busca en Intercom usando los identificadores disponibles del driver
 *      (email, phone, fullName). NO usa driver.driverId como external_id
 *      porque el external_id de Intercom es un legacy distinto (ver migration).
 *   3. Si encuentra match, persiste contactId + externalId + syncedAt y
 *      devuelve el id. Si no, persiste syncedAt y devuelve null (para no
 *      reintentar el mismo driver en cada bulk).
 */
export async function resolveContactId(
  driver: Pick<
    MonchisDriverCache,
    | 'driverId'
    | 'email'
    | 'phone'
    | 'fullName'
    | 'firstName'
    | 'lastName'
    | 'intercomContactId'
    | 'intercomExternalId'
  >,
  opts: ResolveOptions = {},
): Promise<string | null> {
  if (driver.intercomContactId && !opts.force) {
    return driver.intercomContactId;
  }

  const fullName =
    driver.fullName ??
    ([driver.firstName, driver.lastName].filter(Boolean).join(' ').trim() ||
      null);

  const contact = await searchContact({
    externalId: driver.intercomExternalId,
    email: driver.email,
    phone: driver.phone,
    name: fullName,
  });

  await prisma.monchisDriverCache.update({
    where: { driverId: driver.driverId },
    data: {
      intercomContactId: contact?.id ?? null,
      intercomExternalId: contact?.external_id ?? driver.intercomExternalId,
      intercomSyncedAt: new Date(),
    },
  });

  return contact?.id ?? null;
}

/**
 * Resuelve múltiples drivers en paralelo con concurrencia limitada.
 * Devuelve un Map driverId → contactId|null para que los callers puedan
 * detectar cuáles no se encontraron.
 *
 * Errores individuales NO frenan el bulk: se loguean y el driver queda con
 * contactId=null en el map (no se persiste error en DB).
 */
export async function bulkResolveContactIds(
  drivers: Array<
    Pick<
      MonchisDriverCache,
      | 'driverId'
      | 'email'
      | 'phone'
      | 'fullName'
      | 'firstName'
      | 'lastName'
      | 'intercomContactId'
      | 'intercomExternalId'
    >
  >,
  opts: ResolveOptions = {},
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  const queue = [...drivers];

  async function worker() {
    while (queue.length > 0) {
      const driver = queue.shift();
      if (!driver) return;
      try {
        const id = await resolveContactId(driver, opts);
        result.set(driver.driverId, id);
      } catch (err) {
        console.error(
          `[intercom] resolveContactId failed for driver ${driver.driverId}:`,
          err,
        );
        result.set(driver.driverId, null);
      }
      if (BULK_DELAY_MS > 0) await sleep(BULK_DELAY_MS);
    }
  }

  await Promise.all(
    Array.from({ length: BULK_CONCURRENCY }, () => worker()),
  );

  return result;
}

// ==================== HEALTH CHECK ====================

export interface IntercomMe {
  type: 'admin';
  id: string;
  email: string;
  name: string;
  app: {
    type: 'app';
    id_code: string;
    name: string;
    region: string;
    timezone?: string;
  };
}

/**
 * Pinguea la API con GET /me. Si responde 200, el token es válido y el
 * conector está OK. Usado para el badge de status en el panel.
 */
export async function getCurrentMe(): Promise<IntercomMe> {
  return intercomFetch<IntercomMe>('/me', { method: 'GET' });
}

// ==================== ADMINS (TEAMMATES) ====================

export interface IntercomAdmin {
  type: 'admin';
  id: string;
  name: string;
  email: string;
  job_title?: string | null;
  away_mode_enabled?: boolean;
  has_inbox_seat?: boolean;
}

interface AdminListResponse {
  type: 'admin.list';
  admins: IntercomAdmin[];
}

// Cache en memoria. Los admins no cambian seguido (alta/baja de teammates).
// 5 minutos es razonable; se pierde en cada redeploy de Vercel.
let adminsCache: { fetchedAt: number; admins: IntercomAdmin[] } | null = null;
const ADMINS_TTL_MS = 5 * 60 * 1000;

/**
 * GET /admins. Devuelve todos los teammates del workspace. Cacheado 5min.
 * Solo los admins con `has_inbox_seat: true` pueden enviar/recibir mensajes.
 */
export async function listAdmins(opts: { force?: boolean } = {}): Promise<
  IntercomAdmin[]
> {
  const now = Date.now();
  if (
    !opts.force &&
    adminsCache &&
    now - adminsCache.fetchedAt < ADMINS_TTL_MS
  ) {
    return adminsCache.admins;
  }

  const res = await intercomFetch<AdminListResponse>('/admins', {
    method: 'GET',
  });
  adminsCache = { fetchedAt: now, admins: res.admins };
  return res.admins;
}

// ==================== SEND DIRECT MESSAGE ====================

export interface SendDirectMessageInput {
  /** Intercom contact_id del destinatario. */
  contactId: string;
  /** Admin de Intercom que figura como remitente. */
  senderAdminId: string;
  /** Admin a quien se asigna la conversación tras crearse. Opcional. */
  assigneeAdminId?: string | null;
  /**
   * Asunto/título del mensaje. Intercom lo muestra como encabezado destacado
   * arriba del body. Opcional; si se omite, Intercom lo deriva del body.
   */
  subject?: string;
  /** Cuerpo del mensaje (HTML, Intercom lo soporta nativamente). */
  body: string;
  /**
   * URLs públicas de imágenes a adjuntar. Intercom las baja y las muestra en
   * el Messenger. Máximo 10 (límite de la API).
   */
  attachmentUrls?: string[];
  /** Clerk user id del admin de Monchis que dispara el envío (para log). */
  clerkUserId: string;
  /** Driver id en nuestra cache, si se conoce (para log). */
  driverId?: string | null;
  /** Metadata libre para auditoría (template usado, vars resueltas, etc.). */
  metadata?: Record<string, unknown>;
}

export interface SendDirectMessageResult {
  logId: string;
  /**
   * Id de la conversación. Presente si fue un reply a una conversación abierta;
   * null si fue un outbound (no genera conversación de inbox hasta respuesta).
   */
  conversationId: string | null;
  /** Cómo se entregó: 'reply' (en inbox) u 'outbound' (Messenger). */
  deliveryMethod: 'reply' | 'outbound' | null;
  status: 'sent';
}

interface IntercomConversation {
  type: 'user_message' | 'admin_message' | 'conversation';
  id: string;
  conversation_id?: string;
  // ...campos adicionales que no usamos
}

// ==================== CONVERSATION THREAD ====================

export type ConversationAuthorType = 'admin' | 'user' | 'lead' | 'bot';

export interface ConversationMessage {
  id: string;
  authorType: ConversationAuthorType;
  authorName: string | null;
  /** HTML del mensaje (Intercom lo devuelve con tags). Puede ser vacío si
   * el mensaje es solo imágenes. */
  body: string;
  createdAt: number; // epoch seconds
  attachmentUrls: string[];
}

export interface ConversationThread {
  conversationId: string;
  state: string | null; // 'open' | 'closed' | 'snoozed'
  messages: ConversationMessage[];
}

interface IntercomAttachment {
  type?: string;
  name?: string;
  url?: string;
  content_type?: string;
}

interface IntercomConversationPart {
  type: 'conversation_part';
  id: string;
  part_type: string; // 'comment' | 'assignment' | 'open' | 'close' | 'note' ...
  body?: string | null;
  created_at: number;
  author?: { type?: string; name?: string | null };
  attachments?: IntercomAttachment[];
}

interface IntercomConversationDetail {
  type: 'conversation';
  id: string;
  created_at: number;
  state?: string;
  source?: {
    body?: string | null;
    author?: { type?: string; name?: string | null };
    attachments?: IntercomAttachment[];
  };
  conversation_parts?: {
    conversation_parts: IntercomConversationPart[];
  };
}

function normalizeAuthorType(type?: string): ConversationAuthorType {
  if (type === 'admin') return 'admin';
  if (type === 'bot') return 'bot';
  if (type === 'lead') return 'lead';
  return 'user';
}

function extractAttachmentUrls(attachments?: IntercomAttachment[]): string[] {
  return (attachments ?? [])
    .map((a) => a.url)
    .filter((u): u is string => typeof u === 'string' && u.length > 0);
}

/**
 * Trae el hilo de UNA conversación específica (por conv_id) y lo normaliza como
 * lista de mensajes. Filtra los conversation_parts que no son mensajes reales
 * (assignments, opens, closes) — solo deja 'comment' y los que tengan
 * attachments. Devuelve null si la conversación no existe.
 */
export async function getConversationThread(
  conversationId: string,
): Promise<ConversationThread | null> {
  if (!conversationId) return null;

  let conv: IntercomConversationDetail;
  try {
    conv = await intercomFetch<IntercomConversationDetail>(
      `/conversations/${conversationId}?display_as=plaintext`,
      { method: 'GET' },
    );
  } catch (err) {
    if (err instanceof IntercomError && err.status === 404) return null;
    throw err;
  }

  const messages: ConversationMessage[] = [];

  // El primer mensaje vive en `source`.
  if (conv.source) {
    const sourceAttachments = extractAttachmentUrls(conv.source.attachments);
    if (conv.source.body || sourceAttachments.length > 0) {
      messages.push({
        id: `${conversationId}-source`,
        authorType: normalizeAuthorType(conv.source.author?.type),
        authorName: conv.source.author?.name ?? null,
        body: conv.source.body ?? '',
        createdAt: conv.created_at ?? 0,
        attachmentUrls: sourceAttachments,
      });
    }
  }

  // El resto vive en conversation_parts. Solo nos quedamos con 'comment'.
  for (const part of conv.conversation_parts?.conversation_parts ?? []) {
    if (part.part_type !== 'comment') continue;
    const attachmentUrls = extractAttachmentUrls(part.attachments);
    if (!part.body && attachmentUrls.length === 0) continue;
    messages.push({
      id: part.id,
      authorType: normalizeAuthorType(part.author?.type),
      authorName: part.author?.name ?? null,
      body: part.body ?? '',
      createdAt: part.created_at,
      attachmentUrls,
    });
  }

  return {
    conversationId,
    state: conv.state ?? null,
    messages,
  };
}

/**
 * Envía un mensaje 1-1 admin → user creando una conversación nueva.
 *
 * Usa POST /conversations en vez de POST /messages porque:
 *  - Permite asignar la conversación a otro admin (assignee).
 *  - Crea un thread real al que el driver puede responder.
 *  - Según Intercom, las admin-initiated conversations 1-1 NO consumen
 *    cupo outbound del plan (las campañas outbound sí).
 *
 * El log de auditoría se escribe SIEMPRE (tanto si Intercom acepta como si
 * falla). Si falla, lanza el error original tras escribir el log.
 */
function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Construye el body final que se manda a Intercom (outbound inapp):
 *  - subject → título en negrita al inicio. Lo embebemos en el body porque el
 *    campo `subject` de la API NO se renderiza en mensajes in-app (solo en
 *    emails/posts). Ver [[project_intercom_api_behavior]].
 *  - body → el HTML del editor.
 *  - imágenes → <img> al final. Intercom ignora `attachment_urls` en outbound
 *    pero renderiza <img> embebido.
 */
function buildFinalBody(
  subject: string | undefined,
  body: string,
  imageUrls: string[],
): string {
  const parts: string[] = [];
  if (subject) parts.push(`<b>${escapeHtmlText(subject)}</b>`);
  if (body) parts.push(body);
  if (imageUrls.length > 0) {
    parts.push(imageUrls.map((url) => `<img src="${url}">`).join('<br>'));
  }
  return parts.join('<br>');
}

export async function sendDirectMessage(
  input: SendDirectMessageInput,
): Promise<SendDirectMessageResult> {
  let messageSent = false;
  let conversationId: string | null = null;
  let deliveryMethod: 'reply' | 'outbound' | null = null;
  let assignmentOk: boolean | null = null;
  let errorMessage: string | null = null;
  let errorStatusCode: number | null = null;

  const attachmentUrls = (input.attachmentUrls ?? []).slice(0, 10);

  // El subject (título), el body y las imágenes se combinan en un solo HTML.
  // El subject va como <b> al inicio porque el campo `subject` de la API no se
  // ve en mensajes in-app. Las imágenes van como <img> embebido (attachment_urls
  // se ignora en outbound). Ver [[project_intercom_api_behavior]].
  const finalBody = buildFinalBody(
    input.subject?.trim() || undefined,
    input.body,
    attachmentUrls,
  );

  try {
    // Outbound in-app via POST /messages con create_conversation_without_contact_reply:
    // true. Ese flag hace que el mensaje del admin cree YA una conversación de
    // inbox y devuelva el conversation_id en el response (sin él, POST /messages
    // devuelve solo un message_id y la conversación no existe hasta que el driver
    // responde). El mensaje sigue siendo admin → user (el driver lo recibe).
    // Ver [[project_intercom_api_behavior]].
    const message = await intercomFetch<IntercomConversation>('/messages', {
      method: 'POST',
      body: JSON.stringify({
        message_type: 'inapp',
        body: finalBody,
        from: { type: 'admin', id: input.senderAdminId },
        to: { type: 'user', id: input.contactId },
        create_conversation_without_contact_reply: true,
      }),
    });
    messageSent = true;
    deliveryMethod = 'outbound';
    conversationId = message.conversation_id ?? null;

    // Asignar a otro admin, si se pidió y tenemos la conversación.
    if (input.assigneeAdminId && conversationId) {
      try {
        await intercomFetch(`/conversations/${conversationId}/parts`, {
          method: 'POST',
          body: JSON.stringify({
            message_type: 'assignment',
            type: 'admin',
            admin_id: input.senderAdminId,
            assignee_id: input.assigneeAdminId,
          }),
        });
        assignmentOk = true;
      } catch (assignErr) {
        assignmentOk = false;
        console.error(
          '[intercom] assignment failed (message was sent):',
          assignErr,
        );
      }
    }
  } catch (err) {
    if (err instanceof IntercomError) {
      errorMessage =
        typeof err.body === 'object' && err.body !== null
          ? JSON.stringify(err.body)
          : String(err.body ?? err.message);
      errorStatusCode = err.status;
    } else {
      errorMessage = err instanceof Error ? err.message : String(err);
    }
  }

  // 4) Escribir log siempre.
  const mergedMetadata: Record<string, unknown> = {
    ...(input.metadata ?? {}),
  };
  if (input.attachmentUrls && input.attachmentUrls.length > 0) {
    mergedMetadata.attachmentUrls = input.attachmentUrls;
  }
  if (input.subject?.trim()) {
    mergedMetadata.subject = input.subject.trim();
  }
  if (deliveryMethod) {
    mergedMetadata.deliveryMethod = deliveryMethod;
  }
  if (assignmentOk !== null) {
    mergedMetadata.assignmentOk = assignmentOk;
  }

  const log = await prisma.intercomMessageLog.create({
    data: {
      clerkUserId: input.clerkUserId,
      driverId: input.driverId ?? null,
      intercomContactId: input.contactId,
      intercomSenderAdminId: input.senderAdminId,
      intercomAssigneeAdminId: input.assigneeAdminId ?? null,
      intercomConversationId: conversationId,
      // Guardamos el body realmente enviado (con los <img> embebidos) para
      // auditoría fiel. Las URLs sueltas también van en metadata.
      body: finalBody,
      // El mensaje fue 'sent' si POST /messages no tiró error. La conv_id es
      // un dato accesorio (para asignar / linkear) que puede faltar sin que
      // eso signifique que el driver no recibió el mensaje.
      status: messageSent ? 'sent' : 'failed',
      errorMessage,
      errorStatusCode,
      metadata:
        Object.keys(mergedMetadata).length > 0
          ? (mergedMetadata as Prisma.InputJsonValue)
          : undefined,
    },
  });

  if (!messageSent) {
    throw new IntercomError(
      `Intercom send-direct-message failed (log #${log.id})`,
      errorStatusCode ?? 500,
      { errorMessage, logId: log.id },
    );
  }

  // Registrar la conversación en el índice (solo las que iniciamos nosotros).
  // Requiere el conversationId — si por algo no vino, no la registramos.
  // No bloqueamos el envío si esto falla.
  if (conversationId) {
    try {
      await upsertConversationIndex({
        conversationId,
        contactId: input.contactId,
        driverId: input.driverId ?? null,
        lastOutboundAt: new Date(),
        // Un mensaje saliente no marca unread (lo nuestro ya está leído).
        unread: false,
      });
    } catch (err) {
      console.error('[intercom] upsertConversationIndex (send) failed:', err);
    }
  }

  return {
    logId: log.id,
    conversationId,
    deliveryMethod,
    status: 'sent',
  };
}

// ==================== ÍNDICE DE CONVERSACIONES ====================

interface UpsertConversationParams {
  conversationId: string;
  contactId: string;
  driverId?: string | null;
  state?: string | null;
  unread?: boolean;
  lastOutboundAt?: Date;
  lastReplyAt?: Date;
}

/**
 * Crea o actualiza la fila del índice (una por CONVERSACIÓN, por conv_id).
 * Lo usan tanto el envío (sendDirectMessage) como el webhook. Resuelve el
 * driverId desde la cache si no se pasó. Solo registra conversaciones que
 * nosotros iniciamos (las que tienen conv_id).
 */
async function upsertConversationIndex(
  params: UpsertConversationParams,
): Promise<void> {
  let driverId = params.driverId ?? null;
  if (!driverId) {
    const driver = await prisma.monchisDriverCache.findFirst({
      where: { intercomContactId: params.contactId },
      select: { driverId: true },
    });
    driverId = driver?.driverId ?? null;
  }

  const lastMessageAt =
    params.lastReplyAt ?? params.lastOutboundAt ?? new Date();

  await prisma.intercomConversation.upsert({
    where: { intercomConversationId: params.conversationId },
    create: {
      intercomConversationId: params.conversationId,
      intercomContactId: params.contactId,
      driverId,
      state: params.state ?? null,
      unread: params.unread ?? false,
      lastOutboundAt: params.lastOutboundAt ?? null,
      lastReplyAt: params.lastReplyAt ?? null,
      lastMessageAt,
    },
    update: {
      ...(driverId ? { driverId } : {}),
      ...(params.state !== undefined ? { state: params.state } : {}),
      ...(params.unread !== undefined ? { unread: params.unread } : {}),
      ...(params.lastOutboundAt
        ? { lastOutboundAt: params.lastOutboundAt }
        : {}),
      ...(params.lastReplyAt ? { lastReplyAt: params.lastReplyAt } : {}),
      lastMessageAt,
    },
  });
}

export interface ConversationListItem {
  contactId: string;
  conversationId: string | null;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  state: string | null;
  unread: boolean;
  lastMessageAt: string | null;
  lastReplyAt: string | null;
  lastOutboundAt: string | null;
}

/**
 * Lista las conversaciones del índice para la vista, enriquecidas con nombre/
 * teléfono del driver. Ordenadas por actividad reciente.
 */
export async function listConversations(opts: {
  unreadOnly?: boolean;
  limit?: number;
} = {}): Promise<ConversationListItem[]> {
  const rows = await prisma.intercomConversation.findMany({
    where: opts.unreadOnly ? { unread: true } : undefined,
    orderBy: { lastMessageAt: 'desc' },
    take: opts.limit ?? 100,
  });

  const driverIds = rows
    .map((r) => r.driverId)
    .filter((d): d is string => !!d);
  const drivers = driverIds.length
    ? await prisma.monchisDriverCache.findMany({
        where: { driverId: { in: driverIds } },
        select: {
          driverId: true,
          fullName: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      })
    : [];
  const driverMap = new Map(drivers.map((d) => [d.driverId, d]));

  return rows.map((r) => {
    const d = r.driverId ? driverMap.get(r.driverId) : undefined;
    const name =
      d?.fullName ??
      ([d?.firstName, d?.lastName].filter(Boolean).join(' ').trim() || null);
    return {
      contactId: r.intercomContactId,
      conversationId: r.intercomConversationId,
      driverId: r.driverId,
      driverName: name,
      driverPhone: d?.phone ?? null,
      state: r.state,
      unread: r.unread,
      lastMessageAt: r.lastMessageAt?.toISOString() ?? null,
      lastReplyAt: r.lastReplyAt?.toISOString() ?? null,
      lastOutboundAt: r.lastOutboundAt?.toISOString() ?? null,
    };
  });
}

/** Marca una conversación específica como leída (al abrirla en la vista). */
export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  await prisma.intercomConversation.updateMany({
    where: { intercomConversationId: conversationId },
    data: { unread: false },
  });
}

// ==================== WEBHOOKS ====================

/**
 * Verifica la firma HMAC-SHA1 que Intercom manda en el header X-Hub-Signature
 * (formato "sha1=<hex>"), computada sobre el raw body con el Client Secret.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = process.env.INTERCOM_CLIENT_SECRET;
  if (!secret || !signature) return false;

  const expected =
    'sha1=' + createHmac('sha1', secret).update(rawBody, 'utf8').digest('hex');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface IntercomWebhookPayload {
  type?: string;
  id?: string; // id de la notificación (para dedup)
  topic?: string;
  data?: {
    item?: {
      id?: string; // conversation_id
      state?: string;
      contacts?: { contacts?: Array<{ id?: string }> };
    };
  };
}

/**
 * Procesa un webhook de Intercom: deduplica por event id, actualiza el índice
 * de conversaciones según el topic, y registra el evento para auditoría.
 *
 * Topics manejados:
 *  - conversation.user.replied  → unread = true (hay que responder)
 *  - conversation.admin.replied → unread = false (ya respondimos)
 *  - conversation.admin.closed/opened → actualiza state
 */
export async function handleWebhookEvent(
  payload: IntercomWebhookPayload,
): Promise<{ deduped: boolean; status: string }> {
  const eventId = payload.id;
  const topic = payload.topic ?? 'unknown';
  if (!eventId) return { deduped: false, status: 'ignored' };

  // Dedup: si ya lo procesamos, no repetir.
  const existing = await prisma.intercomWebhookEvent.findUnique({
    where: { intercomEventId: eventId },
    select: { id: true },
  });
  if (existing) return { deduped: true, status: 'duplicate' };

  let status = 'ignored';
  let errorMessage: string | null = null;

  try {
    const item = payload.data?.item;
    const conversationId = item?.id ?? null;
    const state = item?.state ?? null;

    // Solo actualizamos conversaciones que YA están en el índice (las que
    // iniciamos nosotros). Si el webhook es de una conversación que no
    // iniciamos, updateMany no toca nada (count 0) y queda 'ignored'.
    if (conversationId) {
      let data: Prisma.IntercomConversationUpdateManyMutationInput | null = null;
      switch (topic) {
        case 'conversation.user.replied':
          data = { unread: true, state, lastReplyAt: new Date(), lastMessageAt: new Date() };
          break;
        case 'conversation.admin.replied':
          data = { unread: false, state, lastMessageAt: new Date() };
          break;
        case 'conversation.admin.closed':
          data = { state: 'closed' };
          break;
        case 'conversation.admin.opened':
          data = { state: 'open' };
          break;
      }

      if (data) {
        const res = await prisma.intercomConversation.updateMany({
          where: { intercomConversationId: conversationId },
          data,
        });
        status = res.count > 0 ? 'processed' : 'ignored';
      }
    }
  } catch (err) {
    status = 'error';
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[intercom] handleWebhookEvent failed:', err);
  }

  // Auditoría + dedup. Si dos llegan en paralelo, el unique constraint protege.
  try {
    await prisma.intercomWebhookEvent.create({
      data: {
        intercomEventId: eventId,
        topic,
        payload: payload as unknown as Prisma.InputJsonValue,
        status,
        errorMessage,
        processedAt: new Date(),
      },
    });
  } catch {
    // Probable carrera con otro request del mismo evento — ya quedó registrado.
    return { deduped: true, status };
  }

  return { deduped: false, status };
}

// ==================== FASE 2 — PENDIENTE ====================
//
// TODO(fase-2): trackEvent(contactId, eventName, metadata)
//   POST /events. Útil para disparar campañas outbound configuradas desde la
//   UI de Intercom. Estas SÍ consumen cupo según el plan — usar con cuidado.
//
// TODO(fase-2): bulk send desde CSV
//   Parser + driver del flujo. El formato del CSV está a definir (driver.id
//   nuestro vs contact_id directo vs phone/email).
