// components/admin/comunicacion/WhatsAppQRScanner.tsx
'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, RefreshCw, Smartphone } from 'lucide-react';

interface QRStatusResponse {
  status: 'initializing' | 'qr_available' | 'connected' | 'error';
  connected: boolean;
  qr: string | null;
  message: string;
  generatedAt?: string;
  timestamp: string;
}

interface WhatsAppQRScannerProps {
  botUrl?: string;
}

export default function WhatsAppQRScanner({ botUrl }: WhatsAppQRScannerProps) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'initializing' | 'qr_available' | 'connected' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Conectando...');
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const apiUrl = botUrl || process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL || '';

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
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                El bot está listo para enviar y recibir mensajes
              </p>
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