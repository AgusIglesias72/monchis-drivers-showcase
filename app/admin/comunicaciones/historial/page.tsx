// app/admin/comunicaciones/historial/page.tsx
import { Suspense } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { MessagesHistoryContent } from '@/components/admin/comunicacion/MessagesHistoryContent';
import { getMessagesWithFilters, getMessageStats } from '@/lib/services/messages-history.service';
import { Loader2 } from 'lucide-react';
import { WhatsAppMessage } from '@prisma/client';

async function LoadingState() {
  return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

async function HistorialContent({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // ✅ ARREGLADO: Await searchParams antes de usar
  const params = await searchParams;
  
  // Parsear parámetros de búsqueda
  const page = parseInt(params.page as string) || 1;
  const pageSize = 20;
  
  const search = params.search as string | undefined;
  const messageType = params.messageType as any;
  const botId = params.botId as string | undefined;
  const status = params.status as any;
  const source = params.source as any;
  
  const dateFromStr = params.dateFrom as string | undefined;
  const dateToStr = params.dateTo as string | undefined;
  
  const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
  const dateTo = dateToStr ? new Date(dateToStr) : undefined;

  // Cargar datos iniciales en el servidor
  const [messagesResult, statsResult] = await Promise.all([
    getMessagesWithFilters(
      { search, messageType, botId, status, source, dateFrom, dateTo },
      { page, pageSize }
    ),
    getMessageStats({ dateFrom, dateTo })
  ]);

  return (
    <MessagesHistoryContent
      initialMessages={messagesResult.messages as WhatsAppMessage[]}
      initialPagination={messagesResult.pagination}
      initialStats={statsResult}
      initialFilters={{
        search,
        messageType,
        botId,
        status,
        source,
        dateFrom,
        dateTo,
      }}
    />
  );
}

export default async function HistorialMensajesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: 'Comunicaciones', href: '/admin/comunicaciones' },
          { label: 'Historial' },
        ]}
      />

      <div className="flex flex-1 flex-col container mx-auto">
        <Suspense fallback={<LoadingState />}>
          <HistorialContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}