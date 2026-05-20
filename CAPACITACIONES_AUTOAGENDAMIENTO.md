# Autoagendamiento de Capacitaciones — referencia para WhatsApp Automático

Briefing para el chat que gestiona el bot de WhatsApp. Describe cómo un postulante
aprobado se auto-agenda a una capacitación desde la web, qué mandarle, y cuándo puede hacerlo.

> Estado (2026-05-20): el flujo está implementado y probado E2E en dev. Antes de avisar
> a postulantes reales, ver **Prerequisitos operativos** al final.

---

## Qué es

Reemplazo de Calendly por un sistema inhouse. El postulante entra a una página pública,
elige fecha en un calendario y reserva su lugar — sin llamadas ni intervención de admin.

- **URL pública:** `https://<dominio>/capacitaciones`
- La página es 100% pública (suma SEO/captación). El **gating es solo al reservar**.

---

## Cómo se identifica el postulante (3 caminos)

Para reservar, el sistema tiene que reconocer al driver. Hay 3 formas, de más simple a más automática:

1. **Manual (la más robusta — recomendada para el mensaje masivo):**
   El driver entra a `/capacitaciones`, toca una fecha → "Reservar" → se abre un modal
   **"Identificate"** que pide:
   - **Cédula**
   - **Últimos 4 dígitos del teléfono** que usó al postularse

   No hay OTP ni link que expire. Funciona siempre que la cédula + teléfono coincidan con su postulación.

2. **Deep link pre-identificado (opcional, sin fricción):**
   `https://<dominio>/capacitaciones?session=<shareToken>`
   Si el link trae un `shareToken` válido, el driver entra ya identificado (sin modal).
   Cómo obtener el `shareToken` para un driver: `POST /api/public/auth/from-portal-token`
   con `{ accessToken }` (el mismo token del portal `/postulacion/[token]`) → devuelve `{ shareToken }`.

3. **Vía portal:** mandar el link del portal `/postulacion/[token]`; ahí hay un botón
   "Reservar mi capacitación" que genera el shareToken y redirige a `/capacitaciones?session=...`.

> Para el bot, lo más simple y a prueba de balas es el **camino 1**: mandar `/capacitaciones`
> y explicar que se identifiquen con cédula + últimos 4 del teléfono.

---

## Cuándo un postulante PUEDE agendar (elegibilidad)

El gate deja reservar **solo** si el postulante cumple UNA de estas (lógica en `checkEligibility`):

- `status` ∈ { `APPROVED`, `READY_ONBOARDING`, `ONBOARDING`, `ACTIVE` }, **o**
- `documentsStatus === APPROVED`, **o**
- tiene los documentos **CÉDULA** y **ANTECEDENTES (CRIMINAL_RECORD)** individualmente aprobados.

Además: necesita **nombre y apellido** cargados, y **no** estar `REJECTED`.

⚠️ **Importante para el bot:** solo avisar a postulantes que cumplan lo de arriba.
Si mandás a alguien que vos considerás "ok" pero su `status`/`documentsStatus` no cumple,
entra pero lo bloquea con *"Aún tenemos pasos por revisar de tu postulación"*.

---

## Mensaje sugerido para el bot

> ¡Buenas {nombre}! 🎉 Tu postulación ya está aprobada. Ahora elegí el día de tu
> capacitación así arrancás a repartir con Monchis 🛵
>
> 👉 Entrá a: {dominio}/capacitaciones
> Para reservar, identificate con tu **cédula** y los **últimos 4 dígitos del teléfono**
> que usaste al postularte.
>
> Cualquier duda respondé este mensaje 🙌

(Si usás deep link pre-identificado: reemplazar la URL por `{dominio}/capacitaciones?session={shareToken}`
y omitir la línea de identificación.)

---

## Qué pasa después de reservar

- El driver ve la pantalla **"¡Listo! Tu lugar está reservado"** con fecha, horario, lugar,
  botón **Agregar a Google Calendar** y **Descargar .ics**, y qué llevar.
- Se envía confirmación por **email + WhatsApp** (ver sección Notificaciones).
- En el panel admin, ese driver aparece como **participante** del evento con badge **"Usuario"**
  (se anotó solo; si lo hubiera asignado un admin, mostraría el nombre del admin).
- El driver queda con `onboardingStatus = SCHEDULED` y el cupo del evento se incrementa.

