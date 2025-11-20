// components/admin/comunicacion/BotSelector.tsx
'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getActiveBots, getBotConfig } from '@/lib/config/whatsapp-bots.config';

interface BotSelectorProps {
  value: string;
  onChange: (botId: string) => void;
  messageType?: string;
}

export function BotSelector({ value, onChange, messageType }: BotSelectorProps) {
  const activeBots = getActiveBots();

  // Filtrar bots que soportan el tipo de mensaje seleccionado
  const compatibleBots = messageType
    ? activeBots.filter((bot) => bot.messageTypes.includes(messageType))
    : activeBots;

  // Si el bot actual no es compatible, cambiar al primero compatible
  const currentBot = getBotConfig(value);
  if (messageType && currentBot && !currentBot.messageTypes.includes(messageType)) {
    if (compatibleBots.length > 0) {
      onChange(compatibleBots[0].id);
    }
  }

  return (
    <div className="space-y-2">
      <Label>Bot a utilizar</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona un bot" />
        </SelectTrigger>
        <SelectContent>
          {compatibleBots.map((bot) => (
            <SelectItem key={bot.id} value={bot.id}>
              <div className="flex items-center gap-2">
                <span>{bot.icon}</span>
                <span>{bot.name}</span>
                {messageType && bot.messageTypes.includes(messageType) && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Compatible
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentBot && (
        <p className="text-xs text-muted-foreground">
          {currentBot.description}
        </p>
      )}

      {messageType && compatibleBots.length === 0 && (
        <p className="text-xs text-destructive">
          No hay bots compatibles con este tipo de mensaje
        </p>
      )}

      {messageType && !currentBot?.messageTypes.includes(messageType) && (
        <p className="text-xs text-yellow-600">
          El bot seleccionado no soporta este tipo de mensaje
        </p>
      )}
    </div>
  );
}