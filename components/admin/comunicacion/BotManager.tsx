// components/admin/comunicacion/BotManager.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Smartphone,
  User,
  Phone,
  Monitor,
  LogOut,
  AlertTriangle,
  Wifi,
  WifiOff,
  Clock,
} from 'lucide-react';
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
import { whatsappMultiBotService, type BotStatusResponse } from '@/lib/services/whatsapp-multi-bot.service';
import { getBotConfig } from '@/lib/config/whatsapp-bots.config';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface BotManagerProps {
  botId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function BotManager({ botId, autoRefresh = true, refreshInterval = 5000 }: BotManagerProps) {
  const [botStatus, setBotStatus] = useState<BotStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const botConfig = getBotConfig(botId);

  const fetchBotStatus = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const status = await whatsappMultiBotService.getBotStatus(botId as any);
      setBotStatus(status);
    } catch (error) {
      console.error('Error fetching bot status:', error);
      setBotStatus({
        botId,
        status: 'error',
        error: 'Error al obtener estado del bot',
      });
    } finally {
      setIsLoading(false);
    }
  }, [botId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchBotStatus(false);
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await whatsappMultiBotService.logoutBot(botId as any);
      if (result.success) {
        await fetchBotStatus();
      } else {
        console.error('Error al cerrar sesión:', result.error);
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    fetchBotStatus();
  }, [fetchBotStatus]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchBotStatus(false);
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchBotStatus]);

  if (!botConfig) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Configuración de bot no encontrada</AlertDescription>
      </Alert>
    );
  }

  const formatPhoneDisplay = (phone: string) => {
    if (!phone) return '';
    if (phone.startsWith('549')) {
      return `+54 9 ${phone.slice(3, 5)} ${phone.slice(5, 9)}-${phone.slice(9)}`;
    }
    if (phone.startsWith('595')) {
      return `+595 ${phone.slice(3, 6)} ${phone.slice(6)}`;
    }
    return `+${phone.slice(0, 2)} ${phone.slice(2)}`;
  };

  const getStatusBadge = () => {
    if (!botStatus) return null;

    const variants = {
      connected: {
        variant: 'default' as const,
        label: 'Conectado',
        icon: CheckCircle2,
        className: 'bg-green-600 hover:bg-green-700',
      },
      disconnected: {
        variant: 'secondary' as const,
        label: 'Desconectado',
        icon: WifiOff,
        className: '',
      },
      initializing: {
        variant: 'outline' as const,
        label: 'Inicializando',
        icon: Loader2,
        className: 'border-yellow-500 text-yellow-700',
      },
      error: {
        variant: 'destructive' as const,
        label: 'Error',
        icon: AlertCircle,
        className: '',
      },
    };

    const statusInfo = variants[botStatus.status] || variants.error;
    const Icon = statusInfo.icon;

    return (
      <Badge variant={statusInfo.variant} className={`flex items-center gap-1 ${statusInfo.className}`}>
        <Icon className={`h-3 w-3 ${botStatus.status === 'initializing' ? 'animate-spin' : ''}`} />
        {statusInfo.label}
      </Badge>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Columna Principal - QR o Estado */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{botConfig.icon}</div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {botConfig.name}
                  {getStatusBadge()}
                </CardTitle>
                <CardDescription>{botConfig.description}</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : botStatus?.status === 'error' ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error de Conexión</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{botStatus.error || 'No se pudo conectar con el bot'}</p>
                <div className="mt-3 text-xs space-y-1">
                  <p className="font-semibold">Posibles causas:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>El servidor del bot no está corriendo</li>
                    <li>La URL del bot está mal configurada</li>
                    <li>Problemas de red o firewall</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          ) : botStatus?.status === 'connected' && botStatus.connectionInfo ? (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
              <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-900 dark:text-green-100">
                Bot Conectado y Listo
              </AlertTitle>
              <AlertDescription className="text-green-800 dark:text-green-200">
                El bot está conectado y puede enviar/recibir mensajes
              </AlertDescription>
            </Alert>
          ) : botStatus?.qr ? (
            <>
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-sm font-medium">
                  <Smartphone className="h-4 w-4" />
                  Escanea el código QR con WhatsApp
                </div>

                <div className="bg-white p-6 rounded-lg inline-block border-2 shadow-sm">
                  <QRCodeSVG value={botStatus.qr} size={256} level="H" includeMargin={true} />
                </div>

                {/* Timestamp del QR */}
                {(botStatus as any).generatedAt && (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Generado{' '}
                      {formatDistanceToNow(new Date((botStatus as any).generatedAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>
                )}

                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertTitle>¿Cómo escanear?</AlertTitle>
                  <AlertDescription className="text-left space-y-1">
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Abre WhatsApp en tu teléfono</li>
                      <li>Ve a Configuración → Dispositivos vinculados</li>
                      <li>Toca en &quot;Vincular un dispositivo&quot;</li>
                      <li>Escanea este código QR</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Esperando escaneo...</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Inicializando bot...</p>
                <p className="text-xs text-muted-foreground">Esto puede tomar 30-60 segundos</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Columna Lateral */}
      <div className="space-y-4">
        {botStatus?.status === 'connected' && botStatus.connectionInfo ? (
          /* Info de Conexión */
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información de Conexión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {/* Display Name */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Nombre de cuenta</p>
                    <p className="text-sm font-medium truncate">{botStatus.connectionInfo.displayName}</p>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Número</p>
                    <p className="text-sm font-medium font-mono">
                      {formatPhoneDisplay(botStatus.connectionInfo.phoneNumber)}
                    </p>
                  </div>
                </div>

                {/* Platform */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                    <Monitor className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Plataforma</p>
                    <p className="text-sm font-medium capitalize">{botStatus.connectionInfo.platform}</p>
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <div className="pt-4 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="w-full" disabled={isLoggingOut}>
                      {isLoggingOut ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Cerrando...
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
                        ¿Cerrar sesión de {botConfig.name}?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>
                          Esta acción desconectará el bot. Los mensajes automáticos dejarán de funcionar
                          hasta que vuelvas a conectar.
                        </p>
                        <p className="font-medium text-foreground">
                          Tendrás que escanear un nuevo código QR para reconectar.
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleLogout}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Sí, cerrar sesión
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Info del Bot cuando no está conectado */
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Función principal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{botConfig.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Server Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información técnica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground">Servidor:</span>
                <p className="font-mono text-xs mt-1 break-all">
                  {process.env.NEXT_PUBLIC_WHATSAPP_BOT_ADQUISICION_URL || 'No configurado'}
                </p>
              </div>
              <div className="pt-2 border-t">
                <span className="text-muted-foreground">Bot ID:</span>
                <p className="font-mono text-xs mt-1">
                  {botConfig.id}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}