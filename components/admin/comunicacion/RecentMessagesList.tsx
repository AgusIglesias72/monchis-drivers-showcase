// components/admin/comunicacion/RecentMessagesList.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { type BotId } from '@/lib/config/whatsapp-bots.config';

interface RecentMessagesListProps {
  refreshTrigger?: number;
  botId?: BotId; // ✅ Filtrar por bot
}

export function RecentMessagesList({ refreshTrigger, botId }: RecentMessagesListProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMessages = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // ✅ Agregar filtro por botId si está presente
      const url = botId 
        ? `/api/whatsapp/recent?limit=20&botId=${botId}`
        : '/api/whatsapp/recent?limit=20';
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error al cargar mensajes');
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [botId]);

  useEffect(() => {
    loadMessages();
  }, [refreshTrigger, botId, loadMessages]); // ✅ Recargar cuando cambie el bot

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
      case 'READ':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'SENDING':
      case 'QUEUED':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      APPLICATION_RECEIVED: 'Postulación Recibida',
      FORM_INCOMPLETE: 'Formulario Incompleto',
      CUSTOM: 'Mensaje Personalizado',
      WELCOME: 'Bienvenida',
      ONBOARDING_REMINDER: 'Onboarding',
      CAPACITATION_REMINDER: 'Capacitación',
      REACTIVATION_REMINDER: 'Recordatorio Reactivación',
      INCENTIVE_NOTIFICATION: 'Incentivo',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      APPLICATION_RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      FORM_INCOMPLETE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      CUSTOM: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      WELCOME: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      ONBOARDING_REMINDER: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      CAPACITATION_REMINDER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      REACTIVATION_REMINDER: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      INCENTIVE_NOTIFICATION: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Mensajes Recientes</h3>
          <p className="text-sm text-muted-foreground">
            {messages.length > 0 
              ? `Últimos ${messages.length} mensajes enviados${botId ? ' con este bot' : ''}`
              : 'No hay mensajes aún'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadMessages(true)} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Lista de mensajes */}
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {botId ? 'No hay mensajes enviados con este bot aún' : 'No hay mensajes enviados aún'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {getStatusIcon(message.status)}
                    <p className="font-medium text-sm truncate">{message.recipientName}</p>
                    <Badge variant="outline" className={`text-xs ${getTypeColor(message.messageType)}`}>
                      {getTypeLabel(message.messageType)}
                    </Badge>
                    {/* ✅ Mostrar bot usado si está disponible */}
                    {message.botId && (
                      <Badge variant="secondary" className="text-xs">
                        {message.botId === 'bot-adquisicion-prod' ? '👥' : '🔄'}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">{message.recipientPhone}</p>

                  {message.formDriver && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Driver: {message.formDriver.fullName}
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {message.message.substring(0, 100)}
                    {message.message.length > 100 && '...'}
                  </p>
                </div>

                {/* Timestamp */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.sentAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                  {message.responseTimeMs && (
                    <p className="text-xs text-muted-foreground mt-1">{message.responseTimeMs}ms</p>
                  )}
                </div>
              </div>

              {/* Error message si fallo */}
              {message.status === 'FAILED' && message.errorMessage && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                  Error: {message.errorMessage}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}