// components/admin/comunicacion/BotStatusIndicator.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface BotStatus {
  status: 'connected' | 'initializing' | 'qr_available' | 'error';
  connected: boolean;
  message: string;
  connectionInfo?: {
    phoneNumber: string;
    displayName: string;
    platform: string;
  };
}

export function BotStatusIndicator() {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkBotStatus = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL}/qr-status`
      );
      
      if (response.ok) {
        const data = await response.json();
        setBotStatus(data);
      } else {
        setBotStatus({
          status: 'error',
          connected: false,
          message: 'Error al conectar con el bot',
        });
      }
    } catch (error) {
      console.error('Error checking bot status:', error);
      setBotStatus({
        status: 'error',
        connected: false,
        message: 'No se pudo conectar con el servidor del bot',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkBotStatus();
    
    // Poll cada 10 segundos
    const interval = setInterval(checkBotStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Verificando estado del bot...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!botStatus) {
    return null;
  }

  const getStatusColor = () => {
    switch (botStatus.status) {
      case 'connected':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'initializing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'qr_available':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (botStatus.status) {
      case 'connected':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'initializing':
      case 'qr_available':
        return <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (botStatus.status) {
      case 'connected':
        return 'WhatsApp Conectado';
      case 'initializing':
        return 'Inicializando...';
      case 'qr_available':
        return 'Esperando Escaneo de QR';
      case 'error':
        return 'Error de Conexión';
      default:
        return 'Estado Desconocido';
    }
  };

  return (
    <Card className={
      botStatus.status === 'connected' 
        ? 'border-green-200 dark:border-green-800' 
        : botStatus.status === 'error'
        ? 'border-red-200 dark:border-red-800'
        : ''
    }>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          {/* Status */}
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <Badge className={getStatusColor()}>
                {getStatusText()}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                {botStatus.message}
              </p>
            </div>
          </div>

          {/* Action Button */}
          {botStatus.status !== 'connected' && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/comunicaciones">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Conexión
              </Link>
            </Button>
          )}
        </div>

        {/* Connection Info (si está conectado) */}
        {botStatus.status === 'connected' && botStatus.connectionInfo && (
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Cuenta</p>
              <p className="font-medium">{botStatus.connectionInfo.displayName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Teléfono</p>
              <p className="font-medium font-mono text-xs">
                +{botStatus.connectionInfo.phoneNumber}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plataforma</p>
              <p className="font-medium capitalize">
                {botStatus.connectionInfo.platform}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}