# Consolidación de recolección y seguimiento de órdenes

> Estado: **IMPLEMENTADO** en rama `feat/consolidacion-ordenes` (2026-05-29).
> Defaults tomados: captura cada 1 min · lane rápido cap 200 · vista nueva en
> ruta `admin/ordenes` ("Órdenes en vivo"). Ver §0 para pasos de deploy.

## 0. Estado de implementación y pasos de deploy

**Archivos nuevos**
- `lib/config/live-capture.config.ts` — umbrales (ventana 2h, cap 200, lag alert, retención, reintento not_found).
- `app/api/cron/collect-live-orders/route.ts` — captura autónoma (cada min) + alerta Slack en caída + poda horaria.
- `app/api/cron/refresh-recent-orders/route.ts` — lane rápido (cada 2 min).
- `lib/services/live-capture-health.service.ts` — salud/cobertura para la vista.
- `app/admin/gestion/ordenes/page.tsx` + `components/admin/gestion/ordenes-content.tsx` — vista operativa.

**Archivos modificados**
- `lib/services/live-panel.service.ts` — extraído `collectLiveData()`; nuevo `captureLiveOrders()`.
- `lib/services/pedidos-import-queue.service.ts` — nuevo `refreshRecentNonTerminalOrders()` (+ reintento not_found).
- `prisma/schema.prisma` — modelo `LiveCaptureRun`.
- `vercel.json` — +2 crons; processor bajado a `*/2`.
- `components/admin/app-sidebar.tsx` — entrada "Órdenes en vivo".

**Para desplegar (en orden):**
1. `pnpm prisma db push` (o `npm run db:push`) **contra la DB** para crear la tabla `live_capture_run`. ⚠️ Ya corrí `prisma generate` (codegen local); el `db push` toca la DB y lo dejo para vos.
2. Verificar env: `MONCHIS_DRIVERS_API_TOKEN`, `CRON_SECRET`, `SLACK_WEBHOOK_URL` (para la alerta de caída), `DATABASE_URL`.
3. Deploy a Vercel. Los crons nuevos quedan activos por `vercel.json`.
4. Validar en preview/prod (la API está bloqueada en red local): disparar `GET /api/cron/collect-live-orders` con `Authorization: Bearer $CRON_SECRET` y revisar logs + filas en `live_capture_run` + la solapa "Salud de captura" en `/admin/gestion/ordenes`.

**Verificado localmente:** `tsc --noEmit` 0 errores · `eslint` 0 warnings · `db push` aplicado (tabla `live_capture_run` creada) · queries validadas contra la DB real. No se corrió `next build` (preferencia del usuario).

### Revisión contra datos reales — hallazgos y correcciones

Al validar contra la DB de producción aparecieron bugs (uno mío, dos pre-existentes) que se corrigieron:

1. **`confirmedAt` está ~3h atrasado en cache** (el endpoint del pedido devuelve PY local mal etiquetado como `Z`; `saveToCache` no aplica `pyLocalIsoToRealIso`). Mi lane rápido keyeaba la ventana de "recientes" en `confirmedAt` → encontraba **0** pedidos siempre. **Fix:** anclar fast lane y slow sweep en `capturedAt` (now() real al insertar). Validado: ahora encuentra los recientes correctamente. *Nota:* el `confirmedAt` mostrado en la UI se corrige aparte con `parseOrderInstant`, así que la columna se ve bien; el bug era solo en las comparaciones temporales.
2. **Estados terminales mal escritos (pre-existente).** La API devuelve `CANCELED` (una L) y `CANCELED_BY_CLIENT`, pero el config tenía `CANCELLED` (dos L) → nunca matcheaba. Efecto: ~933 cancelados tratados como no-terminales (re-consultados eternamente, nunca cacheados) y el filtro "Cancelados" de Pedidos devolvía 0. **Fix:** `terminalStates` y el filtro de `searchOrders` ahora incluyen `CANCELED`/`CANCELED_BY_CLIENT` (+ `CANCELLED` por robustez).
3. **Estado `ASSIGNED` faltaba** en `IN_PROGRESS_STATES` y en el mapa de la vista → no aparecía como "en curso". **Fix:** agregado en ambos.

