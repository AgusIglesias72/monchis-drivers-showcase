// components/admin/comunicacion/MessageTestPanel.tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { MessageTestForm } from './MessageTestForm';
import { MessagePreview } from './MessagePreview';
import { RecentMessagesList } from './RecentMessagesList';
import { BotStatusIndicator } from './BotStatusIndicator';
import { TestTube2, History } from 'lucide-react';
import { getActiveBots, type BotId } from '@/lib/config/whatsapp-bots.config';

export interface MessageFormData {
  phone: string;
  name: string;
  type: string;
  step?: string;
  metadata?: Record<string, any>;
}

interface MessageTestPanelProps {
  initialBotId?: BotId;
}

export function MessageTestPanel({ initialBotId }: MessageTestPanelProps) {
  const activeBots = getActiveBots();
  const [activeBot, setActiveBot] = useState<BotId>(
    (initialBotId as BotId) || (activeBots[0]?.id as BotId) || 'bot-adquisicion-prod'
  );
  const [activeTab, setActiveTab] = useState('send');

  const [formData, setFormData] = useState<MessageFormData>({
    phone: '',
    name: '',
    type: '',
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFormChange = (data: MessageFormData) => {
    setFormData(data);
  };

  const handleMessageSent = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Selector de Bot */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {activeBots.map((bot) => (
          <button
            key={bot.id}
            onClick={() => setActiveBot(bot.id as BotId)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
              ${
                activeBot === bot.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-border'
              }
            `}
          >
            <span className="text-xl">{bot.icon}</span>
            <div className="text-left">
              <div className="text-sm font-semibold">{bot.name}</div>
              <div className="text-xs opacity-80">{bot.messageTypes.length} tipos</div>
            </div>
          </button>
        ))}
      </div>

      {/* Estado del Bot Seleccionado */}
      <BotStatusIndicator botId={activeBot} />

      {/* Tabs de Funcionalidad */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="send" className="gap-2">
            <TestTube2 className="h-4 w-4" />
            Enviar Mensaje
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Historial Reciente
          </TabsTrigger>
        </TabsList>

        {/* Tab: Enviar Mensaje */}
        <TabsContent value="send" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna Izquierda: Formulario */}
            <Card>
              <CardContent className="pt-6">
                <MessageTestForm
                  botId={activeBot}
                  onChange={handleFormChange}
                  onMessageSent={handleMessageSent}
                />
              </CardContent>
            </Card>

            {/* Columna Derecha: Preview */}
            <Card>
              <CardContent className="pt-6">
                <MessagePreview formData={formData} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Historial Reciente */}
        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              <RecentMessagesList refreshTrigger={refreshTrigger} botId={activeBot} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}