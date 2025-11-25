// components/admin/comunicacion/ComunicacionesContent.tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Info, TestTube2, ArrowRight, Send, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { BotManager } from './BotManager';
import { getActiveBots } from '@/lib/config/whatsapp-bots.config';

export function ComunicacionesContent() {
  const activeBots = getActiveBots();
  const [activeTab, setActiveTab] = useState(activeBots[0]?.id || '');

  const currentBot = activeBots.find((bot) => bot.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Comunicaciones WhatsApp</h1>
        <p className="text-muted-foreground mt-1">
          Gestión de múltiples bots para diferentes casos de uso
        </p>
      </div>

      {/* Acciones destacadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      Envía mensajes personalizados a múltiples contactos
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
                  Hasta 100 contactos
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3" />
                  Variables dinámicas
                </Badge>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="border-2 hover:border-blue-500/50 transition-all cursor-pointer group">
          <Link href={`/admin/comunicaciones/pruebas?bot=${activeTab}`} className="block">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                    <TestTube2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Panel de Pruebas</CardTitle>
                    <CardDescription>
                      Prueba mensajes individuales y valida bots
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
                <Badge variant="outline" className="border-blue-200">
                  Todos los tipos
                </Badge>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Tabs de bots */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="inline-flex h-auto p-1 bg-muted/50 rounded-lg">
          {activeBots.map((bot) => (
            <TabsTrigger
              key={bot.id}
              value={bot.id}
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md px-6 py-3 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{bot.icon}</span>
                <div className="text-left">
                  <div className="font-semibold text-sm">{bot.name}</div>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {bot.messageTypes.length} tipos de mensaje
                  </div>
                </div>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Contenido de cada bot */}
        {activeBots.map((bot) => (
          <TabsContent key={bot.id} value={bot.id} className="space-y-6 mt-6">
            <BotManager botId={bot.id} />
          </TabsContent>
        ))}
      </Tabs>

      {/* Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Sistema multi-bot</p>
              <p className="text-sm text-muted-foreground">
                Cada bot está especializado en diferentes tipos de comunicación. Puedes gestionar todos
                los bots desde esta interfaz y utilizar las herramientas de envío masivo y pruebas para
                optimizar tus comunicaciones.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}