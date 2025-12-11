// app/admin/comunicaciones/historial/actions.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { 
  getMessagesWithFilters, 
  getMessageStats, 
  getMessagesForExport,
  type MessageFilters,
  type PaginationParams 
} from '@/lib/services/messages-history.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Server Action para obtener mensajes con filtros
 */
export async function fetchMessages(
  filters: MessageFilters,
  pagination: PaginationParams
) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  try {
    const result = await getMessagesWithFilters(filters, pagination);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al cargar mensajes' 
    };
  }
}

/**
 * Server Action para obtener estadísticas
 */
export async function fetchStats(filters?: {
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  try {
    const stats = await getMessageStats(filters);
    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al cargar estadísticas' 
    };
  }
}

/**
 * Server Action para exportar mensajes a CSV
 */
export async function exportMessages(filters: MessageFilters) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  try {
    const messages = await getMessagesForExport(filters);

    // Crear CSV
    const headers = [
      'ID',
      'Fecha y Hora',
      'Destinatario',
      'Teléfono',
      'Tipo de Mensaje',
      'Estado',
      'Bot',
      'Fuente',
      'Mensaje',
      'Enviado Por',
      'Conductor',
    ];

    const rows = messages.map((msg) => [
      msg.id,
      format(new Date(msg.sentAt), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
      msg.recipientName,
      msg.recipientPhone,
      msg.messageType,
      msg.status,
      msg.botId || 'N/A',
      msg.source,
      msg.message.replace(/"/g, '""'), // Escapar comillas
      msg.sentByUser?.fullName || 'Sistema',
      msg.formDriver?.fullName || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return { 
      success: true, 
      data: csvContent,
      filename: `mensajes-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`
    };
  } catch (error) {
    console.error('Error exporting messages:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al exportar mensajes' 
    };
  }
}