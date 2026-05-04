/**
 * Labels y descripciones legibles para las acciones propuestas por el agente IA.
 * Reemplazan los nombres técnicos (`propose_approve_document`) por texto en español
 * que un admin sin contexto técnico pueda entender.
 */

export interface AgentActionLabel {
  title: string
  describe: (input: Record<string, any>) => string
  icon: 'check' | 'x' | 'alert' | 'message' | 'waive' | 'escalate'
}

const LABELS: Record<string, AgentActionLabel> = {
  propose_approve_document: {
    title: 'Aprobar documento',
    icon: 'check',
    describe: (i) => `ID documento: ${i.documentId}`,
  },
  propose_reject_document: {
    title: 'Rechazar documento',
    icon: 'x',
    describe: (i) => `Motivo: ${i.reason ?? '(sin motivo)'}\nID documento: ${i.documentId}`,
  },
  propose_waive_ruc_inactive: {
    title: 'Marcar "RUC Inactivo" (excepción)',
    icon: 'waive',
    describe: (i) => (i.note ? `Nota: ${i.note}` : 'Sin nota adicional'),
  },
  propose_send_whatsapp_template: {
    title: 'Enviar plantilla de WhatsApp',
    icon: 'message',
    describe: (i) => {
      const vars = i.variables ? Object.entries(i.variables).map(([k, v]) => `${k}=${v}`).join(', ') : ''
      return `Plantilla: ${i.templateKey ?? '?'}${vars ? ` — variables: ${vars}` : ''}`
    },
  },
  propose_request_document_resubmission: {
    title: 'Solicitar nuevo documento al postulante',
    icon: 'message',
    describe: (i) => {
      const docLabel = documentTypeLabel(i.documentType)
      return `Pedir ${docLabel}\nMotivo: ${i.reason ?? '(sin motivo)'}${
        i.whatsappMessage ? `\n\nMensaje WhatsApp propuesto:\n"${i.whatsappMessage}"` : ''
      }`
    },
  },
  propose_update_driver_cedula: {
    title: 'Corregir cédula del postulante (typo detectado)',
    icon: 'alert',
    describe: (i) =>
      `El postulante cargó la cédula ${i.currentCedula} pero sus documentos indican ${i.correctedCedula}${
        i.extractedFullName ? ` (titular: ${i.extractedFullName})` : ''
      }.\n\nMotivo: ${i.reason ?? '(sin motivo)'}\n\nAl aprobar, se actualizará la cédula en el formulario y se re-consultará el RUC con la cédula correcta.`,
  },
  escalate_to_admin: {
    title: 'Escalar a admin (revisión manual)',
    icon: 'escalate',
    describe: (i) => i.reason ?? 'Sin motivo especificado',
  },
}

const FALLBACK: AgentActionLabel = {
  title: 'Acción desconocida',
  icon: 'alert',
  describe: (i) => JSON.stringify(i),
}

function documentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    CEDULA: 'nueva foto de cédula',
    CRIMINAL_RECORD: 'nuevo certificado de antecedentes',
    TAX_COMPLIANCE: 'nuevo certificado tributario',
  }
  return map[type] ?? `nuevo documento (${type})`
}

export function getActionLabel(tool: string): AgentActionLabel {
  return LABELS[tool] ?? FALLBACK
}