**Observaciones operativas (no bloqueantes):**
- Backlog de cola: ~23.6k `pending` (el más viejo de hace un mes) y ~16k `failed` (502/timeouts de Mongo de la API, transitorios). El processor a `*/2` drena 2.5× más rápido; el lane rápido NO depende de este backlog (refresca directo). Conviene un `retryFailedQueueItems()` puntual post-deploy y monitorear el drain.
- Tras el fix de terminales, ~268 órdenes quedan no-terminal (266 capturadas >2h: "trabadas" que en realidad ya terminaron pero nunca se refrescaron). El slow sweep + la captura continua las llevará a terminal en los próximos ciclos; el conteo de "En curso" arrancará alto (~265) y bajará solo al volumen real.

---

> Plan original (diseño). Fecha: 2026-05-29.

## 1. Contexto: qué ya existe (no rehacer)

El pipeline "recolectar IDs en tiempo real → guardarlos como órdenes → verlos en admin → cron que actualiza los no-terminales" **ya está construido y corriendo**. Inventario:

| Pieza | Archivo | Comportamiento |
|---|---|---|
| Fetch live server-side | `lib/services/live-panel.service.ts` → `fetchLivePanel({enqueue})` | Llama en paralelo a los 4 endpoints de `api.monchis-drivers.com` (`pending_requests`, `delayed_requests`, `drivers_status`, `zones_status`). **Las llamadas y el enqueue corren en el servidor.** |
| Endpoint de polling | `app/api/admin/gestion/live/route.ts` | `requireAdminApi` → `fetchLivePanel()` (con `enqueue:true` por default). Lo dispara el cliente cada 15s. |
| Captura de IDs | `lib/services/pedidos-import-queue.service.ts` → `enqueueOrderImports()` | `collectAllRequestIds(pending, delayed, drivers)` → `createMany({skipDuplicates})` en `MonchisOrderImportQueue`. |
| Drenaje de cola + detalle | `app/api/cron/process-pedidos-import-queue/route.ts` (cada 5 min) → `processOrderImportQueueBatch()` | Toma ≤200 pendientes, `getOrderByRequestId()` (fetch a `request_histories`), upsert a `MonchisOrderCache`. Paralelismo 5. Marca `done`/`not_found`/`failed`. |
| Refresh de no-terminales | `app/api/cron/refresh-non-terminal-orders/route.ts` (cada 5 min, offset) → `enqueueNonTerminalOrdersForRefresh()` | Re-encola pedidos cacheados NO `FINALIZED`/`CANCELLED` **con >2h de antigüedad**. |
| Vista admin | `app/admin/gestion/pedidos/` (`searchOrders()`) | Tabla desde `MonchisOrderCache` con filtros (estado, señales, rango fechas), KPIs, detalle por pedido, import masivo. |
| Cache de detalle | `MonchisOrderCache` | `status`, `confirmedAt`, `finalizedAt`, `rawData`, KPIs precomputados (`acceptanceSeconds`, `endToEndSeconds`, `hasAdminChange`, `offersWithDriverCount`), `capturedAt`, `refreshedAt`. Estados terminales se sirven de cache para siempre. |

**Estados terminales** (`lib/config/pedidos.config.ts`): `FINALIZED`, `CANCELLED`.
**Formato requestId**: Mongo ObjectId, regex `/^[a-f0-9]{24}$/i`.

## 2. Grietas a cerrar (el trabajo real)

### Grieta 1 — La captura depende de que un humano mire el panel LIVE 🔴
El enqueue de IDs **solo corre cuando** alguien tiene `/admin/gestion/live` abierto, con la pestaña visible (el polling se pausa en `visibilitychange` y en pausa manual). No existe ningún cron que capture de forma autónoma. De noche / fines de semana / cuando nadie mira → **cero captura**. Un pedido que nace y muere dentro de una ventana sin observador no queda registrado.

**Decisión tomada:** hacer consultas server-side al panel live de forma autónoma e ir tomando las órdenes nuevas que aparecen → **nuevo cron dedicado de captura**.

### Grieta 2 — Zona muerta de 2h en la frescura del estado 🟡
`REFRESH_MIN_AGE_MS = 2h` (`pedidos-import-queue.service.ts:202`): los no-terminales solo se refrescan cuando tienen >2h. Un pedido capturado en `PENDING`/`DELIVERY` muestra ese estado *stale* en admin hasta 2h.

**Decisión tomada:** **lane rápido** para no-terminales recientes (<2h), refrescados cada pocos minutos, manteniendo el lane existente de >2h como barrido de "trabados".

