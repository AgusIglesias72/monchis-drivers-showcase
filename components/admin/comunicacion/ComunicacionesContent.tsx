// components/admin/comunicacion/ComunicacionesContent.tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, TestTube2, ArrowRight } from 'lucide-react';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comunicaciones WhatsApp</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de múltiples bots para diferentes casos de uso
          </p>
        </div>

        {/* Botón de Pruebas */}
        <Button asChild>
          <Link href={`/admin/comunicaciones/pruebas?bot=${activeTab}`}>
            <TestTube2 className="h-4 w-4 mr-2" />
            Panel de Pruebas
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>

      {/* Tabs mejorados */}
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
                los bots desde esta interfaz y utilizar el panel de pruebas para verificar el
                funcionamiento de cada uno.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}