// lib/constants/whatsapp-template-keys.ts
//
// Catálogo de plantillas WhatsApp consumidas por el código. Cada `key` de acá
// es referenciada hard-coded desde alguna ruta API / cron / acción. Si una
// plantilla con estas keys no existe o está inactiva en DB, el envío asociado
// se skipea silenciosamente (ver whatsapp-messenger.service).
//
// Mantener sincronizado con:
//   - app/api/form/complete/route.ts
//   - app/api/postulaciones/documents/[id]/approve/route.ts
//   - app/api/cron/send-daily-reminders/route.ts
//   - lib/actions/whatsapp-approval-trigger.actions.ts
//   - lib/services/document-approval.service.ts

export interface SystemTemplateKey {
  key: string
  /** Cuándo lo dispara el sistema, en lenguaje humano. */
  trigger: string
  /** Quién lo dispara (route, cron, action). */
  source: string
}

export const SYSTEM_TEMPLATE_KEYS: SystemTemplateKey[] = [
  {
    key: 'form_completed',
    trigger: 'Postulante completó el formulario',
    source: 'API /form/complete',
  },
  {
    key: 'capacitaciones',
    trigger: 'Documentos aprobados — agendar capacitación (autoagendamiento)',
    source: 'API documents/approve + cron + acción manual',
  },
  {
    key: 'form_incomplete',
    trigger: 'Cron: form a medias (cualquier step) o seguimiento genérico',
    source: 'Cron diario',
  },
  {
    key: 'documents_pending',
    trigger: 'Cron: faltan pasos post-form (documentos, correcciones o pago)',
    source: 'Cron diario',
  },
  {
    key: 'capacitacion_reminder',
    trigger: 'Cron: recordatorio de capacitación próxima',
    source: 'Cron diario',
  },
]

export const SYSTEM_TEMPLATE_KEYS_SET = new Set(SYSTEM_TEMPLATE_KEYS.map(k => k.key))

export function getSystemTemplateInfo(key: string): SystemTemplateKey | undefined {
  return SYSTEM_TEMPLATE_KEYS.find(k => k.key === key)
}

// Variables disponibles para interpolar en el `content` de cualquier plantilla.
// Ver renderTemplate en whatsapp-messenger.service.ts.
export interface TemplateVariable {
  name: string
  example: string
  description: string
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    name: 'nombre',
    example: 'Juan',
    description: 'Primer nombre del postulante (recomendado)',
  },
  {
    name: 'name',
    example: 'Juan',
    description: 'Alias de {nombre} en inglés',
  },
  {
    name: 'firstname',
    example: 'Juan',
    description: 'Primer nombre (alias)',
  },
  {
    name: 'fullname',
    example: 'Juan Pérez',
    description: 'Nombre completo del postulante',
  },
  {
    name: 'apellido',
    example: 'Pérez',
    description: 'Apellido del postulante',
  },
  {
    name: 'lastname',
    example: 'Pérez',
    description: 'Apellido (alias en inglés)',
  },
]

export const TEMPLATE_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'capacitacion', label: 'Capacitación' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'pago', label: 'Pago' },
  { value: 'recordatorio', label: 'Recordatorio' },
] as const
