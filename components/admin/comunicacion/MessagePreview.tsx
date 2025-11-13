// components/admin/comunicacion/MessagePreview.tsx
'use client';

import { useMemo } from 'react';
import { MessageSquare, Clock, Type } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MessagePreviewProps {
  formData: {
    phone: string;
    name: string;
    type: string;
    step?: string;
    customMessage?: string;
    [key: string]: any;
  };
}

// Función para generar el preview del mensaje
function generateMessagePreview(formData: any): string {
  const { name, type, step, customMessage } = formData;
  const firstName = name.split(' ')[0] || 'Usuario';

  if (!type || !name) {
    return 'Completa el formulario para ver el preview del mensaje...';
  }

  switch (type) {
    case 'CUSTOM':
      return customMessage || '[Escribe tu mensaje personalizado en el formulario]';

    case 'WELCOME':
      return `¡Bienvenido/a ${firstName}! 🎉

Gracias por tu interés en formar parte de Monchis Drivers.

Estamos revisando tu postulación y nos pondremos en contacto pronto.

Si tenés alguna consulta, no dudes en escribirnos.

¡Saludos! 🚗`;

    case 'APPLICATION_RECEIVED':
      const applicationId = formData.applicationId || 'APP-2024-XXX';
      const estimatedTime = formData.estimatedResponseTime || '48 horas';
      return `¡Hola ${firstName}! ✅

Recibimos tu postulación correctamente.

📋 Número de postulación: ${applicationId}

⏱️ Tiempo estimado de respuesta: ${estimatedTime}

Nuestro equipo la revisará y te contactaremos a la brevedad.

¡Gracias por tu paciencia! 🚗`;

    case 'FORM_INCOMPLETE':
      const stepText = getStepText(step);
      const formUrl = formData.formUrl || 'https://monchis.com/apply';
      return `Hola ${firstName}, notamos que comenzaste tu postulación en Monchis Drivers pero no la completaste. 🚗

¡Estás a un paso de terminar! Solo falta que ${stepText}.

${getStepDetails(step)}

Continuá aquí: ${formUrl}`;

    case 'ONBOARDING_REMINDER':
      const date = formData.date || '[fecha]';
      const time = formData.time || '[hora]';
      const location = formData.location || '[ubicación]';
      const meetingUrl = formData.meetingUrl;
      
      let onboardingMsg = `¡Hola ${firstName}! 👋

Te recordamos que tenés tu onboarding de Monchis Drivers programado.

📅 Detalles de la sesión:
• Fecha: ${date}
• Hora: ${time}
• Lugar: ${location}`;

      if (meetingUrl) {
        onboardingMsg += `\n• Link de reunión: ${meetingUrl}`;
      }

      onboardingMsg += `\n\nPor favor, confirmá tu asistencia respondiendo este mensaje.

¡Te esperamos! 🚗`;
      
      return onboardingMsg;

    case 'CAPACITATION_REMINDER':
      const capacitationName = formData.capacitationName || '[nombre de capacitación]';
      const capDate = formData.date || '[fecha]';
      const capTime = formData.time || '[hora]';
      const capLocation = formData.location;
      const duration = formData.duration;
      const capMeetingUrl = formData.meetingUrl;

      let capMsg = `¡Hola ${firstName}! 📚

Te recordamos tu capacitación programada:

📖 ${capacitationName}
📅 Fecha: ${capDate}
⏰ Hora: ${capTime}`;

      if (duration) capMsg += `\n⏱️ Duración: ${duration}`;
      if (capLocation) capMsg += `\n📍 Lugar: ${capLocation}`;
      if (capMeetingUrl) capMsg += `\n🔗 Link: ${capMeetingUrl}`;

      capMsg += `\n\nPor favor confirmá tu asistencia.

¡Nos vemos! 🚗`;

      return capMsg;

    default:
      return 'Tipo de mensaje no reconocido';
  }
}

function getStepText(step?: string): string {
  switch (step) {
    case 'personal_info':
      return 'completes tus datos personales';
    case 'documents':
      return 'subas tu documentación';
    case 'vehicle_info':
      return 'completes los datos del vehículo';
    case 'bank_info':
      return 'completes tu información bancaria';
    case 'availability':
      return 'indiques tu disponibilidad horaria';
    case 'references':
      return 'agregues tus referencias laborales';
    default:
      return 'completes la información faltante';
  }
}

function getStepDetails(step?: string): string {
  switch (step) {
    case 'documents':
      return `📄 Necesitamos:
• DNI (frente y dorso)
• Registro de conducir
• Foto de perfil`;
    case 'vehicle_info':
      return `🚗 Necesitamos:
• Marca y modelo del vehículo
• Año y patente
• Foto del vehículo`;
    case 'bank_info':
      return `💳 Necesitamos:
• Número de cuenta
• CBU/CVU
• Banco`;
    default:
      return '';
  }
}

function getMessageTypeLabel(type: string): string {
  switch (type) {
    case 'CUSTOM':
      return 'Personalizado';
    case 'WELCOME':
      return 'Bienvenida';
    case 'APPLICATION_RECEIVED':
      return 'Postulación Recibida';
    case 'FORM_INCOMPLETE':
      return 'Formulario Incompleto';
    case 'ONBOARDING_REMINDER':
      return 'Recordatorio Onboarding';
    case 'CAPACITATION_REMINDER':
      return 'Recordatorio Capacitación';
    default:
      return 'Desconocido';
  }
}

function getMessageTypeColor(type: string): string {
  switch (type) {
    case 'CUSTOM':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    case 'WELCOME':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'APPLICATION_RECEIVED':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'FORM_INCOMPLETE':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'ONBOARDING_REMINDER':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'CAPACITATION_REMINDER':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

export function MessagePreview({ formData }: MessagePreviewProps) {
  const messagePreview = useMemo(() => generateMessagePreview(formData), [formData]);
  const messageLength = messagePreview.length;
  const estimatedTime = Math.max(1, Math.ceil(messageLength / 100));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Preview del Mensaje
        </h3>
        {formData.type && (
          <Badge className={getMessageTypeColor(formData.type)}>
            {getMessageTypeLabel(formData.type)}
          </Badge>
        )}
      </div>

      {/* WhatsApp-style Preview */}
      <div className="bg-gradient-to-b from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900 rounded-lg p-4 min-h-[300px]">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm max-w-[85%]">
          {/* Header del chat */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium">Monchis Drivers</p>
              <p className="text-xs text-muted-foreground">Bot de WhatsApp</p>
            </div>
          </div>

          {/* Mensaje */}
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {messagePreview}
          </div>

          {/* Timestamp y checkmarks */}
          <div className="flex items-center justify-end gap-1 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {new Date().toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span className="text-blue-500 ml-1">✓✓</span>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Type className="h-3 w-3" />
            Caracteres
          </p>
          <p className="text-sm font-medium">{messageLength}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Tiempo estimado
          </p>
          <p className="text-sm font-medium">~{estimatedTime}s</p>
        </div>
      </div>

      {messageLength > 1000 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            ⚠️ El mensaje es muy largo ({messageLength} caracteres). 
            Considera acortarlo para mejor lectura.
          </p>
        </div>
      )}
    </div>
  );
}