### Alcance adicional aprobado
- **Observabilidad de captura** (métricas, health, alertas).
- **Vista nueva `admin/ordenes`** (operativa / ciclo de vida), distinta de la analítica de `pedidos`.

---

## 3. Arquitectura propuesta

```
                 ┌─────────────────────────────────────────────┐
                 │   api.monchis-drivers.com (4 endpoints)      │
                 └─────────────────────────────────────────────┘
                    ▲                ▲                    ▲
   (cada 1 min)     │   (cada 15s    │   (detalle)        │ (refresh directo)
                    │    si abierto) │                    │
┌──────────────────┴──┐  ┌──────────┴────────┐  ┌─────────┴──────────────┐
│ CRON collect-live   │  │ Panel LIVE (UI)   │  │ CRON refresh-recent     │ ← NUEVO (lane rápido)
│ -orders (NUEVO)     │  │ enqueue:true      │  │ -orders                 │   refresca <2h directo
│ enqueue IDs +       │  │ (redundante,      │  └─────────┬───────────────┘
│ snapshot cobertura  │  │  idempotente)     │            │
└─────────┬───────────┘  └─────────┬─────────┘            │
          │                        │                      │
          ▼                        ▼                      ▼
    ┌────────────────────────────────────┐      ┌──────────────────────┐
    │   MonchisOrderImportQueue          │      │  MonchisOrderCache    │
    │   (pending → done/not_found/fail)  │─────▶│  (estado, KPIs, raw)  │
    └────────────────────────────────────┘      └──────────┬───────────┘
          ▲ drena cada 2 min                                │
   ┌──────┴──────────────────┐   ┌──────────────────────────┴─────┐
   │ CRON process-pedidos-   │   │ CRON refresh-non-terminal      │
   │ import-queue            │   │ -orders (existente, >2h)       │
   └─────────────────────────┘   └────────────────────────────────┘
                                            │
                                            ▼
                          ┌──────────────────────────────────────┐
                          │  /admin/gestion/pedidos  (analítica)  │
                          │  /admin/gestion/ordenes  (operativa)  │ ← NUEVO
                          │  + LiveCaptureRun (health/cobertura)  │ ← NUEVO
                          └──────────────────────────────────────┘
```

Una sola fuente de escritura de IDs **suficiente y confiable** (el cron). El panel queda como redundancia idempotente (`skipDuplicates`), no se rompe nada al dejarlo.

---

## 4. Componentes detallados

### Componente A — Cron de captura autónoma `collect-live-orders`

**Objetivo:** capturar IDs server-side cada minuto, corra o no alguien el panel, y dejar un snapshot de cobertura para observabilidad.

**Archivos:**
- `app/api/cron/collect-live-orders/route.ts` (NUEVO)
- `lib/services/live-panel.service.ts` → agregar `captureLiveOrders()` (NUEVO export)

**`captureLiveOrders()` — diseño:**
- Fetch en paralelo de `pending_requests`, `delayed_requests`, `drivers_status` **y** `zones_status` (los 4; zones es barato y lo necesitamos para cobertura). Reusar el `fetchJson` y normalizadores existentes — **no duplicar lógica de fetch**; refactor: extraer la parte de "fetch + normalize" de `fetchLivePanel` a un helper interno que ambos consuman.
- `collectAllRequestIds(pending, delayed, drivers)` → `enqueueOrderImports(ids)`.
- Calcular cobertura: `idsVistos = ids.length` vs `zones.reduce((s,z)=>s+z.totalRequest,0)` (o `active+pending`) como referencia esperada.
- Persistir un `LiveCaptureRun` (ver §5) con: `fetchedAt`, `pendingCount`, `delayedCount`, `activeCount`, `idsSeen`, `idsNewEnqueued`, `zonesTotalRequest`, `errors` (JSON), `durationMs`.
- Devolver stats para el log del cron.

**Route handler:**
- `requireCronAuth(request)`.
- `export const maxDuration = 30`.
- Log: `✅ [CRON] collect-live-orders seen=X new=Y errors=Z (Wms)`.

**Schedule (`vercel.json`):** `"* * * * *"` (cada minuto). Justificación: los estados `PENDING`/`ACCEPTED`/`DELIVERY` viven minutos; 1 min minimiza la pérdida de órdenes de vida corta. Si se prefiere menos carga: `"*/2 * * * *"` (documentar el trade-off de posible pérdida de órdenes ultra-cortas).

