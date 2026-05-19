// app/api/admin/agent-config/route.ts
//
// GET → devuelve el override activo + el contenido del prompt y reglas del código.
// PUT → actualiza el singleton (auth Clerk requerida).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth'

import {
  getActiveOverride,
  updateActiveOverride,
} from '@/lib/services/agent-config.service'
import { SYSTEM_PROMPT, HAIKU_MODEL, DEFAULT_TARGET_RAW_BYTES } from '@/lib/services/agent-vision.service'
import {
  DEFAULT_MAX_CEDULA_IMAGES,
  DEFAULT_RUC_REFRESH_MAX_AGE_DAYS,
} from '@/lib/services/agent.service'

export const dynamic = 'force-dynamic'

// Documentación del pipeline determinístico (refleja agent.service.ts:runDeterministicPipeline)
// Read-only en la UI: si cambia el código, hay que actualizar este texto.
const PIPELINE_DESCRIPTION = `## Pipeline determinístico (Sprint 2)

El agente sigue estos pasos en orden, sin loop ni decisiones del LLM. El LLM solo
analiza imágenes; toda la lógica de decisión es código.

### 1. Guard — cédula vacía
Si la cédula del postulante está vacía → escala a admin (no se puede validar nada).

### 2. RUC (SET Paraguay)
- Si la cédula contiene letras → postulante extranjero, no aplica RUC.
- Si no hay dato de RUC o tiene más de N días (configurable), consulta turuc.com.py.
- Estados: ACTIVO / NO_ENCONTRADO / SUSPENSION TEMPORAL / INACTIVO / CANCELADO / BLOQUEADO / NOT_APPLICABLE / ERROR.

### 3. Análisis visual (Haiku Vision)
Una sola llamada con todas las imágenes (cédulas + antecedentes). El modelo devuelve
por cada imagen: documentTypeDetected, matchesExpectedType, qualityScore, extractedDocNumber, suggestion.

### 4. Overrides post-modelo
- **Cédula coincide**: si REJECT por nombre pero la cédula del doc coincide con la del form → APPROVE.
- **Vencimiento**: si REJECT por "vencido" → MANUAL_REVIEW (renovable, no fraude).
- **Detección de typo**: si los docs son consistentes entre sí y difieren del form por ≤2 caracteres → typo, propone corregir cédula.
- **Fraude**: si los docs muestran ≥2 cédulas distintas que no son typo → escala.

### 5. Decisión final
- **REJECTED**: RUC bloqueante (CANCELADO/BLOQUEADO), o imagen claramente otra persona/documento falso.
- **APPROVED**: todos los docs OK + RUC ACTIVO/NO_ENCONTRADO/NOT_APPLICABLE.
- **NEEDS_REVIEW**: todo lo demás (RUC soft issue, imágenes ambiguas, typos, tipo equivocado).

### 6. Auto-approve (solo cron + REAL + APPROVED limpio)
Si la decisión es APPROVED y todas las acciones propuestas son únicamente
\`propose_approve_document\` + \`propose_send_whatsapp_template('capacitaciones')\`,
se aprueba automáticamente y se dispara el mensaje WhatsApp de aprobación por
el bot. Caso contrario, queda en PROPOSED para revisión humana.`

// Catálogo de tools que el agente puede proponer (refleja ProposedToolCall en agent.service.ts).
const TOOLS_CATALOG = `## Tools que el agente puede proponer

Todas las acciones se crean con status=PROPOSED y requieren aprobación humana
(excepto el camino de auto-approve descrito en el pipeline).

| Tool | Cuándo |
|------|--------|
| \`propose_approve_document\` | Documento válido y listo para aprobar. |
| \`propose_reject_document\` | Documento es claramente de otra persona o tipo incorrecto. |
| \`propose_request_document_resubmission\` | El postulante subió el documento equivocado (ej. CV en vez de antecedentes). Envía mensaje específico via WhatsApp. |
| \`propose_send_whatsapp_template\` | Disparar template WhatsApp (ej. 'capacitaciones' al aprobar). |
| \`propose_waive_ruc_inactive\` | Marcar excepción para RUC INACTIVO/SUSPENDIDO con nota. |
| \`propose_update_driver_cedula\` | Corregir cédula del form cuando hay typo confirmado por los documentos. |
| \`escalate_to_admin\` | Casos imposibles de resolver automáticamente (cédula vacía, señal de fraude). |`

export async function GET() {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const override = await getActiveOverride()

  return NextResponse.json({
    override,
    code: {
      systemPrompt: SYSTEM_PROMPT,
      pipelineDescription: PIPELINE_DESCRIPTION,
      toolsCatalog: TOOLS_CATALOG,
    },
    defaults: {
      haikuModel: HAIKU_MODEL,
      maxCedulaImages: DEFAULT_MAX_CEDULA_IMAGES,
      targetImageBytes: DEFAULT_TARGET_RAW_BYTES,
      rucRefreshMaxAgeDays: DEFAULT_RUC_REFRESH_MAX_AGE_DAYS,
    },
  })
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const adminUser = guard.user

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const cleaned = {
    systemPromptOverride: stringOrNull(body.systemPromptOverride),
    systemPromptAddendum: stringOrNull(body.systemPromptAddendum),
    pipelineNotes: stringOrNull(body.pipelineNotes),
    toolsNotes: stringOrNull(body.toolsNotes),
    maxCedulaImages: positiveIntOrNull(body.maxCedulaImages, { min: 1, max: 10 }),
    targetImageBytes: positiveIntOrNull(body.targetImageBytes, {
      min: 512 * 1024,
      max: 5 * 1024 * 1024,
    }),
    rucRefreshMaxAgeDays: positiveIntOrNull(body.rucRefreshMaxAgeDays, { min: 0, max: 90 }),
    haikuModelOverride: stringOrNull(body.haikuModelOverride),
  }

  const updated = await updateActiveOverride(cleaned, adminUser.clerkId)
  return NextResponse.json({ override: updated })
}

function stringOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' ? null : t
}

function positiveIntOrNull(
  v: unknown,
  { min, max }: { min: number; max: number },
): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseInt(String(v), 10)
  if (!Number.isFinite(n) || n < min || n > max) return null
  return Math.floor(n)
}
