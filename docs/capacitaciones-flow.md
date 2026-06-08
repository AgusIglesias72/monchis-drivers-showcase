# Asignación a capacitación automática (autoagendamiento estilo Calendly)

> Documentación end-to-end del flujo de reserva de capacitaciones de monchis-drivers.
> Audiencia: ingeniería + admins que operan el funnel.
> Refleja la arquitectura implementada y vigente.

---

## 1. Resumen ejecutivo

El sistema de capacitaciones es **self-service**: el propio postulante elige su horario de capacitación (modelo Calendly), sin que un admin lo agende a mano. El acceso está **gateado** por dos condiciones: (a) que el postulante sea **elegible** (sus documentos pasaron la revisión humana o del bot de IA) y (b) que tenga un **shareToken** vigente (credencial efímera que viaja en el link de WhatsApp post-aprobación). El sistema optimiza dos métricas clave: **% de aprobados que reservan** (conversión: que el aprobado efectivamente agende) y **% de reservados que asisten** (anti no-show: recordatorios y re-enganche para que el que reservó realmente vaya).

---

## 2. Modelo de datos

Archivo: `prisma/schema.prisma`.

| Modelo | Rol | Campos clave |
| --- | --- | --- |
| `OnboardingScheduleRule` | Plantilla recurrente (tipo Calendly *Event Type*). Define modalidad, ubicación, recurrencia y reglas de booking. Genera N eventos. | `slug`, `modality`, `frequency`/`daysOfWeek`/`startTime`/`durationMinutes`, `validFrom`/`validTo`, `maxCapacity`, `minNoticeHours`, `maxFutureDays`, `cancelDeadlineHours` (default 4), `isActive`/`isPublic` |
| `OnboardingEvent` | Instancia materializada de una rule (un slot concreto en el calendario). | `scheduledDate` (**ya ES el instante UTC real** del evento porque se calcula con `combineDateAndTimeInTZ(ymd, startTime, tz)`), `maxCapacity`/`currentCapacity`/`version` (OCC), `reminderHoursBefore` (default 24), `reminderScheduled` (default true), `reminderSent`/`reminderSentAt`, `status` |
| `OnboardingAttendee` | Junción `FormDriver` ↔ `OnboardingEvent` (la reserva). Unique `(eventId, formDriverId)`. | `status` (INVITED/CONFIRMED/SCHEDULED/ATTENDED/NO_SHOW/CANCELLED/RESCHEDULED), `confirmationToken` (token público de la reserva), `reminderSent`/`reminderSentAt`, `markedNoShowAt`/`markedNoShowBy`, `cancelled*`, `rescheduled*` |
| `OnboardingScheduleException` | Excepción puntual a una rule: feriado (CANCELLED) o cambio (OVERRIDE). Unique `(ruleId, date)`. | `type`, `override*` |
| `OnboardingLocation` | Ubicación física reusable (HUB Asunción, etc.). | `address`, `googleMapsUrl`, `isActive` |
| `PublicBookingSession` | **shareToken efímero** — credencial del flujo público sin Clerk. | `shareToken` (32 chars), `expiresAt` (**TTL 7 días**), `usedAt` (tracking, no invalida) |
| `FormDriver` | El postulante. Estado de su onboarding y control de mensajería. | `onboardingStatus`, `onboardingScheduledAt`, `messagesSentCount`/`noContactBefore` (backoff), `approvalNotifiedAt` (idempotencia del aviso de aprobación), `assistedCompletion` (postulación cargada por admin) |

> **Nota de timezone:** `scheduledDate` se guarda como UTC real al materializar. NO se le suma/resta tz en lectura. La hora local se deriva con `startTime` + `timezone` (`America/Asuncion`).

---