**Sobre el enqueue del panel:** se mantiene `enqueue:true` en `app/api/admin/gestion/live/route.ts`. Es idempotente (`skipDuplicates`) y sirve como captura extra de alta frecuencia (15s) cuando alguien mira. No es necesario tocarlo.

### Componente B — Lane rápido de refresh para no-terminales recientes

**Objetivo:** que el estado de los pedidos en curso (<2h) en admin esté fresco (cada ~2 min), cerrando la zona muerta.

**Decisión de mecanismo:** **refresh directo** (no re-encolar) para tener control de latencia. El lane rápido llama `getOrderByRequestId(id, {forceRefresh:true})` directo, con cap y paralelismo, igual que el processor. El re-encolado se reserva para el barrido lento de >2h (que ya existe).

**Archivos:**
- `app/api/cron/refresh-recent-orders/route.ts` (NUEVO)
- `lib/services/pedidos-import-queue.service.ts` → `refreshRecentNonTerminalOrders()` (NUEVO)

**`refreshRecentNonTerminalOrders()` — diseño:**
- Query `MonchisOrderCache`: `status` ∈ no-terminal (o null) **Y** (`confirmedAt >= now-2h` **OR** (`confirmedAt is null` AND `capturedAt >= now-2h`)).
- Orden: `confirmedAt asc` (los más viejos del rango primero, para que ninguno se quede sin refrescar).
- Cap configurable (`RECENT_REFRESH_MAX`, default p.ej. 200). Si hay más que el cap → **loguear cuántos quedaron fuera** (no truncar en silencio).
- Paralelismo 5 (reusar patrón `PROCESS_PARALLEL`). Por cada uno: `getOrderByRequestId(id, {forceRefresh:true})` con manejo de `PedidoLookupError` (no romper el batch).
- Devolver `{scanned, refreshed, terminalNow, failed, dropped, durationMs}`.

**Route handler:** `requireCronAuth`, `maxDuration = 60`.

**Schedule:** `"*/2 * * * *"` (offset respecto a otros, p.ej. `"1-59/2 * * * *"` para no chocar).

**Coherencia de la primera lectura:** para que un ID recién capturado tenga su primer detalle rápido, bajar `process-pedidos-import-queue` de `*/5` a **`*/2`**. Así: captura (≤1 min) → primer detalle (≤2 min) → lane rápido lo mantiene fresco (cada 2 min) hasta terminal o hasta cruzar las 2h (ahí pasa al barrido lento existente).

**Robustez `not_found`:** hoy un ID visto en live pero aún no consultable en `request_histories` (carrera temporal) queda `not_found` y nunca se reintenta (el refresh solo resetea filas que ya están en cache). Agregar: en `process`/refresh, reintentar `not_found` cuyo `enqueuedAt` sea reciente (<30 min) un número limitado de veces antes de darlo por perdido.

### Componente C — Observabilidad de captura

**Objetivo:** confiar en que no se pierde nada y detectar si la captura se cae.

**Datos:** tabla `LiveCaptureRun` (§5), poblada por el cron A. Más `getOrderImportQueueStats()` (ya existe).

**Métricas a exponer:**
- Última corrida de captura exitosa (`fetchedAt` más reciente) → **lag de captura** (now − último). Si > umbral (p.ej. 5 min) = alerta.
- Tendencia de `idsNewEnqueued` por corrida (¿está capturando algo?).
- **Cobertura**: `idsSeen` vs `zonesTotalRequest` por corrida — gap sostenido = posible pérdida.
- Estado de la cola: `pending`, `done`, `failed`, `not_found`, `oldestPendingAt` (lag de procesamiento), `lastProcessedAt`.
- Errores por endpoint (del campo `errors` de la corrida).

**Alertas (Slack — ya hay integración en el proyecto):**
- Si el cron de captura no corrió/no tuvo éxito en > X min.
- Si todos los endpoints fallan en una corrida (token vencido, API caída).
- Si `failed` en la cola supera un umbral.
- (Reusar el patrón de Slack de `snapshot-turnos` para no inventar infra nueva.)

**UI:** una sección/solapa "Salud de captura" dentro de la vista nueva de órdenes (Componente D), o como tarjetas en el header. Reusar componentes existentes (tarjetas de stats de `pedidos`).

### Componente D — Vista `admin/ordenes` (operativa)

