# Agente IA — Resumen e iteraciones pendientes

> Última actualización: sesión cerrada 2026-04-27
> Estado: agente operativo en modo de propuestas (DRY_RUN persiste, REAL persiste como PROPOSED). Falta el último paso: ejecución real de las propuestas.

## Cómo retomar

Lee primero este doc y después estos archivos en orden:

1. `lib/services/agent.service.ts` — el cerebro (pipeline determinista + 4 overrides)
2. `lib/services/agent-vision.service.ts` — wrapper de Haiku Vision (1 llamada con todas las imágenes)
3. `components/admin/postulaciones/run-agent-button.tsx` — entrada manual del usuario
4. `app/api/cron/process-completed-postulations/route.ts` — auto-trigger cada 10 min

---

## Lo que está implementado

### Track A — Validación RUC (turuc.com.py)

| Pieza | Ubicación |
|---|---|
| Schema | `prisma/schema.prisma` — campos `ruc*` en `FormDriver` (status, name, dv, isLegalEntity, isPublicEntity, lastCheckedAt, apiRawResponse) + waiver (`rucInactiveWaived*`) |
| Servicio | `lib/services/turuc.service.ts` — `checkRucStatus`, `refreshRucForDriver`, `refreshRucForDriverAsync`, `isForeignCedula`, `normalizeCedula`. Retry con backoff exponencial ante 429 |
| Config | `lib/config/turuc.config.ts` |
| Backfill | `scripts/ruc-backfill.ts` — corrió sobre ~6900 drivers. Distribución: 17% ACTIVO, 61% NO_ENCONTRADO, 12% SUSPENSION, 8% CANCELADO |
| Auto-fetch | Disparado desde `/api/form/complete` con `refreshRucForDriverAsync` (fire-and-forget) |
| Endpoints admin | `/api/admin/postulaciones/[id]/refresh-ruc`, `/api/admin/postulaciones/[id]/waive-ruc-inactive` |
| UI tabla | Tercer ícono en columna ESTADOS, color por estado RUC |
| UI filtro | Multi-select con popover + checkboxes (CSV en URL) |
| UI detalle | Botón "Marcar RUC Inactivo" en sección Certificado Tributario, botón "Actualizar RUC" en dropdown |
| Helper badges | `lib/utils/postulacion-ruc-badge.utils.ts` |

**Estados RUC soportados** (string libre, no enum): `NOT_CHECKED`, `ACTIVO`, `INACTIVO`, `CANCELADO`, `SUSPENSION TEMPORAL`, `BLOQUEADO`, `NO_ENCONTRADO`, `ERROR`, `NOT_APPLICABLE` (extranjeros).

### Track B — Agente IA con Haiku 4.5 Vision

**Modelos Prisma** (`AgentRun` + `AgentAction` + enums `AgentRunStatus`, `AgentRunMode`, `AgentRunDecision`, `AgentActionStatus`, `AgentFeedback`).

**Pipeline determinista** (`agent.service.ts`):
1. Consulta/refresca RUC (usa cache si <7 días)
2. Una sola llamada a Haiku con todas las imágenes (cédula frente, dorso opcional, antecedentes)
3. Aplica 4 overrides defensivos (ver abajo)
4. Decide con if/else: APPROVED / NEEDS_REVIEW / REJECTED

**7 tools que el agente puede proponer**:
- `propose_approve_document` — aprobar doc
- `propose_reject_document` — rechazar doc
- `propose_waive_ruc_inactive` — marcar RUC Inactivo como excepción
- `propose_send_whatsapp_template` — disparar template (ej. `capacitaciones`)
- `propose_request_document_resubmission` — pedir re-subida con mensaje WhatsApp pre-armado
- `propose_update_driver_cedula` — corregir typo de cédula del form (con re-fetch RUC)
- `escalate_to_admin` — escalado genérico

**4 overrides defensivos** (en orden de aplicación):
| Override | Qué hace | Por qué |
|---|---|---|
| `applyCedulaMatchOverride` | Si modelo dice REJECT o MANUAL_REVIEW por nombre pero cédula coincide → APPROVE | Forms con typos/aliases ("Hugo Pereira" vs "HUGO JAVIER PEREIRA FERREIRA"). Cédula es la verdad |
| `applyExpiryOverride` | REJECT con concern de vencimiento → MANUAL_REVIEW | Vencido no es fraude — es renovable. Lleva al branch de resubmission |
| `detectCedulaTypo` | Docs consistentes con diff ≤2 chars del form → `propose_update_driver_cedula` | Postulante tipea mal la cédula (ej. 5 vs 6) |
| `classifyConcern` | Clasifica concerns en 5 categorías para elegir mensaje | INTERNAL_ERROR / EXPIRED / WRONG_SIDE / QUALITY / OTHER |