## 3. Flujo end-to-end

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  POSTULANTE                                                                    │
 │  completa el form de postulación                                              │
 └───────────────────────────────┬──────────────────────────────────────────────┘
                                  │
                                  ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  ADMIN o AGENTE IA aprueba documentos  →  documentsStatus = APPROVED          │
 │  document-approval.service.ts / api/postulaciones/documents/[id]/approve      │
 └───────────────────────────────┬──────────────────────────────────────────────┘
                                  │  (transición a APPROVED)
          ┌───────────────────────┼────────────────────────────┐
          ▼                       ▼                            ▼
 ┌─────────────────┐   ┌──────────────────────┐   ┌──────────────────────────────┐
 │ WhatsApp        │   │ Emisión shareToken    │   │ resetMessageFrequency()       │
 │ 'capacitaciones'│   │ getOrCreateActive-    │   │ (§8)                          │
 │ AUTOMÁTICO,     │   │ Session, TTL 7d       │   │ backoff vuelve a [0]=1 día    │
 │ idempotente vía │   │                       │   │                              │
 │ approvalNotifiedAt   └──────────────────────┘   └──────────────────────────────┘
 └────────┬────────┘
          │  link: /capacitaciones?session=<shareToken>
          ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  POSTULANTE entra a /capacitaciones (app/capacitaciones/page.tsx)             │
 │  - SSR resuelve identidad por cookie de portal (onboarding-identity.ts)       │
 │  - validateShareToken → eligibility check                                     │
 │  - ve grilla de rules/slots (components/capacitaciones/*) y elige uno         │
 └───────────────────────────────┬──────────────────────────────────────────────┘
                                  │  POST /api/public/booking
                                  ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  createBooking (onboarding-booking.service.ts)                                │
 │  - re-valida shareToken + eligibility + guarda anti doble-booking             │
 │  - OCC atómico: increment currentCapacity + version (retry hasta 3)           │
 │  - OnboardingAttendee status=SCHEDULED  (upsert por unique)                   │
 │  - FormDriver onboardingStatus=SCHEDULED, onboardingScheduledAt              │
 └───────────────────────────────┬──────────────────────────────────────────────┘
                                  │  best-effort (Promise.allSettled)
                                  ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  Confirmación: email + WhatsApp (onboarding-notifications.service)            │
 └───────────────────────────────┬──────────────────────────────────────────────┘
                                  │  cron horario send-session-reminders (§6)
                                  ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  Recordatorio pre-sesión  'capacitacion_reminder'                             │
 │  anclado a scheduledDate − reminderHoursBefore                               │
 └───────────────────────────────┬──────────────────────────────────────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
        ┌──────────────────┐          ┌────────────────────────────────────┐
        │ ASISTE → ATTENDED │          │ NO ASISTE → NO_SHOW                 │
        │ (check-in admin)  │          │ → re-enganche reengage-scheduling §7│
        └──────────────────┘          └────────────────────────────────────┘
```

**Archivos relevantes:**

| Archivo | Responsabilidad |
| --- | --- |
| `app/capacitaciones/page.tsx` | Landing pública del autoagendamiento (SSR + grilla de slots) |
| `components/capacitaciones/*` | UI: grilla de rules, calendario, dialog de confirmación, modal de identidad, banner |
| `app/api/public/booking/route.ts` | POST de reserva (rate-limit 10/h por shareToken) + notificaciones post-create |
| `lib/services/onboarding-booking.service.ts` | Lógica de booking, cancel y reschedule (OCC) |
| `lib/services/onboarding-eligibility.ts` | Regla única de elegibilidad |
| `lib/services/public-booking-session.service.ts` | Emisión/reuso de shareTokens (TTL 7d) |
| `lib/services/onboarding-identity.ts` | Resuelve identidad por cookie de portal en SSR |

---

## 4. Elegibilidad

Archivo: `lib/services/onboarding-eligibility.ts` — `checkEligibility()`. Fuente única usada por booking, identidad y el modal de confirmación.

**Bloqueos duros (se evalúan primero):**

- `status === REJECTED` → nunca elegible.
- Falta `firstName` o `lastName` → bloqueado (rompe el form de confirmación).

**Reglas OR (alcanza con cumplir UNA):**

1. `assistedCompletion === true` (un admin cargó la postulación a mano → habilitada).
2. `status ∈ {APPROVED, READY_ONBOARDING, ONBOARDING, ACTIVE}` (pasó revisión humana).
3. `documentsStatus === APPROVED` (bot IA o admin aprobó todos los docs).
4. Fallback: documentos `CEDULA` **y** `CRIMINAL_RECORD` individualmente en estado `APPROVED`.

Si no cumple ninguna: `reason = "Aún tenemos pasos por revisar de tu postulación"`.

---

## 5. Booking, cancelación y reschedule

Archivo: `lib/services/onboarding-booking.service.ts`.

### Booking (`createBooking`)

- **OCC con retry** (`MAX_OCC_RETRIES = 3`): `updateMany` con guard `version = X` + `currentCapacity < maxCapacity`, haciendo `increment currentCapacity` + `increment version`. Si otra reserva ganó la carrera (`count !== 1`), relee y reintenta; si se llenó, `EventFullError`.
- **Guarda anti doble-booking:** rechaza si el `FormDriver` ya tiene un attendee activo en un evento futuro. La guarda **excluye `CANCELLED` y `NO_SHOW`** → un no-show puede volver a reservar.
- **Identidad inmutable:** desde el portal público solo se pueden corregir **nombre y email**. `cedula` y `phoneNumber` son inmutables (cambiarlos permitiría suplantación / colisión en DB); cualquier intento se loguea y se ignora.
- Al confirmar: `OnboardingAttendee` upsert a `SCHEDULED` + `confirmationToken` nuevo, `PublicBookingSession.usedAt`, y `FormDriver.onboardingStatus = SCHEDULED` con `onboardingScheduledAt`.

### Deadline de cancelación/reschedule

`cancelDeadlineHours` (de la rule, default **4**). Se calcula `scheduledDate − cancelDeadlineHours`. Pasado ese instante, `canCancel = canReschedule = false` y las acciones tiran `CancelDeadlinePassedError`.

### Cancel (`cancelBooking`)

Transacción: attendee → `CANCELLED` (con `cancelledBy='self'`), `currentCapacity` decrement + version bump (libera cupo), y **`FormDriver.onboardingStatus = READY`** + `onboardingScheduledAt = null` + reset de backoff (`messagesSentCount=0`, `noContactBefore=null`).

> **Por qué READY y no CANCELLED:** dejar `CANCELLED` sacaba al postulante del re-enganche (el cron solo contacta `null/NOT_READY/READY`) → cancelar era un callejón sin salida. Ahora vuelve al bucket "Pendiente de Agendar" y el cron `reengage-scheduling` lo invita a reagendar.

La ruta `app/api/public/booking/[token]/cancel/route.ts` además manda un WhatsApp de cancelación best-effort (`sendBookingCancellationWhatsApp`) invitando a reagendar, y registra el envío (`recordMessageSent`) para que el cron no duplique el mismo día.

### Reschedule (`rescheduleBooking`)

- Adquiere el slot destino con el mismo OCC que booking.
- En transacción: **cancela el attendee viejo** (status `CANCELLED`, `cancelledReason='reschedule'`, libera cupo del evento viejo) y **crea/upsertea el nuevo** en el evento destino (`rescheduledFrom`, `confirmationToken` nuevo). Actualiza `FormDriver` al nuevo `scheduledDate`.
- La ruta `app/api/public/booking/[token]/reschedule/route.ts` manda **confirmación de la nueva reserva** (email + WhatsApp, `isReschedule: true`) con la nueva fecha y el nuevo link de gestión. Sin esto el postulante reagendaba a ciegas y el link viejo quedaba muerto.

---

## 6. Mensajería automática (crons)

### Backoff exponencial compartido

Archivo: `lib/services/messaging-frequency.service.ts`.
`BACKOFF_DAYS = [1, 3, 7, 30, 60, 90]`, indexado por `messagesSentCount`. Tras el mensaje N se espera `BACKOFF_DAYS[N]` días (clamp al último = 90). Cada envío llama `recordMessageSent()` (incrementa count + setea `noContactBefore`). `resetMessageFrequency()` vuelve count a 0 y limpia `noContactBefore`.

### Reparto de crons (sin solaparse)

Cada cron es dueño de una etapa distinta del funnel; comparten el backoff (`noContactBefore`) así que **nadie recibe dos mensajes dentro de la misma ventana**.

```
Form a medias ────────────► remind-abandoned     (form_incomplete)
Docs / pago pendiente ────► send-daily-reminders  (documents_pending)
Pendiente de Agendar ─────► reengage-scheduling   (capacitaciones)
No Asistieron ────────────► reengage-scheduling   (capacitacion_no_show)
Reservó, sesión próxima ──► send-session-reminders (capacitacion_reminder)
```

| Cron | Schedule (`vercel.json`) | A quién / qué manda | Anti-duplicado | Tope |
| --- | --- | --- | --- | --- |
| `/api/cron/remind-abandoned` | `*/20 12-19 * * *` | Form a medias (`status=IN_PROGRESS`, 24h-30d) → `form_incomplete` | backoff | 5/run |
| `/api/cron/send-daily-reminders` | `0 10 * * *` (7 AM PYT) | Funnel post-form con docs **no** aprobados o pago pendiente → `documents_pending` | backoff | 20/run |
| `/api/cron/reengage-scheduling` | `*/30 12-22 * * *` (9-19 PYT) | **Pendiente de Agendar** → `capacitaciones`; **No Asistieron** → `capacitacion_no_show` | backoff | 5 c/segmento |
| `/api/cron/send-session-reminders` | `15 * * * *` (horario) | Reservados con sesión próxima → `capacitacion_reminder` | `attendee.reminderSent` | 40/run |
| `/api/cron/materialize-onboarding-events` | `0 5 * * *` (~01:00 PY) | Genera `OnboardingEvent` desde las rules (no manda mensajes) | idempotente | — |

### El resolver del cron diario (`resolveMessageConceptFromData`)

Archivo: `lib/services/messaging-frequency.service.ts`. Orden de decisión:

1. `IN_PROGRESS` → mensaje por step (en la práctica lo cubre `remind-abandoned`; el daily excluye `IN_PROGRESS`).
2. Reserva activa → `null` (lo cubre `send-session-reminders`).
3. **Bypass de "postulación aprobada":** si `hasCoreDocsApproved()` (cédula + antecedentes con un doc `APPROVED` = verde/azul) → **NO** manda `documents_pending` aunque el `documentsStatus` agregado siga `PENDING`/`IN_REVIEW` (caso azul = tributario pendiente). Antes esto mandaba "te faltan documentos" a gente ya lista para agendar.
4. Pago pendiente → `documents_pending` (sigue siendo un paso real).
5. Agendamiento → `null`: **lo maneja `reengage-scheduling`**, no este cron.

### Cron de reenganche al agendamiento (`reengage-scheduling`)

Archivo: `app/api/cron/reengage-scheduling/route.ts` + `lib/services/reengagement.service.ts`. Cada 30 min en horario laboral, dos segmentos alineados con los **filtros rápidos del admin** (`app/admin/postulaciones/page.tsx`):

- **Pendiente de Agendar** (`getPendingScheduleDrivers`): form `COMPLETED` + `hasCoreDocsApproved` (verde/azul) + `onboardingStatus ∈ {null, NOT_READY, READY}` + **sin reserva activa ni no-show** → `capacitaciones`.
- **No Asistieron** (`getNoShowReengageDrivers`): tiene attendance `NO_SHOW` + no volvió a reservar + `onboardingStatus != COMPLETED` → `capacitacion_no_show`.

Respeta backoff (`recordMessageSent` por envío), pausas anti-ban (`REENGAGE_DELAY_MS`, default 8s) y topes por segmento (`REENGAGE_PENDING_LIMIT` / `REENGAGE_NOSHOW_LIMIT`, default 5).

### Recordatorio de sesión (`send-session-reminders`)

- Envía `capacitacion_reminder` **anclado a `scheduledDate − reminderHoursBefore`** (no a horario fijo).
- **Idempotente** vía `OnboardingAttendee.reminderSent`.
- Apunta a attendees **activos** de eventos `SCHEDULED` futuros con `reminderScheduled = true`.
- Es **transaccional, NO marketing**: ignora el backoff (un recordatorio de algo ya reservado siempre debe salir).

Catálogo de keys: `lib/constants/whatsapp-template-keys.ts` (incluye `capacitacion_no_show`). Contenido: `prisma/seed-templates.ts`.

---

## 7. No-show y recuperación

Punto de entrada admin: `lib/actions/onboarding.actions.ts` → `markAttendeeNoShow` → `onboardingService.markNoShow` (`lib/services/onboarding.service.ts`).

**Comportamiento de `markNoShow`:**

1. Setea `OnboardingAttendee.status = NO_SHOW` + `markedNoShowAt` + `markedNoShowBy`.
2. Setea `FormDriver.onboardingStatus = NO_SHOW` y `onboardingScheduledAt = null` → queda en el bucket **"No Asistieron"** del admin (y NO en "Pendiente de Agendar").
3. **Resetea el backoff** (`messagesSentCount = 0`, `noContactBefore = null`) → re-enganche pronto.
4. La action manda best-effort el template **`capacitacion_no_show`** ("no viniste, reagendá") + `recordMessageSent` (fija el backoff para que el cron no duplique).

**Re-enganche:**

- El cron **`reengage-scheduling`** detecta a los no-show (vía la attendance `NO_SHOW`, ver §6) y los re-invita a reagendar cada 30 min en horario laboral.
- El banner `recentNoShow` del portal (`lib/services/portal-postulacion.service.ts`, ventana **90 días**): si no hay reserva activa pero la última attendance terminó en NO_SHOW, muestra banner + CTA.
- Un no-show **SÍ puede volver a reservar**: la guarda anti doble-booking de `createBooking` excluye `NO_SHOW`; al reservar, `onboardingStatus` vuelve a `SCHEDULED`.

---

## 8. Conversión: reset de backoff al aprobar

**Problema:** un postulante recién aprobado podía arrastrar `messagesSentCount` alto de etapas previas (form incompleto, docs pendientes), de modo que el primer nudge `SCHEDULE_CAPACITACION` caía a 30-90 días — matando la conversión.

**Solución:** se llama `resetMessageFrequency()` al transicionar a `documentsStatus = APPROVED`, en:

- `lib/services/document-approval.service.ts`
- `app/api/postulaciones/documents/[id]/approve/route.ts`

Así el nudge de agendar capacitación cae a `BACKOFF_DAYS[0] = 1 día`, capturando al aprobado mientras aún está caliente.

---

## 9. Vista admin

| Ruta / archivo | Qué muestra |
| --- | --- |
| `app/admin/onboarding` (`page.tsx`) | Dashboard con tabs **Reglas** + **Eventos** |
| `app/admin/onboarding/reglas` | ABM de `OnboardingScheduleRule` |
| `app/admin/onboarding/[id]` | Detalle de un evento: datos + lista de asistentes + **check-in / no-show** |
| `app/api/admin/onboarding/rules` | API de rules |
| `app/api/admin/onboarding/events` | API de eventos |
| `app/api/admin/onboarding/attendees` | API de asistentes |
| `app/api/admin/onboarding/locations` | API de ubicaciones |
| `app/api/admin/onboarding/actions` | Acciones admin |
| `app/api/onboarding/actions/dashboard` | KPIs del dashboard (incluye conteo de no-shows recientes) |

---

## 10. Backlog / fase 2

- **Waitlist / sobrecupo controlado (NO implementado):** hoy cuando alguien hace no-show o cancela, el cupo se libera pero **no hay lista de espera ni backfill**. Un cupo de no-show puede quedar desperdiciado si nadie lo retoma. Fase 2: permitir overbooking controlado o cola que ocupe automáticamente cupos liberados.

### Pendientes menores detectados (no implementados)

- **Rechazo manual de documentos solo notifica antecedentes:** el rechazo manual de cédula/licencia no manda WhatsApp; el validador IA sí notifica todos los tipos.
- **Off-by-one de fecha en confirmación:** `formatEventDate` (`onboarding-notifications.service.ts`) usa `slice(0,10)` del instante UTC → eventos ≥21:00 PYT muestran el día siguiente.
- **`resetMessageFrequency` no se llama al completar el form:** el nudge de documentos puede atrasarse si arrastra backoff de la etapa de form a medias.
- **Código muerto:** `lib/services/portal-whatsapp.service.ts` (5 funciones sin callers, legacy del portal-token).
