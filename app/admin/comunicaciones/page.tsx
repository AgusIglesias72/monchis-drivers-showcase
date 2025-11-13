// app/admin/comunicaciones/page.tsx
import { AdminHeader } from '@/components/admin/admin-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WhatsAppQRScanner from '@/components/admin/comunicacion/WhatsAppQRScanner';
import { Info, CheckCircle2, Server, MessageSquare, TestTube2, ArrowRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getActiveMessageTypes } from '@/lib/constants/whatsapp-messages';

export default function ComunicacionesPage() {
  const activeMessageTypes = getActiveMessageTypes();

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Comunicaciones" }
        ]}
      />
      
      <div className="flex flex-1 flex-col container mx-auto">
        <div className="flex-1 p-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Comunicaciones</h1>
                <p className="text-muted-foreground mt-1">
                  Gestión del bot de WhatsApp para Monchis Drivers
                </p>
              </div>
              
              {/* Botón de Pruebas */}
              <Button asChild>
                <Link href="/admin/comunicaciones/pruebas">
                  <TestTube2 className="h-4 w-4 mr-2" />
                  Panel de Pruebas
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QR Scanner */}
            <WhatsAppQRScanner />

            {/* Info Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Información
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      ¿Qué hace este bot?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Envía mensajes automáticos a postulantes según diferentes eventos:
                      confirmación de postulación recibida, recordatorios de formularios incompletos
                      y mensajes personalizados.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      Mensajes automáticos
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      El sistema revisa automáticamente las postulaciones cada 6 horas (8am, 12pm, 4pm, 8pm)
                      y envía recordatorios a quienes no completaron el formulario.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ¿Necesito escanear el QR siempre?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      No, solo la primera vez. Una vez conectado, la sesión persiste
                      y el bot funcionará 24/7.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Server className="h-4 w-4 text-yellow-600" />
                      Estado del servidor
                    </h3>
                    <div className="mt-1">
                      <p className="text-xs text-muted-foreground mb-1">URL:</p>
                      <code className="bg-muted px-2 py-1 rounded text-xs break-all block">
                        {process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL || 'No configurada'}
                      </code>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">
                      Tipos de mensajes activos
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {activeMessageTypes.map((messageType) => (
                        <Badge
                          key={messageType.value}
                          variant="outline"
                          className="text-xs"
                        >
                          {messageType.label}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Los mensajes de onboarding y capacitación estarán disponibles próximamente.
                    </p>
                  </div>

                  {/* Nuevo: Link rápido a pruebas */}
                  <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/admin/comunicaciones/pruebas">
                        <TestTube2 className="h-4 w-4 mr-2" />
                        Probar envío de mensajes
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}