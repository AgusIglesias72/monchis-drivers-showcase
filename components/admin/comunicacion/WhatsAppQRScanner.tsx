// components/admin/comunicacion/WhatsAppQRScanner.tsx
'use client';

import { useEffect, useState } from 'react';
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
  AlertTriangle
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
} from "@/components/ui/alert-dialog";

interface ConnectionInfo {
  phoneNumber: string;
  displayName: string;
  platform: string;
}

interface QRStatusResponse {
  status: 'initializing' | 'qr_available' | 'connected' | 'error';
  connected: boolean;
  qr: string | null;
  message: string;
  generatedAt?: string;
  timestamp: string;
  connectionInfo?: ConnectionInfo;
}

interface WhatsAppQRScannerProps {
  botUrl?: string;
}

export default function WhatsAppQRScanner({ botUrl }: WhatsAppQRScannerProps) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'initializing' | 'qr_available' | 'connected' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Conectando...');
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const apiUrl = botUrl || process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL || '';
  // NOTA: la API key del bot NO es accesible en el cliente. Las operaciones
  // que la requieren (ej. /logout) van por /api/whatsapp/bot-proxy.

  useEffect(() => {
    if (!apiUrl) {
      setStatus('error');
      setMessage('URL del bot no configurada. Configura NEXT_PUBLIC_WHATSAPP_BOT_URL en tu .env.local');
      return;
    }

    let interval: NodeJS.Timeout;

    const checkQRStatus = async () => {
      try {
        const response = await fetch(`${apiUrl}/qr-status`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: QRStatusResponse = await response.json();

        setStatus(data.status);
        setMessage(data.message);

        if (data.qr) {
          setQrData(data.qr);
          setGeneratedAt(data.generatedAt || null);
        } else {
          setQrData(null);
          setGeneratedAt(null);
        }

        // Guardar información de conexión si está disponible
        if (data.connectionInfo) {
          setConnectionInfo(data.connectionInfo);
        }

        // Si ya está conectado, detener el polling
        if (data.status === 'connected' && interval) {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error checking QR status:', error);
        setStatus('error');
        setMessage(`Error conectando con el bot: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    };

    // Consultar inmediatamente
    checkQRStatus();

    // Consultar cada 3 segundos
    interval = setInterval(checkQRStatus, 3000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [apiUrl]);

  // Función para hacer logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      const response = await fetch('/api/whatsapp/bot-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: '/logout',
          method: 'POST',
          botUrl: apiUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cerrar sesión');
      }

      // Reiniciar estados locales
      setStatus('initializing');
      setMessage('Cerrando sesión...');
      setConnectionInfo(null);
      setQrData(null);

      // Recargar la página después de un momento para iniciar nuevo polling
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Error durante logout:', error);
      alert(`Error al cerrar sesión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Formatear número de teléfono para mostrar
  const formatPhoneDisplay = (phone: string) => {
    if (!phone) return 'No disponible';
    
    // Si es argentino (54), formatear como +54 9 11 xxxx-xxxx
    if (phone.startsWith('54')) {
      const areaCode = phone.substring(2, 4);
      const firstPart = phone.substring(4, 8);
      const secondPart = phone.substring(8);
      return `+54 9 ${areaCode} ${firstPart}-${secondPart}`;
    }
    
    // Para otros países, formato genérico
    return `+${phone}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          WhatsApp Bot - Conexión
        </CardTitle>
        <CardDescription>
          Conecta tu cuenta de WhatsApp para habilitar el bot
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estado: Conectado */}
        {status === 'connected' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <Badge variant="default" className="bg-green-600 hover:bg-green-700 mb-2">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  WhatsApp Conectado
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">{message}</p>
              </div>
            </div>

            {/* Información de Conexión */}
            {connectionInfo && (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Detalles de la Conexión
                </h4>
                
                <div className="space-y-3">
                  {/* Nombre */}
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Nombre de cuenta</p>
                      <p className="text-sm font-medium truncate">
                        {connectionInfo.displayName}
                      </p>
                    </div>
                  </div>

                  {/* Teléfono */}
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Número</p>
                      <p className="text-sm font-medium font-mono">
                        {formatPhoneDisplay(connectionInfo.phoneNumber)}
                      </p>
                    </div>
                  </div>

                  {/* Plataforma */}
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      <Monitor className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Plataforma</p>
                      <p className="text-sm font-medium capitalize">
                        {connectionInfo.platform}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  El bot está listo para enviar y recibir mensajes
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => window.location.reload()}
                    variant="ghost"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                  </Button>
                  
                  {/* Diálogo de confirmación de logout */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isLoggingOut}
                      >
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
                          ¿Cerrar sesión de WhatsApp?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>
                            Esta acción desconectará el bot de WhatsApp. Los mensajes automáticos 
                            dejarán de funcionar hasta que vuelvas a conectar.
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
              </div>
            </div>
          </div>
        )}

        {/* Estado: QR Disponible */}
        {status === 'qr_available' && qrData && (
          <div className="text-center space-y-4">
            <p className="text-sm font-medium">{message}</p>
            
            <div className="bg-background p-6 rounded-lg inline-block border-2">
              <QRCodeSVG 
                value={qrData} 
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>

            {generatedAt && (
              <p className="text-xs text-muted-foreground">
                Generado: {new Date(generatedAt).toLocaleTimeString('es-AR')}
              </p>
            )}

            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertTitle className="text-sm font-semibold">Pasos para vincular:</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal list-inside space-y-1 text-sm mt-2">
                  <li>Abre WhatsApp en tu teléfono</li>
                  <li>Ve a <strong>Configuración</strong> → <strong>Dispositivos vinculados</strong></li>
                  <li>Toca <strong>&quot;Vincular dispositivo&quot;</strong></li>
                  <li>Escanea este código QR</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-center text-sm text-muted-foreground pt-2">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span>Esperando escaneo...</span>
            </div>
          </div>
        )}

        {/* Estado: Inicializando */}
        {status === 'initializing' && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{message}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Esto puede tomar entre 30-60 segundos
              </p>
            </div>
          </div>
        )}

        {/* Estado: Cargando inicial */}
        {status === 'loading' && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Conectando con el servidor...</p>
          </div>
        )}

        {/* Estado: Error */}
        {status === 'error' && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-destructive/10 rounded-full">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <div>
              <Badge variant="destructive" className="mb-2">
                <AlertCircle className="h-3 w-3 mr-1" />
                Error de Conexión
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">{message}</p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="destructive"
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}