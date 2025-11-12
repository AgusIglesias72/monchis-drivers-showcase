// app/admin/comunicaciones/page.tsx
import { AdminHeader } from '@/components/admin/admin-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import WhatsAppQRScanner from '@/components/admin/comunicacion/WhatsAppQRScanner';
import { Info, CheckCircle2, Server, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ComunicacionesPage() {
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
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Comunicaciones</h1>
              <p className="text-muted-foreground mt-1">
                Gestión del bot de WhatsApp para Monchis Drivers
              </p>
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
                      formularios incompletos, recordatorios de onboarding, capacitaciones, etc.
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
                      Tipos de mensajes disponibles
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">Recordatorio de Onboarding</Badge>
                      <Badge variant="outline" className="text-xs">Formulario Incompleto</Badge>
                      <Badge variant="outline" className="text-xs">Mensaje de Bienvenida</Badge>
                      <Badge variant="outline" className="text-xs">Postulación Recibida</Badge>
                      <Badge variant="outline" className="text-xs">Recordatorio de Capacitación</Badge>
                    </div>
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