**Objetivo:** vista operativa centrada en el **ciclo de vida** (qué hay en curso ahora, recién capturado, con estado fresco), distinta de la analítica histórica de `pedidos`.

> ⚠️ **Decisión abierta de naming** (ver §10): "ordenes" y "pedidos" son sinónimos y puede confundir. Recomendación: framear como **"Órdenes en vivo / Operación"** vs **"Pedidos / Análisis"**, o evaluar hacerla una **solapa dentro de `pedidos`** en lugar de ruta nueva. Confirmar antes de implementar.

**Archivos:**
- `app/admin/gestion/ordenes/page.tsx` (NUEVO) — server component, `force-dynamic`.
- `components/admin/gestion/ordenes-content.tsx` (NUEVO) — reusa tabla/filtros de pedidos.

**Reuso (NO duplicar):**
- Servicio: reusar `searchOrders()` con default `status=in_progress`, `sortBy=confirmedAt desc`.
- Componentes de tabla, pills de estado, date picker: reusar los de `pedidos-home-content.tsx`. Si hace falta, extraer a componentes compartidos.

**Layout propuesto (respetando guías de UI del proyecto):**
- Header flat con tarjetas de stats: en curso ahora, capturadas hoy, lag de captura, lag de cola.
- Solapas: **En curso** (no-terminales) / **Todas** / **Salud de captura** (Componente C).
- Filtro de fechas: replicar el patrón de `gestion/pedidos` (popover + presets, `inferGroupBy`).
- **Guías de UI a respetar** (de memoria del proyecto):
  - No reasignar tokens `--primary/--accent/--ring` de shadcn al rojo de marca; usar `--brand` explícito.
  - Que no parezca "hecho con IA": reusar patrones existentes (solapas, pills, date picker, header flat); evitar chips/iconos/comentarios decorativos.

---

## 5. Cambios de modelo de datos (Prisma)

Agregar a `prisma/schema.prisma`:

```prisma
model LiveCaptureRun {
  id                Int      @id @default(autoincrement())
  fetchedAt         DateTime @default(now())
  pendingCount      Int      @default(0)
  delayedCount      Int      @default(0)
  activeCount       Int      @default(0)
  idsSeen           Int      @default(0)   // distinct requestIds vistos
  idsNewEnqueued    Int      @default(0)   // inserted en la cola esta corrida
  zonesTotalRequest Int      @default(0)   // referencia de cobertura
  errors            Json?                  // [{source, message}]
  durationMs        Int      @default(0)

  @@index([fetchedAt])
  @@map("live_capture_run")
}
```

- Retención: agregar pruning (p.ej. borrar >30 días) dentro del cron de captura o un cron diario, siguiendo el patrón de `TURNOS_SNAPSHOT.retentionDays`.
- **No** se requieren columnas nuevas en `MonchisOrderCache` (ya tiene `capturedAt`, `confirmedAt`, `status`, `refreshedAt`).
- Migración: `prisma migrate` (en deploy). **No correr `next build` localmente** (preferencia del usuario).

---

## 6. Cambios en `vercel.json`

```jsonc
// AGREGAR:
{ "path": "/api/cron/collect-live-orders",   "schedule": "* * * * *"     },
{ "path": "/api/cron/refresh-recent-orders", "schedule": "1-59/2 * * * *" },

// MODIFICAR:
// process-pedidos-import-queue: "*/5 * * * *"  →  "*/2 * * * *"
```

`refresh-non-terminal-orders` (barrido >2h) se mantiene en `4-59/5 * * * *`.

**Verificar el plan de Vercel:** crons al minuto requieren Pro+. Si hay límite de cantidad de crons, considerar consolidar capture+refresh-recent en un solo route que haga ambas cosas secuencialmente.

---

## 7. Config y variables de entorno

- No se requieren env vars nuevas: se reusa `MONCHIS_DRIVERS_API_TOKEN`, `CRON_SECRET`, `DATABASE_URL`.
- Agregar constantes a config (no hardcodear):
  - `RECENT_REFRESH_MAX` (cap del lane rápido).
  - `RECENT_WINDOW_MS = 2h` (ventana del lane rápido; debe coincidir con `REFRESH_MIN_AGE_MS` para que no haya hueco ni solape entre lanes).
  - `CAPTURE_LAG_ALERT_MS`, umbral de alerta de cobertura.
  - `LIVE_CAPTURE_RETENTION_DAYS`.