**Endpoints**:
- `POST /api/admin/postulaciones/[id]/run-agent` — disparo manual (DRY_RUN o REAL)
- `POST /api/admin/agent-runs/[id]/feedback` — feedback humano (MATCHES / DOES_NOT_MATCH / PARTIAL + nota)
- `GET /api/cron/process-completed-postulations` — cron auto-trigger cada 10 min, modo REAL, mira COMPLETED hace 5-60 min sin AgentRun

**UI**:
- Botón "Correr agente (simulación)" en dropdown de tabla y detalle
- Ícono de bot 🤖 al lado del nombre (color por decisión, click → drawer)
- Drawer con: decisión, resumen, acciones propuestas (con labels en español), razonamiento (markdown bold), métricas, sección de feedback
- `/admin/agent-runs` — listado paginado con accuracy stats, filtros, columna feedback
- Componente reusable `AgentFeedbackSection` con 3 botones color-coded

**Costo medido** (Haiku 4.5, 1 llamada con 3 imágenes):
- ~$0.0065 USD por corrida promedio
- ~6000 input tokens + ~500 output tokens
- Con 50 postulaciones/día → ~$10/mes

**Distribución típica** sobre 20 aleatorios (último benchmark):
- APPROVED: ~55%
- NEEDS_REVIEW: ~20%
- REJECTED: ~25% (mayoría legítimos: RUC CANCELADO, docs de otra persona)

### Decisiones de diseño relevantes (no obvias del código)

1. **Cédula es la verdad sobre el nombre** — el prompt de Haiku tiene esto explícito. Si la cédula del doc coincide con la del form, es la misma persona aunque el nombre tenga typos/aliases.
2. **Postulantes extranjeros** (cédula con letras tipo "M371660" cubano) — `rucStatus = NOT_APPLICABLE`, no se llama a turuc, el prompt acepta documentos de identidad NO paraguayos. Flujo de regularización fiscal va por otro canal.
3. **Vigencia antecedentes 90 días corridos** — hardcodeado en el prompt. Si está vencido → MANUAL_REVIEW (no REJECT).
4. **`CEDULA_BACK` es opcional** — si no se sube, no penaliza. Si se sube, se valida como bonus.
5. **Tipo `CEDULA` (legacy) tratado como `CEDULA_FRONT`** — el form actual etiqueta así. Aceptamos ambos.
6. **`RUC NO_ENCONTRADO` no es bloqueante** — es el caso normal (60% del backfill). Si los docs están OK → APPROVED con aviso al postulante de que si quiere facturar necesita registrar RUC.
7. **`SUSPENSION TEMPORAL` / `INACTIVO`** — requiere decisión admin. Se proponen DOS acciones simultáneas: `propose_waive_ruc_inactive` (1 click) o `propose_request_document_resubmission` con mensaje de regularización.
8. **`CANCELADO` / `BLOQUEADO`** → REJECTED bloqueante.
9. **Modo DRY_RUN persiste acciones igual** — antes no, lo cambié para que los runs históricos muestren las propuestas correctamente. La diferencia con REAL es semántica (DRY_RUN nunca se ejecuta).
10. **Filosofía draft + aprobación humana** — el agente nunca ejecuta sólo. Toda acción queda como `PROPOSED`. El admin aprueba.

---

## Lo que falta — en orden de prioridad sugerida

### 1. Ejecutor de acciones (endpoint + UI) — el último eslabón

Las propuestas hoy quedan visibles en el drawer pero no son accionables. Falta:

**Backend**:
- `POST /api/admin/agent-actions/[id]/execute` — toma una `AgentAction` con status `PROPOSED`, la dispara según el `tool`, marca como `EXECUTED` (o `FAILED` si rompe).
- Handler por tipo de tool:
  - `propose_send_whatsapp_template` → `sendFlowByKey(driver, templateKey, ...)`
  - `propose_request_document_resubmission` → **decisión pendiente** (ver abajo)
  - `propose_approve_document` → update FormDocument
  - `propose_reject_document` → update FormDocument + opcional flow de notificación
  - `propose_waive_ruc_inactive` → reutilizar handler existente
  - `propose_update_driver_cedula` → update FormDriver.cedula + `refreshRucForDriver` + opcional re-correr agente
  - `escalate_to_admin` → no-op (queda como log)

**UI**:
- Botón "Ejecutar" al lado de cada acción en el drawer
- Botón "Aprobar todo" en el header del drawer
- Estados visuales: PROPOSED / EXECUTING / EXECUTED / FAILED

### 2. Decisión: `propose_request_document_resubmission` con ManyChat

El agente genera **texto custom** por caso (ej. "tu certificado vencido hace 264 días"). ManyChat dispara **flows pre-armados con flowId**, no texto libre. Hay que decidir:

**Opción A — Flows fijos** (recomendada para arrancar): crear 4-5 flows en ManyChat:
- `req_cedula_frente` — pedir foto de cédula frente
- `req_antecedentes_renovar` — antecedente vencido
- `req_doc_calidad` — imagen no se ve bien
- `req_doc_wrong_side` — subió dorso en vez de frente
- `req_doc_typo` — corregir cédula del form

