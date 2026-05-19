// app/admin/configuracion/page.tsx

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getActiveOverride } from '@/lib/services/agent-config.service'
import {
  SYSTEM_PROMPT,
  HAIKU_MODEL,
  DEFAULT_TARGET_RAW_BYTES,
} from '@/lib/services/agent-vision.service'
import {
  DEFAULT_MAX_CEDULA_IMAGES,
  DEFAULT_RUC_REFRESH_MAX_AGE_DAYS,
} from '@/lib/services/agent.service'
import { AgentConfigContent } from '@/components/admin/configuracion/agent-config-content'

export const dynamic = 'force-dynamic'

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
Una sola llamada con todas las imágenes (cédulas + antecedentes). El modelo devuelve por cada imagen: documentTypeDetected, matchesExpectedType, qualityScore, extractedDocNumber, suggestion.

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
se aprueba automáticamente y se dispara el mensaje WhatsApp de aprobación
por el bot. Caso contrario, queda en PROPOSED para revisión humana.`

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

export default async function ConfiguracionPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const override = await getActiveOverride()

  return (
    <AgentConfigContent
      initialOverride={override}
      code={{
        systemPrompt: SYSTEM_PROMPT,
        pipelineDescription: PIPELINE_DESCRIPTION,
        toolsCatalog: TOOLS_CATALOG,
      }}
      defaults={{
        haikuModel: HAIKU_MODEL,
        maxCedulaImages: DEFAULT_MAX_CEDULA_IMAGES,
        targetImageBytes: DEFAULT_TARGET_RAW_BYTES,
        rucRefreshMaxAgeDays: DEFAULT_RUC_REFRESH_MAX_AGE_DAYS,
      }}
    />
  )
}
