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

export interface MessageFormData {
  phone: string;
  name: string;
  type: string;
  step?: string;
  metadata?: Record<string, any>;
}

export function MessageTestPanel() {
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
    // Trigger refresh del historial
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Estado del Bot */}
      <BotStatusIndicator />

      {/* Tabs */}
      <Tabs defaultValue="send" className="w-full">
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
              <RecentMessagesList refreshTrigger={refreshTrigger} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}