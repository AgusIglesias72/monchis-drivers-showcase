// components/admin/comunicacion/ComunicacionesContent.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, TestTube2, ArrowRight, Send, Users, Zap, History, BarChart3, FileText } from 'lucide-react';
import Link from 'next/link';
import { BotManager } from './BotManager';

const WHATSAPP_BOT_ID = 'whatsapp-bot';

export function ComunicacionesContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Comunicaciones</h1>
        <p className="text-muted-foreground mt-1">
          Bot WhatsApp único corriendo en Railway. Acá gestionás plantillas, envíos y monitoreo.
        </p>
      </div>

      {/* Acciones destacadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 hover:border-emerald-500/50 transition-all cursor-pointer group">
          <Link href="/admin/plantillas-whatsapp" className="block">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                    <FileText className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Plantillas</CardTitle>
                    <CardDescription>
                      Editá el contenido de los mensajes automáticos
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-emerald-200">
                  Variables dinámicas
                </Badge>
                <Badge variant="outline" className="border-emerald-200">
                  Por key
                </Badge>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="border-2 hover:border-primary/50 transition-all cursor-pointer group">
          <Link href="/admin/comunicaciones/masivo" className="block">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Send className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Envío Masivo</CardTitle>
                    <CardDescription>
                      Mensajes personalizados a múltiples contactos
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  Múltiples contactos
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3" />
                  Variables
                </Badge>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="border-2 hover:border-blue-500/50 transition-all cursor-pointer group">
          <Link href={`/admin/comunicaciones/pruebas?bot=${WHATSAPP_BOT_ID}`} className="block">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                    <TestTube2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Pruebas</CardTitle>
                    <CardDescription>
                      Probá mensajes individuales antes de mandarlos
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-blue-200">
                  Testing rápido
                </Badge>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="border-2 hover:border-purple-500/50 transition-all cursor-pointer group">
          <Link href="/admin/comunicaciones/historial" className="block">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                    <History className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Historial</CardTitle>
                    <CardDescription>
                      Mensajes enviados y estadísticas
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-600 transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-purple-200 gap-1">
                  <BarChart3 className="h-3 w-3" />
                  KPIs
                </Badge>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Estado del bot (único) */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Estado del bot</h2>
        <BotManager botId={WHATSAPP_BOT_ID} />
      </div>

      {/* Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Cómo funciona</p>
              <p className="text-sm text-muted-foreground">
                El contenido de cada mensaje se define en <strong>Plantillas</strong> y se referencia por su <code>key</code>.
                Los triggers automáticos (form completado, documentos aprobados, recordatorios del cron) levantan el template,
                interpolan variables como <code>{`{nombre}`}</code> y envían por el bot.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
