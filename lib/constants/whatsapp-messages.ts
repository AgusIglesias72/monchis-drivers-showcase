// lib/constants/whatsapp-messages.ts

/**
 * Constantes de mensajes de WhatsApp
 * Mantiene sincronizados los tipos de mensajes entre frontend, backend y bot
 */

// ==================== TIPOS DE MENSAJES ACTIVOS ====================

export const ACTIVE_MESSAGE_TYPES = {
  APPLICATION_RECEIVED: {
    value: 'APPLICATION_RECEIVED',
    label: 'Postulación Recibida',
    description: 'Confirmación automática cuando se completa el formulario',
    requiresStep: false,
    color: 'green',
  },
  FORM_INCOMPLETE: {
    value: 'FORM_INCOMPLETE',
    label: 'Formulario Incompleto',
    description: 'Recordatorio para completar el formulario según el step',
    requiresStep: true,
    color: 'yellow',
  },
  CAPACITATION_NO_SHOW: {
    value: 'CAPACITATION_NO_SHOW',
    label: 'No Asistió a Capacitación',
    description: 'Mensaje automático cuando un driver no asiste a su capacitación',
    requiresStep: false,
    color: 'orange',
  },
  CUSTOM: {
    value: 'CUSTOM',
    label: 'Mensaje Personalizado',
    description: 'Mensaje libre escrito por el administrador',
    requiresStep: false,
    color: 'blue',
  },
} as const;

// ==================== STEPS DISPONIBLES ====================

export const FORM_STEPS = {
  personal_info: {
    value: 'personal_info',
    label: 'Datos Personales',
    description: 'Steps 1-3: Contacto, datos personales y vehículo',
    formSteps: [1, 2, 3],
  },
  documents: {
    value: 'documents',
    label: 'Documentos',
    description: 'Step 4: Cédula y Certificado de Antecedentes',
    formSteps: [4],
  },
  bank_info: {
    value: 'bank_info',
    label: 'Información Bancaria',
    description: 'Step 5: Cuenta de ueno bank',
    formSteps: [5],
  },
  equipment_payment: {
    value: 'equipment_payment',
    label: 'Pago de Equipo',
    description: 'Step 6: Pago inicial y equipo',
    formSteps: [6],
  },
} as const;

// ==================== TIPOS COMENTADOS (FUTURO) ====================

export const INACTIVE_MESSAGE_TYPES = {
  ONBOARDING_REMINDER: {
    value: 'ONBOARDING_REMINDER',
    label: 'Recordatorio de Onboarding',
    description: 'Recordatorio de sesión de onboarding programada',
  },
  WELCOME: {
    value: 'WELCOME',
    label: 'Bienvenida',
    description: 'Mensaje de bienvenida inicial',
  },
  CAPACITATION_REMINDER: {
    value: 'CAPACITATION_REMINDER',
    label: 'Recordatorio de Capacitación',
    description: 'Recordatorio de capacitación programada',
  },
} as const;

// ==================== HELPERS ====================

/**
 * Obtiene los tipos de mensajes activos como array
 */
export function getActiveMessageTypes() {
  return Object.values(ACTIVE_MESSAGE_TYPES);
}

/**
 * Obtiene los steps disponibles como array
 */
export function getFormSteps() {
  return Object.values(FORM_STEPS);
}

/**
 * Verifica si un tipo de mensaje requiere step
 */
export function requiresStep(messageType: string): boolean {
  return messageType === 'FORM_INCOMPLETE';
}

/**
 * Obtiene el step correspondiente a un número de step del formulario
 */
export function getStepByFormStep(formStep: number): string {
  const step = Object.values(FORM_STEPS).find((s) =>
    s.formSteps.includes(formStep as unknown as never)
  );
  return step?.value || 'personal_info';
}

/**
 * Valida que un tipo de mensaje sea válido
 */
export function isValidMessageType(type: string): boolean {
  return Object.keys(ACTIVE_MESSAGE_TYPES).includes(type);
}

/**
 * Valida que un step sea válido
 */
export function isValidStep(step: string): boolean {
  return Object.keys(FORM_STEPS).includes(step);
}

// ==================== FORMATO DE TELÉFONO ====================

export const PHONE_FORMAT = {
  argentina: {
    example: '5491158165977',
    pattern: /^549\d{10}$/,
    description: 'Código país (54) + 9 + código área (11) + número (8 dígitos)',
  },
  paraguay: {
    example: '5950984039476',
    pattern: /^595\d{9}$/,
    description: 'Código país (595) + código área + número',
  },
  international: {
    example: '521234567890',
    description: 'Código país + número completo (sin espacios ni caracteres especiales)',
  },
};

/**
 * Ejemplos de teléfonos válidos
 */
export const PHONE_EXAMPLES = [
  '5491158165977 (Argentina)',
  '5950984039476 (Paraguay)',
  '521234567890 (México)',
];

// ==================== MENSAJES DE VALIDACIÓN ====================

export const VALIDATION_MESSAGES = {
  phone: {
    required: 'El número de teléfono es requerido',
    invalid: 'Formato inválido. Ejemplo: 5491158165977',
    format: 'Debe incluir código de país sin + ni espacios',
  },
  name: {
    required: 'El nombre es requerido',
    minLength: 'El nombre debe tener al menos 2 caracteres',
  },
  type: {
    required: 'Debe seleccionar un tipo de mensaje',
    invalid: 'Tipo de mensaje inválido',
  },
  step: {
    required: 'Debe seleccionar un step cuando el tipo es "Formulario Incompleto"',
    invalid: 'Step inválido',
  },
  customMessage: {
    required: 'El mensaje personalizado es requerido para tipo CUSTOM',
    minLength: 'El mensaje debe tener al menos 10 caracteres',
    maxLength: 'El mensaje no puede exceder 1000 caracteres',
  },
};

// ==================== COLORES DE STATUS ====================

export const STATUS_COLORS = {
  QUEUED: 'gray',
  SENDING: 'blue',
  SENT: 'green',
  DELIVERED: 'green',
  READ: 'purple',
  FAILED: 'red',
  CANCELLED: 'gray',
} as const;

export const SOURCE_COLORS = {
  MANUAL: 'blue',
  CRON: 'purple',
  TRIGGER: 'green',
  API: 'orange',
  TEST: 'gray',
} as const;