// components/admin/comunicacion/MessageTestForm.tsx
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Schema de validación
const messageSchema = z.object({
  phone: z.string().min(1, 'El teléfono es requerido'),
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.string().min(1, 'Selecciona un tipo de mensaje'),
  step: z.string().optional(),
  // Campo para mensaje personalizado
  customMessage: z.string().optional(),
  // Campos dinámicos para onboarding_reminder
  date: z.string().optional(),
  time: z.string().optional(),
  location: z.string().optional(),
  meetingUrl: z.string().optional(),
  // Campos dinámicos para application_received
  applicationId: z.string().optional(),
  estimatedResponseTime: z.string().optional(),
  // Campos dinámicos para capacitation_reminder
  capacitationName: z.string().optional(),
  duration: z.string().optional(),
  // Campos dinámicos para form_incomplete
  formUrl: z.string().optional(),
});

type MessageFormData = z.infer<typeof messageSchema>;

const MESSAGE_TYPES = [
  { value: 'WELCOME', label: 'Mensaje de Bienvenida' },
  { value: 'APPLICATION_RECEIVED', label: 'Postulación Recibida' },
  { value: 'FORM_INCOMPLETE', label: 'Formulario Incompleto' },
  { value: 'ONBOARDING_REMINDER', label: 'Recordatorio de Onboarding' },
  { value: 'CAPACITATION_REMINDER', label: 'Recordatorio de Capacitación' },
  { value: 'CUSTOM', label: '✏️ Mensaje Personalizado' },
];

const FORM_STEPS = [
  { value: 'personal_info', label: 'Datos Personales' },
  { value: 'documents', label: 'Documentación' },
  { value: 'vehicle_info', label: 'Información del Vehículo' },
  { value: 'bank_info', label: 'Información Bancaria' },
  { value: 'availability', label: 'Disponibilidad' },
  { value: 'references', label: 'Referencias' },
];

interface MessageTestFormProps {
  onChange?: (data: any) => void;
  onMessageSent?: () => void;
}

