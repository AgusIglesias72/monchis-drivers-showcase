// components/admin/comunicacion/MessagePreview.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, Phone, FileText } from 'lucide-react';
import { ACTIVE_MESSAGE_TYPES, FORM_STEPS } from '@/lib/constants/whatsapp-messages';

interface MessagePreviewProps {
  formData: {
    phone: string;
    name: string;
    type: string;
    step?: string;
    customMessage?: string;
  };
}

/**
 * Genera el mensaje exacto que se enviará según el tipo y step
 */
function generatePreviewMessage(
  type: string,
  name: string,
  step?: string,
  customMessage?: string
): string {
  const firstName = name.split(' ')[0] || 'Usuario';
  const formUrl = 'https://monchis-drivers.vercel.app/';

  switch (type) {
    case 'APPLICATION_RECEIVED':
      return `¡Hola ${firstName}! 👋

¡Recibimos tu postulación para ser parte del equipo de Monchis Drivers! ✅

Nuestro equipo está revisando tu información y nos comunicaremos con vos en las próximas horas.

Si tenés alguna consulta, no dudes en responder este mensaje.

¡Gracias por querer sumarte! 🚗`;

    case 'FORM_INCOMPLETE':
      const baseIntro = `¡Hola ${firstName}! 👋

Vimos que comenzaste tu postulación en Monchis Drivers pero quedó incompleta. 🚗

`;

      switch (step) {
        case 'personal_info':
          return (
            baseIntro +
            `¡No te preocupes! Solo te va a tomar 2 minutos completarla.\n\n` +
            `Continuá acá: ${formUrl}\n\n` +
            `Si tenés alguna consulta, no dudes en escribirnos.`
          );

        case 'documents':
          return (
            baseIntro +
            `Para avanzar necesitamos que subas:\n\n` +
            `📄 *Documentación requerida:*\n` +
            `• Cédula (frente y dorso)\n` +
            `• Certificado de Antecedentes Penales\n\n` +
            `El certificado lo podés gestionar acá:\n` +
            `https://www.paraguay.gov.py/carpeta-ciudadana\n\n` +
            `💡 *Tip:* El certificado tiene vigencia de 6 meses, así que si ya tenés uno reciente, ¡podés usarlo!\n\n` +
            `Continuá tu postulación acá:\n${formUrl}\n\n` +
            `Si tenés alguna consulta, no dudes en escribirnos.`
          );

        case 'bank_info':
          return (
            baseIntro +
            `Solo nos falta tu información bancaria para poder procesarte los pagos.\n\n` +
            `💰 *Importante:* Es necesario tener una cuenta en *ueno bank* para ser repartidor. Es el banco con el que trabajamos para realizar los pagos de comisiones.\n\n` +
            `Si aún no tenés cuenta, ¡es rápido y fácil abrirla!\n\n` +
            `Continuá tu postulación acá:\n${formUrl}\n\n` +
            `Si tenés alguna consulta, no dudes en escribirnos.`
          );

        case 'equipment_payment':
          return (
            baseIntro.replace('quedó incompleta', 'está casi completa') +
            `¡Estás a un paso de completar tu postulación! 🚗\n\n` +
            `Solo falta confirmar el pago inicial del equipo (Gs. 200.000) que incluye mochila térmica, remera y porta vasos.\n\n` +
            `💵 *Podés abonar:*\n` +
            `• Por transferencia antes de la capacitación\n` +
            `• Presencialmente el día de la capacitación\n\n` +
            `Continuá acá para finalizar:\n${formUrl}\n\n` +
            `Si tenés alguna consulta, no dudes en escribirnos.`
          );

        default:
          return (
            baseIntro +
            `¿Tuviste algún problema para completarlo? Estamos acá para ayudarte.\n\n` +
            `Continuá tu postulación: ${formUrl}\n\n` +
            `Si necesitás ayuda, respondé este mensaje.`
          );
      }

    case 'CUSTOM':
      return customMessage || '[Mensaje personalizado]';

    default:
      return '[Selecciona un tipo de mensaje para ver el preview]';
  }
}

export function MessagePreview({ formData }: MessagePreviewProps) {
  const { phone, name, type, step, customMessage } = formData;

  const messageType = type ? ACTIVE_MESSAGE_TYPES[type as keyof typeof ACTIVE_MESSAGE_TYPES] : null;
  const formStep = step ? FORM_STEPS[step as keyof typeof FORM_STEPS] : null;

  const previewMessage = type
    ? generatePreviewMessage(type, name || 'Usuario', step, customMessage)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Preview del Mensaje</h3>
        {messageType && (
          <Badge variant="outline" className="text-xs">
            {messageType.label}
          </Badge>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-3">
        {/* Destinatario */}
        <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
          <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div className="flex-1 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Destinatario</p>
            <p className="text-sm font-medium">
              {name || <span className="text-muted-foreground italic">Sin nombre</span>}
            </p>
          </div>
        </div>

        {/* Teléfono */}
        <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
          <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div className="flex-1 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">WhatsApp</p>
            <p className="text-sm font-mono">
              {phone || <span className="text-muted-foreground italic">Sin número</span>}
            </p>
          </div>
        </div>

        {/* Step (si aplica) */}
        {formStep && (
          <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="flex-1 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Step Incompleto</p>
              <p className="text-sm font-medium">{formStep.label}</p>
              <p className="text-xs text-muted-foreground">{formStep.description}</p>
            </div>
          </div>
        )}
      </div>

      {/* Preview del mensaje */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">Mensaje que se enviará:</p>
        </div>

        <div className="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          {previewMessage ? (
            <div className="space-y-2">
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {previewMessage}
              </pre>

              {/* Contador de caracteres */}
              <div className="pt-2 border-t border-green-200 dark:border-green-800">
                <p className="text-xs text-muted-foreground">
                  Longitud: {previewMessage.length} caracteres
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Completa el formulario para ver el preview
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info adicional */}
      {type && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-900 dark:text-blue-100">
            💡 <strong>Nota:</strong> Este es el mensaje exacto que recibirá el destinatario en
            WhatsApp. Verificá que toda la información sea correcta antes de enviar.
          </p>
        </div>
      )}
    </div>
  );
}