### Gestión por el propio driver (sin límite, sin cooldown)
Desde la pantalla de su reserva (`/capacitaciones/reserva/[token]`):
- **Cambiar fecha** (reagendar)
- **Cancelar reserva** (libera el cupo)

---

## Notificaciones — decisión: EMAIL + WhatsApp (doble canal)

> **Decisión de producto (2026-05-20):** confirmación y recordatorio se mandan por
> **email Y WhatsApp**. La audiencia es WhatsApp-first (se identifican por teléfono), así que
> WhatsApp es el canal principal; el email queda como respaldo. **Esto es lo que el chat de
> WhatsApp Automático tiene que implementar / considerar.**

### Estado actual
- **Email**: ya funciona (`sendBookingConfirmation` en `POST /api/public/booking`, best-effort, requiere RESEND).
- **WhatsApp**: ⚠️ **falta implementar** tanto la confirmación como el recordatorio.

### 1) Confirmación al reservar (WhatsApp — a implementar)
- **Trigger**: dentro de `POST /api/public/booking`, en el mismo bloque best-effort donde hoy
  se manda el email. Llamar al bot (`WHATSAPP_BOT_URL` `/send-message` con `X-API-Key`).
- **Datos disponibles ahí**: `formDriver.phoneNumber`, `firstName`, evento (`scheduledDate`,
  `startTime`, `endTime`, `location`, `locationAddress`), `confirmationToken` (para el link de gestión).
- **Contenido sugerido del mensaje:**
  > ✅ {nombre}, ¡tu capacitación quedó reservada!
  > 📅 {día} {fecha} · {horaInicio}–{horaFin}
  > 📍 {lugar} — {dirección}
  > 🎒 Llevá: cédula y licencia de conducir.
  > Para cambiar o cancelar: {dominio}/capacitaciones/reserva/{confirmationToken}
- Best-effort: si el envío WhatsApp falla, **no** debe romper la reserva (igual que el email).

### 2) Recordatorio antes del evento (WhatsApp — verificar/implementar)
- Sale del cron `send-daily-reminders`. ⚠️ Confirmar que ese cron mande por **WhatsApp**
  (hoy puede estar solo en email). Sugerido: recordatorio 24 h antes con fecha, hora, lugar y
  el link de gestión por si necesita reagendar/cancelar.

### Notas de canal
- El link de gestión (`/capacitaciones/reserva/{confirmationToken}`) es **clave por WhatsApp**:
  es la única forma de que el driver vuelva a su reserva para cambiar/cancelar sin re-identificarse.
- Idempotencia: evitar mandar duplicados si el booking se reintenta (la reserva usa upsert).

---

## Prerequisitos operativos (antes de avisar a postulantes reales)

1. **Deploy:** el redesign + fixes recientes están sin commitear/deployar. La página vieja
   existe en prod, pero lo nuevo no está live aún.
2. **Capacitaciones publicadas en prod:** tiene que haber al menos una regla
   `isActive: true` + `isPublic: true` con **slots futuros**. Los slots los pre-crea el cron
   `materialize-onboarding-events` (8 semanas adelante). Sin reglas activas → empty state.
3. **Elegibilidad alineada:** confirmar que los postulantes "ok" realmente cumplen `checkEligibility`.
4. **RESEND configurado en prod** para que llegue el email de confirmación.
5. **Datos de eventos sanos:** en dev aparecieron 2 eventos con `startTime` divergente del rule
   (el slot mostraba 10:00 pero bookeaba 15:00). Revisar que en prod no haya eventos editados a
   mano con hora distinta a la de su regla.

**Recomendación:** hacer una reserva de prueba real en prod (1 postulante aprobado o un registro
de prueba) antes del anuncio masivo.

---

## Endpoints útiles (referencia técnica)

| Acción | Endpoint |
|---|---|
| Identificar (cédula + últimos 4 tel) | `POST /api/public/auth/identify` |
| shareToken desde token de portal | `POST /api/public/auth/from-portal-token` `{ accessToken }` |
| Listar capacitaciones públicas | `GET /api/public/capacitaciones` |
| Slots por rango | `GET /api/public/capacitaciones/slots?from=YYYY-MM-DD&to=YYYY-MM-DD` |
| Crear reserva | `POST /api/public/booking` |
| Cancelar / reagendar | `POST /api/public/booking/[token]/cancel` · `/reschedule` |
| Descargar .ics | `GET /api/public/booking/[token]/ics` |