**Opción B — Flow genérico con custom field**: 1 flow con variable `mensaje` que el agente popula. Más flexible pero requiere cablear ManyChat para usar custom fields como cuerpo. Meta puede ser estricta con templates aprobados.

### 3. Fase 2 del feedback loop — auto-mejora del prompt

Cron semanal (domingo noche) que:
1. Toma `AgentRun.humanFeedback = DOES_NOT_MATCH` de la última semana
2. Pasa a Opus 4.7 (no Haiku — para esto sí vale la pena el modelo más caro): system prompt actual + casos donde el admin discrepó + notas
3. Opus genera reporte en Markdown: *"el agente falla en casos tipo X, sugerencia: cambiar Y"*
4. Reporte se guarda en DB (modelo nuevo `AgentReport`?) o se manda al admin por WhatsApp

El admin lee el reporte y decide si aplicar cambios al prompt manualmente. **No hay auto-aplicación al prompt** — humano en el loop.

Requisito: tener ≥20 corridas con feedback humano marcado para que el reporte sea útil.

### 4. Refinamientos del pipeline (nice-to-haves)

**Pattern A — "Archivo equivocado"** (detectado en benchmark, 2/20 casos):
Cuando UNA imagen tiene cédula de otra persona pero la OTRA imagen coincide con el form, el postulante se confundió subiendo archivos, no es fraude. Hoy → REJECTED. Podría → NEEDS_REVIEW con resubmission específica:
> *"Hola, parece que subiste la foto equivocada del frente de la cédula. Por favor subí la tuya."*

**Pattern B — Typo grande cuando nombre coincide exactamente** (detectado, 1/20):
Caso: cédula form 5385895, docs 5860730, **nombre coincide al 100%**. Diff de 4 chars, supera mi threshold de 2. Si el nombre matchea en TODAS las palabras y ambos docs son consistentes, podría ampliar threshold a ≤4. **Cuidado**: con diff 5 puede empezar a ser sospechoso.

### 5. Otras ideas mencionadas pero no abordadas

- **OCR híbrido con MRZ reader** (cédula dorso) — solo justifica el esfuerzo si pasamos a 500+ postulaciones/día. Hoy a $10/mes con Haiku no se paga el día de trabajo extra.
- **Few-shot dinámico**: incluir 3-5 ejemplos del feedback acumulado en el prompt de cada corrida. Solo tiene sentido cuando haya ≥50 casos con feedback.
- **Fine-tuning** en Bedrock — overkill para este volumen.

---

## Anexo: archivos críticos por feature

```
agent.service.ts                 → cerebro: pipeline + decisión
agent-vision.service.ts          → wrapper Haiku Vision (PDFs incluidos)
agent-action-labels.ts           → labels en español por tool (UI-friendly)
agent-feedback-section.tsx       → componente reusable de feedback
agent-run-detail-sheet.tsx       → drawer histórico (en /admin/agent-runs)
agent-run-badge.tsx              → ícono de bot al lado del nombre + drawer
run-agent-button.tsx             → botón "Correr agente (simulación)" + drawer
reasoning-text.tsx               → parser de **bold** en razonamiento

turuc.service.ts                 → API SET + isForeignCedula + normalizeCedula
ruc-backfill.ts                  → script one-off (concurrency 3, delay 2s)
ruc-status-multi-select.tsx      → filtro popover en /admin/postulaciones
postulacion-ruc-badge.utils.ts   → color por estado RUC

process-completed-postulations/  → cron auto-trigger cada 10 min
[id]/run-agent/                  → endpoint manual (DRY_RUN o REAL)
[id]/feedback/                   → endpoint feedback
[id]/refresh-ruc/                → endpoint manual refresh RUC
[id]/waive-ruc-inactive/         → toggle waiver
```

## Variables de entorno requeridas

- `ANTHROPIC_API_KEY` — Haiku 4.5 (cuenta del user, ya configurada)
- `TURUC_API_URL` — opcional, default `https://turuc.com.py/api`
- `TURUC_TIMEOUT_MS` — opcional, default 10000
- `CRON_SECRET` — para autenticar el cron (debería estar ya, lo usan otros crons)
- `MANYCHAT_API_KEY` + flowIds en `WhatsAppTemplate.manychatFlowId` — para que `sendFlowByKey` funcione

## Última distribución medida (20 aleatorios)

| Decisión | % | Notas |
|---|---|---|
| APPROVED | 55% | Happy path: docs OK + RUC ACTIVO/NO_ENCONTRADO/NOT_APPLICABLE |
| NEEDS_REVIEW | 20% | Vencimientos, calidad media, soft-issues RUC |
| REJECTED | 25% | RUC CANCELADO, docs de otra persona, fraude potencial |

Promedio de costo: **$0.0065 USD/corrida** ≈ $10/mes a 50 postulaciones/día.