---

## 8. Edge cases y consideraciones

- **Idempotencia captura:** `enqueueOrderImports` usa `createMany({skipDuplicates})`; un ID ya visto no se re-toca. Un pedido activo re-visto cada minuto **no** se re-encola — eso es correcto: el refresh (no la captura) mantiene su estado. ✅
- **`not_found` por carrera:** ver Componente B (reintento limitado de `not_found` recientes).
- **Doble fuente (cron + panel):** sin conflicto por `skipDuplicates`. ✅
- **Rate limit / costo API:**
  - Captura: ~1440 corridas/día × 4 endpoints agregados = liviano.
  - Lane rápido: cap × cada 2 min; loguear overflow. Estimar volumen real de no-terminales <2h antes de fijar el cap.
  - Processor a `*/2` ≈ 720 corridas/día, batch 200, paralelo 5.
- **Testing en dev:** `api.monchis-drivers.com` está **bloqueada en la red local del usuario** (403 Web Filter). Las pruebas reales de captura/refresh deben hacerse en **Vercel preview/prod**, no localmente. Diseñar los crons para poder dispararse manualmente con el `CRON_SECRET` y verificar vía logs + `LiveCaptureRun`.
- **`maxDuration`:** mantener cada cron por debajo del límite; el lane rápido con cap + paralelismo 5 debe caber en 60s.
- **Zona horaria:** los timestamps de la API vienen PY-mislabeled como `Z` en algunos campos; ya hay utilidades (`pyLocalIsoToRealIso`, `parseApiDate`). Reusarlas, no reinventar.

---

## 9. Plan de implementación por fases (para `/goal`)

**Fase 1 — Captura autónoma (cierra Grieta 1, máxima prioridad)**
1. Refactor `live-panel.service.ts`: extraer "fetch+normalize" a helper compartido; agregar `captureLiveOrders()`.
2. Modelo `LiveCaptureRun` + migración.
3. `app/api/cron/collect-live-orders/route.ts`.
4. `vercel.json`: agregar cron de captura.
5. Verificar en preview: corre cada minuto, encola, persiste `LiveCaptureRun`.

**Fase 2 — Frescura (cierra Grieta 2)**
6. `refreshRecentNonTerminalOrders()` + constantes de config.
7. `app/api/cron/refresh-recent-orders/route.ts`.
8. `vercel.json`: agregar refresh-recent + bajar processor a `*/2`.
9. Reintento de `not_found` recientes.

**Fase 3 — Observabilidad**
10. Cálculo de cobertura/lag desde `LiveCaptureRun` + `getOrderImportQueueStats`.
11. Alertas Slack (patrón `snapshot-turnos`).
12. Pruning de `LiveCaptureRun`.

**Fase 4 — Vista `admin/ordenes`**
13. (Primero: resolver naming, §10.)
14. `ordenes/page.tsx` + `ordenes-content.tsx` reusando `searchOrders`/componentes de `pedidos`.
15. Solapa "Salud de captura".

Fases 1–2 son el corazón (captura confiable + estado fresco). 3–4 son valor agregado.

---

## 10. Decisiones abiertas (confirmar antes/durante implementación)

1. **Frecuencia de captura:** `* * * * *` (cada min, menos pérdida) vs `*/2` (menos carga). Recomendado: cada minuto.
2. **Naming de la vista nueva:** ruta `admin/ordenes` separada vs solapa dentro de `admin/pedidos`. "Órdenes" y "pedidos" son sinónimos → riesgo de confusión. Recomendado: framear claramente o usar solapa.
3. **Cap del lane rápido** (`RECENT_REFRESH_MAX`): fijar tras medir el volumen real de no-terminales <2h en producción.
4. **Límite de crons del plan Vercel:** si aplica, fusionar capture + refresh-recent en un route.

---

## 11. Riesgos

- **Costo de API externa** si el volumen de no-terminales <2h es alto y el cap es generoso → medir primero.
- **Imposibilidad de testear en local** (red bloqueada) → todo el ciclo de validación es en preview/prod; presupuestar tiempo de iteración por deploy.
- **Pérdida de órdenes ultra-cortas** (nacen y mueren en <1 min) incluso con captura cada minuto → aceptable; documentar como límite conocido. Si fuera crítico, evaluar bajar a sub-minuto (no soportado por Vercel cron; requeriría otro mecanismo).
