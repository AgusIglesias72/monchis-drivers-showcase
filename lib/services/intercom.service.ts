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
  /** Cuerpo del mensaje (HTML, Intercom lo soporta nativamente). */
  body: string;
  /** Clerk user id del admin de Monchis que dispara el envío (para log). */
  clerkUserId: string;
  /** Driver id en nuestra cache, si se conoce (para log). */
  driverId?: string | null;
  /** Metadata libre para auditoría (template usado, vars resueltas, etc.). */
  metadata?: Record<string, unknown>;
}

export interface SendDirectMessageResult {
  logId: string;
  conversationId: string;
  status: 'sent';
}

interface IntercomConversation {
  type: 'user_message' | 'admin_message' | 'conversation';
  id: string;
  conversation_id?: string;
  // ...campos adicionales que no usamos
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
export async function sendDirectMessage(
  input: SendDirectMessageInput,
): Promise<SendDirectMessageResult> {
  let conversationId: string | null = null;
  let errorMessage: string | null = null;
  let errorStatusCode: number | null = null;

  try {
    // 1) Crear la conversación admin → user.
    //
    // Endpoint: POST /messages con message_type: "inapp", from.type "admin",
    // to.type "user". Intercom devuelve el id de la conversación creada.
    //
    // Nota: el endpoint /conversations también funciona pero /messages es el
    // que Intercom documenta para iniciar conversaciones desde un admin.
    // Ref: https://developers.intercom.com/intercom-api-reference/reference/create-a-message
    const message = await intercomFetch<IntercomConversation>('/messages', {
      method: 'POST',
      body: JSON.stringify({
        message_type: 'inapp',
        body: input.body,
        from: { type: 'admin', id: input.senderAdminId },
        to: { type: 'user', id: input.contactId },
      }),
    });

    conversationId = message.conversation_id ?? message.id ?? null;

    // 2) Si se pidió asignar, hacerlo via parts.
    // El admin que asigna y el assignee pueden ser distintos.
    if (input.assigneeAdminId && conversationId) {
      try {
        await intercomFetch(
          `/conversations/${conversationId}/parts`,
          {
            method: 'POST',
            body: JSON.stringify({
              message_type: 'assignment',
              type: 'admin',
              admin_id: input.senderAdminId,
              assignee_id: input.assigneeAdminId,
            }),
          },
        );
      } catch (assignErr) {
        // El mensaje ya se mandó. La asignación fallida la logueamos pero no
        // tiramos error completo: el envío fue exitoso.
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

  // 3) Escribir log siempre.
  const log = await prisma.intercomMessageLog.create({
    data: {
      clerkUserId: input.clerkUserId,
      driverId: input.driverId ?? null,
      intercomContactId: input.contactId,
      intercomSenderAdminId: input.senderAdminId,
      intercomAssigneeAdminId: input.assigneeAdminId ?? null,
      intercomConversationId: conversationId,
      body: input.body,
      status: conversationId ? 'sent' : 'failed',
      errorMessage,
      errorStatusCode,
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : undefined,
    },
  });

  if (!conversationId) {
    throw new IntercomError(
      `Intercom send-direct-message failed (log #${log.id})`,
      errorStatusCode ?? 500,
      { errorMessage, logId: log.id },
    );
  }

  return {
    logId: log.id,
    conversationId,
    status: 'sent',
  };
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
