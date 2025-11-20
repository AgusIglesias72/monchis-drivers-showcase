// components/admin/comunicacion/BotStatusIndicator.tsx
'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, RefreshCw, Smartphone, Clock, LogOut, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { whatsappMultiBotService } from '@/lib/services/whatsapp-multi-bot.service';
import { getBotConfig, getBotUrl, type BotId } from '@/lib/config/whatsapp-bots.config';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface BotStatusIndicatorProps {
  botId: BotId;
}

export function BotStatusIndicator({ botId }: BotStatusIndicatorProps) {
  const [botStatus, setBotStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [initTimeout, setInitTimeout] = useState(false);

  const botConfig = getBotConfig(botId);
  const botUrl = getBotUrl(botId);

  const checkBotStatus = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);

    if (!botUrl) {
      setBotStatus({
        botId,
        status: 'error',
        error: `URL del bot no configurada. Verifica ${botConfig?.urlKey} en .env.local`,
      });
      setIsLoading(false);
      return;
    }

    try {
      const status = await whatsappMultiBotService.getBotStatus(botId);
      setBotStatus(status);
    } catch (error) {
      console.error('Error checking bot status:', error);
      setBotStatus({
        botId,
        status: 'error',
        error: 'Error al conectar con el bot',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkBotStatus(false);
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await whatsappMultiBotService.logoutBot(botId);
      if (result.success) {
        // Esperar 3 segundos antes de refrescar para dar tiempo al reinicio
        await new Promise(resolve => setTimeout(resolve, 3000));
        await checkBotStatus();
      } else {
        console.error('Error al cerrar sesión:', result.error);
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Polling automático
  useEffect(() => {
    checkBotStatus();
    const interval = setInterval(() => checkBotStatus(false), 10000);
    return () => clearInterval(interval);
  }, [botId]);

  // Timeout para estado "initializing"
  useEffect(() => {
    if (botStatus?.status === 'initializing') {
      const timer = setTimeout(() => {
        setInitTimeout(true);
      }, 90000); // 90 segundos

      return () => clearTimeout(timer);
    } else {
      setInitTimeout(false);
    }
  }, [botStatus?.status]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Verificando estado del bot...</span>
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
      case 'disconnected':
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
        return <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />;
      case 'disconnected':
        return <Smartphone className="h-5 w-5 text-blue-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (botStatus.status) {
      case 'connected':
        return 'Conectado';
      case 'initializing':
        return 'Inicializando...';
      case 'disconnected':
        return 'Esperando Escaneo';
      case 'error':
        return 'Error de Conexión';
      default:
        return 'Estado Desconocido';
    }
  };

  return (
    <Card
      className={
        botStatus.status === 'connected'
          ? 'border-green-200 dark:border-green-800'
          : botStatus.status === 'error'
          ? 'border-red-200 dark:border-red-800'
          : ''
      }
    >
      <CardContent className="py-4">
        {/* Header con estado */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{botConfig?.icon}</span>
                <Badge className={getStatusColor()}>{getStatusText()}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{botConfig?.name}</p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Contenido según estado */}
        {botStatus.status === 'connected' && botStatus.connectionInfo ? (
          /* Bot Conectado */
          <div className="pt-4 border-t space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Cuenta</p>
                <p className="font-medium truncate">{botStatus.connectionInfo.displayName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Número</p>
                <p className="font-medium font-mono text-xs">+{botStatus.connectionInfo.phoneNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plataforma</p>
                <p className="font-medium capitalize">{botStatus.connectionInfo.platform}</p>
              </div>
            </div>

            {/* Botón de Logout */}
            <div className="pt-3 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full" disabled={isLoggingOut}>
                    {isLoggingOut ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cerrando sesión...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        Cerrar Sesión
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      ¿Cerrar sesión de {botConfig?.name}?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>
                        Esta acción eliminará la sesión de WhatsApp. Los mensajes automáticos dejarán de
                        funcionar hasta que vuelvas a conectar.
                      </p>
                      <p className="font-medium text-foreground">
                        Tendrás que escanear un nuevo código QR para reconectar.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Nota: El proceso puede tardar 10-30 segundos en completarse.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
                      Sí, cerrar sesión
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : botStatus.qr ? (
          /* QR Disponible */
          <div className="pt-4 border-t space-y-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Escanea el código QR con WhatsApp para conectar</p>

              <div className="bg-white p-4 rounded-lg inline-block border">
                <QRCodeSVG value={botStatus.qr} size={200} level="H" includeMargin={true} />
              </div>

              {/* Timestamp */}
              {botStatus.generatedAt && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    Generado{' '}
                    {formatDistanceToNow(new Date(botStatus.generatedAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </div>
              )}

              <Alert className="text-left">
                <Smartphone className="h-4 w-4" />
                <AlertTitle className="text-sm">¿Cómo escanear?</AlertTitle>
                <AlertDescription className="text-xs space-y-1">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Abre WhatsApp en tu teléfono</li>
                    <li>Ve a Configuración → Dispositivos vinculados</li>
                    <li>Toca &quot;Vincular un dispositivo&quot;</li>
                    <li>Escanea este código QR</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        ) : botStatus.status === 'initializing' ? (
          /* Inicializando */
          <div className="pt-4 border-t text-center py-6 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
            <div>
              <p className="text-sm text-muted-foreground">Inicializando bot...</p>
              <p className="text-xs text-muted-foreground mt-1">Puede tomar 30-90 segundos</p>
            </div>

            {/* Timeout Warning */}
            {initTimeout && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-sm">El bot está tardando más de lo esperado</AlertTitle>
                <AlertDescription className="text-xs">
                  <p className="mb-2">Posibles soluciones:</p>
                  <ul className="list-disc list-inside space-y-1 text-left">
                    <li>Refrescar la página (F5)</li>
                    <li>Verificar que el servidor del bot esté corriendo</li>
                    <li>Revisar los logs del backend</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          /* Error */
          <div className="pt-4 border-t">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error de Conexión</AlertTitle>
              <AlertDescription className="text-sm space-y-2">
                <p>{botStatus.error || 'No se pudo conectar con el bot'}</p>
                {botUrl && (
                  <p className="text-xs font-mono mt-2 p-2 bg-red-100 dark:bg-red-950 rounded">
                    URL: {botUrl}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}