export function MessageTestForm({ onChange, onMessageSent }: MessageTestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState('');

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      phone: '',
      name: '',
      type: '',
      estimatedResponseTime: '48 horas',
      duration: '2 horas',
    },
  });

  // Notificar cambios al padre cuando cambian los valores específicos
  const watchedValues = form.watch();
  
  React.useEffect(() => {
    if (onChange) {
      onChange(watchedValues);
    }
  }, [
    watchedValues.phone, 
    watchedValues.name, 
    watchedValues.type, 
    watchedValues.step, 
    watchedValues.date, 
    watchedValues.time, 
    watchedValues.location, 
    watchedValues.meetingUrl, 
    watchedValues.applicationId, 
    watchedValues.estimatedResponseTime, 
    watchedValues.capacitationName, 
    watchedValues.duration, 
    watchedValues.formUrl
  ]);

  const onSubmit = async (data: MessageFormData) => {
    setIsSubmitting(true);

    try {
      // Construir metadata según el tipo
      const metadata: Record<string, any> = {};

      if (data.type === 'ONBOARDING_REMINDER') {
        metadata.date = data.date;
        metadata.time = data.time;
        metadata.location = data.location;
        metadata.meetingUrl = data.meetingUrl;
      } else if (data.type === 'APPLICATION_RECEIVED') {
        metadata.applicationId = data.applicationId;
        metadata.estimatedResponseTime = data.estimatedResponseTime;
      } else if (data.type === 'CAPACITATION_REMINDER') {
        metadata.capacitationName = data.capacitationName;
        metadata.date = data.date;
        metadata.time = data.time;
        metadata.location = data.location;
        metadata.duration = data.duration;
        metadata.meetingUrl = data.meetingUrl;
      } else if (data.type === 'FORM_INCOMPLETE') {
        metadata.formUrl = data.formUrl;
      }

      // Llamar al API
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: data.phone,
          name: data.name,
          type: data.type,
          step: data.step,
          metadata,
          customMessage: data.customMessage, // Para tipo CUSTOM
          source: 'TEST',
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('¡Mensaje enviado exitosamente!', {
          description: `Enviado a ${data.name}`,
        });
        
        // Limpiar formulario
        form.reset();
        setSelectedType('');
        
        // Notificar al padre
        if (onMessageSent) {
          onMessageSent();
        }
      } else {
        toast.error('Error al enviar mensaje', {
          description: result.error || 'Intenta nuevamente',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje', {
        description: 'Verifica tu conexión e intenta nuevamente',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    form.reset();
    setSelectedType('');
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Sección: Destinatario */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">Destinatario</h3>
        
        <div className="space-y-2">
          <Label htmlFor="name">Nombre completo</Label>
          <Input
            id="name"
            {...form.register('name')}
            placeholder="Juan Pérez"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            {...form.register('phone')}
            placeholder="+54 9 11 1234-5678"
          />
          <p className="text-xs text-muted-foreground">
            Formato: +54 9 11 xxxx-xxxx o 1112345678
          </p>
          {form.formState.errors.phone && (
            <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
          )}
        </div>
      </div>

      {/* Sección: Tipo de Mensaje */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">Tipo de Mensaje</h3>
        
        <div className="space-y-2">
          <Label htmlFor="type">Selecciona el tipo</Label>
          <Select
            value={selectedType}
            onValueChange={(value) => {
              setSelectedType(value);
              form.setValue('type', value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un tipo..." />
            </SelectTrigger>
            <SelectContent>
              {MESSAGE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.type && (
            <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
          )}
        </div>
      </div>

      {/* Campos Dinámicos según el tipo */}
      {selectedType === 'FORM_INCOMPLETE' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Detalles del Formulario</h3>
          
          <div className="space-y-2">
            <Label htmlFor="step">Step del formulario</Label>
            <Select
              value={form.watch('step') || ''}
              onValueChange={(value) => form.setValue('step', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un step..." />
              </SelectTrigger>
              <SelectContent>
                {FORM_STEPS.map((step) => (
                  <SelectItem key={step.value} value={step.value}>
                    {step.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="formUrl">URL del formulario (opcional)</Label>
            <Input
              id="formUrl"
              {...form.register('formUrl')}
              placeholder="https://monchis.com/apply?id=123"
            />
          </div>
        </div>
      )}

      {selectedType === 'ONBOARDING_REMINDER' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Detalles del Onboarding</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                {...form.register('date')}
                placeholder="15 de Noviembre"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Hora</Label>
              <Input
                id="time"
                {...form.register('time')}
                placeholder="10:00 AM"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              {...form.register('location')}
              placeholder="Oficina Central"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meetingUrl">Link de reunión (opcional)</Label>
            <Input
              id="meetingUrl"
              {...form.register('meetingUrl')}
              placeholder="https://meet.google.com/xxx"
            />
          </div>
        </div>
      )}

      {selectedType === 'APPLICATION_RECEIVED' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Detalles de la Postulación</h3>
          
          <div className="space-y-2">
            <Label htmlFor="applicationId">ID de postulación (opcional)</Label>
            <Input
              id="applicationId"
              {...form.register('applicationId')}
              placeholder="APP-2024-001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedResponseTime">Tiempo estimado de respuesta</Label>
            <Input
              id="estimatedResponseTime"
              {...form.register('estimatedResponseTime')}
              placeholder="48 horas"
            />
          </div>
        </div>
      )}

      {selectedType === 'CAPACITATION_REMINDER' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Detalles de la Capacitación</h3>
          
          <div className="space-y-2">
            <Label htmlFor="capacitationName">Nombre de la capacitación</Label>
            <Input
              id="capacitationName"
              {...form.register('capacitationName')}
              placeholder="Seguridad Vial Avanzada"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                {...form.register('date')}
                placeholder="20 de Noviembre"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Hora</Label>
              <Input
                id="time"
                {...form.register('time')}
                placeholder="14:00 hs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Ubicación (opcional)</Label>
            <Input
              id="location"
              {...form.register('location')}
              placeholder="Oficina Central"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duración (opcional)</Label>
            <Input
              id="duration"
              {...form.register('duration')}
              placeholder="2 horas"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meetingUrl">Link de reunión (opcional)</Label>
            <Input
              id="meetingUrl"
              {...form.register('meetingUrl')}
              placeholder="https://meet.google.com/xxx"
            />
          </div>
        </div>
      )}

      {selectedType === 'CUSTOM' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Mensaje Personalizado</h3>
          
          <div className="space-y-2">
            <Label htmlFor="customMessage">Escribe tu mensaje</Label>
            <textarea
              id="customMessage"
              {...form.register('customMessage')}
              placeholder="Escribe aquí el mensaje que quieres enviar..."
              className="w-full min-h-[150px] p-3 border rounded-md resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Este mensaje se enviará tal cual lo escribas, sin usar ningún template.
            </p>
          </div>
        </div>
      )}

      {selectedType === 'WELCOME' && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Este mensaje no requiere información adicional
          </p>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="flex gap-2 pt-4 border-t">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar Mensaje
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isSubmitting}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Limpiar
        </Button>
      </div>
    </form>
  );
}