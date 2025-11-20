// components/admin/comunicacion/MessageTestForm.tsx
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Send, Info, CheckCircle2, AlertCircle, AlertTriangle, FileText, MessageSquare, Check } from 'lucide-react';
import {
  ACTIVE_MESSAGE_TYPES,
  FORM_STEPS,
  PHONE_EXAMPLES,
  VALIDATION_MESSAGES,
  getActiveMessageTypes,
  getFormSteps,
  requiresStep,
} from '@/lib/constants/whatsapp-messages';
import { getBotConfig, type BotId } from '@/lib/config/whatsapp-bots.config';

interface MessageTestFormProps {
  botId: BotId;
  onChange?: (data: any) => void;
  onMessageSent?: () => void;
}

type ResultType = 'success' | 'error' | 'warning';

export function MessageTestForm({ botId, onChange, onMessageSent }: MessageTestFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    type: ResultType;
    title: string;
    message: string;
  } | null>(null);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [step, setStep] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const botConfig = getBotConfig(botId);

  // Filtrar tipos de mensaje disponibles para este bot
  const availableMessageTypes = getActiveMessageTypes().filter((msgType) =>
    botConfig?.messageTypes.includes(msgType.value)
  );

  const notifyChange = (updates: any) => {
    const formData = {
      phone,
      name,
      type,
      step,
      customMessage,
      ...updates,
    };
    onChange?.(formData);
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
      const payload: any = {
        phone: phone.trim(),
        name: name.trim(),
        type: type,
        botId: botId, // ✅ Incluir botId
      };

      if (requiresStep(type)) {
        payload.step = step;
      }

      if (type === 'CUSTOM') {
        payload.customMessage = customMessage.trim();
      }

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.warning) {
          setResult({
            type: 'warning',
            title: 'Mensaje enviado con advertencia',
            message: data.warning,
          });
        } else {
          setResult({
            type: 'success',
            title: 'Mensaje enviado exitosamente',
            message: `Enviado usando ${botConfig?.name || 'bot'}`,
          });
        }

        setPhone('');
        setName('');
        setType('');
        setStep('');
        setCustomMessage('');
        notifyChange({
          phone: '',
          name: '',
          type: '',
          step: '',
          customMessage: '',
        });

        onMessageSent?.();
      } else {
        setResult({
          type: 'error',
          title: 'Error al enviar mensaje',
          message: data.error || 'No se pudo enviar el mensaje. Verifica la conexión del bot.',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setResult({
        type: 'error',
        title: 'Error de conexión',
        message: 'No se pudo conectar con el servidor. Intenta nuevamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedMessageType = type ? ACTIVE_MESSAGE_TYPES[type as keyof typeof ACTIVE_MESSAGE_TYPES] : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Phone Number */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="phone">Número de WhatsApp</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-2">Formato de teléfono:</p>
                <ul className="text-sm space-y-1">
                  {PHONE_EXAMPLES.map((example, i) => (
                    <li key={i}>• {example}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground mt-2">Sin espacios, guiones ni caracteres especiales</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="phone"
          type="text"
          placeholder="5950984039476"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          disabled={isLoading}
          className={errors.phone ? 'border-red-500' : ''}
        />
        {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del destinatario</Label>
        <Input
          id="name"
          type="text"
          placeholder="Juan Pérez"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          disabled={isLoading}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      {/* Message Type - Filtrado por bot */}
      <div className="space-y-3">
        <Label htmlFor="type" className="text-sm font-medium">
          Tipo de mensaje
        </Label>
        <Select value={type} onValueChange={handleTypeChange} disabled={isLoading}>
          <SelectTrigger className={`h-auto py-3 px-4 w-full cursor-pointer ${errors.type ? 'border-red-500' : ''}`}>
            {selectedMessageType ? (
              <div className="flex items-center gap-3 w-full cursor-pointer">
                  <MessageSquare className="h-5 w-5 text-primary" />
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="font-medium text-sm text-foreground">{selectedMessageType.label}</span>
                </div>
              </div>
            ) : (
              <SelectValue placeholder="Selecciona un tipo de mensaje" />
            )}
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            {availableMessageTypes.map((messageType) => (
              <SelectItem key={messageType.value} value={messageType.value} className="p-2 cursor-pointer">
                <div className="flex items-center gap-3 w-full">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="font-medium text-sm w-full">{messageType.label}</span>
                    <span className="text-xs text-muted-foreground line-clamp-2">{messageType.description}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {errors.type && (
          <p className="text-sm text-red-500 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            {errors.type}
          </p>
        )}
      </div>

      {/* Step */}
      {requiresStep(type) && (
        <div className="space-y-2">
          <Label htmlFor="step">Step del formulario</Label>
          <Select value={step} onValueChange={handleStepChange} disabled={isLoading}>
            <SelectTrigger className={`w-full cursor-pointer ${errors.step ? 'border-red-500' : ''}`}>
              <SelectValue placeholder="Selecciona el step incompleto" className="cursor-pointer py-2" />
            </SelectTrigger>
            <SelectContent>
              {getFormSteps().map((formStep) => (
                <SelectItem key={formStep.value} value={formStep.value} className="cursor-pointer h-[48px]">
                  <div className="flex items-center gap-3 w-full">
                      <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-sm">{formStep.label}</span>
                      <span className="text-xs text-muted-foreground">{formStep.description}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.step && <p className="text-sm text-red-500">{errors.step}</p>}
        </div>
      )}

      {/* Custom Message */}
      {type === 'CUSTOM' && (
        <div className="space-y-2">
          <Label htmlFor="customMessage">Mensaje personalizado</Label>
          <Textarea
            id="customMessage"
            placeholder="Escribe tu mensaje aquí..."
            value={customMessage}
            onChange={(e) => handleCustomMessageChange(e.target.value)}
            disabled={isLoading}
            rows={5}
            className={errors.customMessage ? 'border-red-500' : ''}
          />
          <div className="flex justify-between items-center">
            {errors.customMessage ? (
              <p className="text-sm text-red-500">{errors.customMessage}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{customMessage.length}/1000 caracteres</p>
            )}
          </div>
        </div>
      )}

      {/* Result Alert */}
      {result && (
        <Alert
          variant={result.type === 'error' ? 'destructive' : 'default'}
          className={
            result.type === 'success'
              ? 'border-green-500 bg-green-50 dark:bg-green-950/20 flex w-full'
              : result.type === 'warning'
              ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 flex w-full'
              : ''
          }
        >
          <div className="flex items-start gap-3 w-full">
            <div
              className={`mt-0.5 ${
                result.type === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : result.type === 'warning'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {result.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
              {result.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
              {result.type === 'error' && <AlertCircle className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <AlertTitle
                className={
                  result.type === 'success'
                    ? 'text-green-900 dark:text-green-100'
                    : result.type === 'warning'
                    ? 'text-yellow-900 dark:text-yellow-100'
                    : ''
                }
              >
                {result.title}
              </AlertTitle>
              <AlertDescription
                className={
                  result.type === 'success'
                    ? 'text-green-800 dark:text-green-200'
                    : result.type === 'warning'
                    ? 'text-yellow-800 dark:text-yellow-200'
                    : ''
                }
              >
                {result.message}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
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
    </form>
  );
}