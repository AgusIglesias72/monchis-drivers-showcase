// components/admin/comunicacion/MessageTestForm-multibot.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { BotSelector } from './BotSelector';
import { whatsappMultiBotService } from '@/lib/services/whatsapp-multi-bot.service';
import {
  ACTIVE_MESSAGE_TYPES,
  FORM_STEPS,
  PHONE_EXAMPLES,
  VALIDATION_MESSAGES,
  getActiveMessageTypes,
  getFormSteps,
  requiresStep,
} from '@/lib/constants/whatsapp-messages';
import { getActiveBots } from '@/lib/config/whatsapp-bots.config';

interface MessageTestFormProps {
  onChange?: (data: any) => void;
  onMessageSent?: () => void;
}

type ResultType = 'success' | 'error' | 'warning';

export function MessageTestForm({ onChange, onMessageSent }: MessageTestFormProps) {
  const activeBots = getActiveBots();
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    type: ResultType;
    title: string;
    message: string;
  } | null>(null);

  // Form state
  const [botId, setBotId] = useState(activeBots[0]?.id || '');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [step, setStep] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const notifyChange = (updates: any) => {
    const formData = {
      botId,
      phone,
      name,
      type,
      step,
      customMessage,
      ...updates,
    };
    onChange?.(formData);
  };

  const handleBotChange = (value: string) => {
    setBotId(value);
    notifyChange({ botId: value });
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    notifyChange({ phone: value });
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: '' }));
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    notifyChange({ name: value });
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: '' }));
    }
  };

  const handleTypeChange = (value: string) => {
    setType(value);
    setStep('');
    setCustomMessage('');
    notifyChange({ type: value, step: '', customMessage: '' });
    if (errors.type) {
      setErrors((prev) => ({ ...prev, type: '' }));
    }
  };

  const handleStepChange = (value: string) => {
    setStep(value);
    notifyChange({ step: value });
    if (errors.step) {
      setErrors((prev) => ({ ...prev, step: '' }));
    }
  };

  const handleCustomMessageChange = (value: string) => {
    setCustomMessage(value);
    notifyChange({ customMessage: value });
    if (errors.customMessage) {
      setErrors((prev) => ({ ...prev, customMessage: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!botId) {
      newErrors.botId = 'Debes seleccionar un bot';
    }

    if (!phone.trim()) {
      newErrors.phone = VALIDATION_MESSAGES.phone.required;
    } else if (!/^\d+$/.test(phone)) {
      newErrors.phone = VALIDATION_MESSAGES.phone.invalid;
    }

    if (!name.trim()) {
      newErrors.name = VALIDATION_MESSAGES.name.required;
    } else if (name.trim().length < 2) {
      newErrors.name = VALIDATION_MESSAGES.name.minLength;
    }

    if (!type) {
      newErrors.type = VALIDATION_MESSAGES.type.required;
    }

    if (requiresStep(type) && !step) {
      newErrors.step = VALIDATION_MESSAGES.step.required;
    }

    if (type === 'CUSTOM') {
      if (!customMessage.trim()) {
        newErrors.customMessage = VALIDATION_MESSAGES.customMessage.required;
      } else if (customMessage.trim().length < 10) {
        newErrors.customMessage = VALIDATION_MESSAGES.customMessage.minLength;
      } else if (customMessage.length > 1000) {
        newErrors.customMessage = VALIDATION_MESSAGES.customMessage.maxLength;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      let response;

      if (type === 'CUSTOM' && customMessage) {
        // Enviar mensaje personalizado
        response = await whatsappMultiBotService.sendMessage(botId as any, {
          phone,
          message: customMessage,
          type: 'custom',
        });
      } else {
        // Enviar mensaje contextual
        response = await whatsappMultiBotService.sendContextualMessage(botId as any, {
          phone,
          name,
          type: type.toLowerCase(),
          step,
        });
      }

      if (response.success) {
        setResult({
          type: 'success',
          title: '¡Mensaje enviado!',
          message: `El mensaje se envió correctamente a ${phone}`,
        });

        // Reset form
        setPhone('');
        setName('');
        setType('');
        setStep('');
        setCustomMessage('');
        setErrors({});

        // Notify parent
        onMessageSent?.();
      } else {
        setResult({
          type: 'error',
          title: 'Error al enviar',
          message: response.error || 'Error desconocido',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setResult({
        type: 'error',
        title: 'Error inesperado',
        message: error instanceof Error ? error.message : 'Error al enviar el mensaje',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedMessageType = getActiveMessageTypes().find(
    (mt) => mt.value === type
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selector de Bot */}
      <BotSelector
        value={botId}
        onChange={handleBotChange}
        messageType={type}
      />
      {errors.botId && (
        <p className="text-sm text-destructive mt-1">{errors.botId}</p>
      )}

      {/* Teléfono */}
      <div className="space-y-2">
        <Label htmlFor="phone">
          Número de teléfono <span className="text-destructive">*</span>
        </Label>
        <Input
          id="phone"
          type="text"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder="5491158165977"
          className={errors.phone ? 'border-destructive' : ''}
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Ejemplos: {PHONE_EXAMPLES.join(' | ')}
        </p>
      </div>

      {/* Nombre */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Nombre del destinatario <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Juan Pérez"
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      {/* Tipo de Mensaje */}
      <div className="space-y-2">
        <Label htmlFor="type">
          Tipo de mensaje <span className="text-destructive">*</span>
        </Label>
        <Select value={type} onValueChange={handleTypeChange}>
          <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
            <SelectValue placeholder="Selecciona un tipo" />
          </SelectTrigger>
          <SelectContent>
            {getActiveMessageTypes().map((messageType) => (
              <SelectItem key={messageType.value} value={messageType.value}>
                <div className="flex flex-col">
                  <span>{messageType.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {messageType.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type}</p>
        )}
        {selectedMessageType && (
          <p className="text-xs text-muted-foreground">
            {selectedMessageType.description}
          </p>
        )}
      </div>

      {/* Step (solo para FORM_INCOMPLETE) */}
      {requiresStep(type) && (
        <div className="space-y-2">
          <Label htmlFor="step">
            Step del formulario <span className="text-destructive">*</span>
          </Label>
          <Select value={step} onValueChange={handleStepChange}>
            <SelectTrigger className={errors.step ? 'border-destructive' : ''}>
              <SelectValue placeholder="Selecciona un step" />
            </SelectTrigger>
            <SelectContent>
              {getFormSteps().map((formStep) => (
                <SelectItem key={formStep.value} value={formStep.value}>
                  <div className="flex flex-col">
                    <span>{formStep.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {formStep.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.step && (
            <p className="text-sm text-destructive">{errors.step}</p>
          )}
        </div>
      )}

      {/* Custom Message (solo para CUSTOM) */}
      {type === 'CUSTOM' && (
        <div className="space-y-2">
          <Label htmlFor="customMessage">
            Mensaje personalizado <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="customMessage"
            value={customMessage}
            onChange={(e) => handleCustomMessageChange(e.target.value)}
            placeholder="Escribe tu mensaje personalizado aquí..."
            rows={5}
            className={errors.customMessage ? 'border-destructive' : ''}
          />
          {errors.customMessage && (
            <p className="text-sm text-destructive">{errors.customMessage}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {customMessage.length} / 1000 caracteres
          </p>
        </div>
      )}

      {/* Result Alert */}
      {result && (
        <Alert
          variant={result.type === 'error' ? 'destructive' : 'default'}
          className={
            result.type === 'success'
              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
              : ''
          }
        >
          {result.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle
            className={
              result.type === 'success'
                ? 'text-green-900 dark:text-green-100'
                : ''
            }
          >
            {result.title}
          </AlertTitle>
          <AlertDescription
            className={
              result.type === 'success'
                ? 'text-green-800 dark:text-green-200'
                : ''
            }
          >
            {result.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Enviar Mensaje
          </>
        )}
      </Button>
    </form>
  );
}