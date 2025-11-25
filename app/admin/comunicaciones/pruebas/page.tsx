// app/admin/comunicaciones/pruebas/page.tsx
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminHeader } from '@/components/admin/admin-header';
import { MessageTestPanel } from '@/components/admin/comunicacion/MessageTestPanel';
import { Button } from '@/components/ui/button';
import { Loader2, Send, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { type BotId } from '@/lib/config/whatsapp-bots.config';

function PruebasMensajesContent() {
  const searchParams = useSearchParams();
  const botId = searchParams.get('bot') as BotId | null;

  return (
    <div className="flex-1 p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Panel de Pruebas</h1>
          <p className="text-muted-foreground">
            Envía mensajes de prueba y visualiza el resultado en tiempo real
          </p>
        </div>

        {/* Botón de Envío Masivo */}
        <Button asChild>
          <Link href="/admin/comunicaciones/masivo">
            <Send className="h-4 w-4 mr-2" />
            Envío Masivo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>

      {/* Panel de pruebas */}
      <MessageTestPanel initialBotId={botId || undefined} />
    </div>
  );
}

export default function PruebasMensajesPage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: 'Comunicaciones', href: '/admin/comunicaciones' },
          { label: 'Pruebas' },
        ]}
      />

      <div className="flex flex-1 flex-col container mx-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <PruebasMensajesContent />
        </Suspense>
      </div>
    </>
  );
}