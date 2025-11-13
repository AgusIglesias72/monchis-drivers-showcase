// components/admin/comunicacion/RecentMessagesList.tsx
'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface RecentMessagesListProps {
  refreshTrigger?: number;
}

export function RecentMessagesList({ refreshTrigger }: RecentMessagesListProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMessages = async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await fetch('/api/whatsapp/recent?limit=20');
      
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
  };

  useEffect(() => {
    loadMessages();
  }, [refreshTrigger]);

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
    switch (type) {
      case 'APPLICATION_RECEIVED':
        return 'Postulación Recibida';
      case 'FORM_INCOMPLETE':
        return 'Formulario Incompleto';
      case 'CUSTOM':
        return 'Mensaje Personalizado';
      case 'WELCOME':
        return 'Bienvenida';
      case 'ONBOARDING_REMINDER':
        return 'Onboarding';
      case 'CAPACITATION_REMINDER':
        return 'Capacitación';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'APPLICATION_RECEIVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'FORM_INCOMPLETE':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'CUSTOM':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'WELCOME':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'ONBOARDING_REMINDER':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'CAPACITATION_REMINDER':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
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
            Últimos {messages.length} mensajes enviados
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadMessages(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Lista de mensajes */}
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            No hay mensajes enviados aún
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
                    <p className="font-medium text-sm truncate">
                      {message.recipientName}
                    </p>
                    <Badge variant="outline" className={`text-xs ${getTypeColor(message.messageType)}`}>
                      {getTypeLabel(message.messageType)}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {message.recipientPhone}
                  </p>
                  
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
                    <p className="text-xs text-muted-foreground mt-1">
                      {message.responseTimeMs}ms
                    </p>
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