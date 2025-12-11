// components/admin/comunicacion/MessagesHistoryContent.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  History,
  Filter,
  Download,
  RefreshCw,
  Search,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  TrendingUp,
  Phone,
  Image as ImageIcon,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { exportMessages } from '@/app/admin/comunicaciones/historial/actions';
import type { MessageStats } from '@/lib/services/messages-history.service';

interface Message {
  id: string;
  recipientName: string;
  recipientPhone: string;
  messageType: string;
  botId: string | null;
  status: string;
  source: string;
  sentAt: Date | string;
  metadata?: any;
}

interface MessagesHistoryContentProps {
  initialMessages: Message[];
  initialPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  initialStats: MessageStats;
  initialFilters?: {
    search?: string;
    messageType?: string;
    botId?: string;
    status?: string;
    source?: string;
    dateFrom?: Date;
    dateTo?: Date;
  };
}

const MESSAGE_TYPES = [
  { value: 'all', label: 'Todos', color: 'default' },
  { value: 'WELCOME', label: 'Bienvenida', emoji: '👋' },
  { value: 'APPLICATION_RECEIVED', label: 'Postulación Recibida', emoji: '📨' },
  { value: 'FORM_INCOMPLETE', label: 'Form. Incompleto', emoji: '📝' },
  { value: 'DOCUMENT_MISSING', label: 'Doc. Faltante', emoji: '📄' },
  { value: 'PAYMENT_REMINDER', label: 'Record. Pago', emoji: '💰' },
  { value: 'ONBOARDING_INVITATION', label: 'Onboarding', emoji: '🎓' },
  { value: 'CAPACITATION_NO_SHOW', label: 'No Asistió', emoji: '❌' },
  { value: 'REACTIVATION', label: 'Reactivación', emoji: '🔁' },
  { value: 'CUSTOM', label: 'Personalizado', emoji: '✨' },
];

const BOTS = [
  { value: 'all', label: 'Todos los bots' },
  { value: 'bot-adquisicion-prod', label: '📥 Adquisición' },
  { value: 'bot-reactivacion-prod', label: '🔁 Reactivación' },
];

const STATUSES = [
  { value: 'all', label: 'Todos' },
  { value: 'SENT', label: 'Enviado' },
  { value: 'DELIVERED', label: 'Entregado' },
  { value: 'READ', label: 'Leído' },
  { value: 'FAILED', label: 'Fallido' },
];

const SOURCES = [
  { value: 'all', label: 'Todas' },
  { value: 'MANUAL', label: 'Manual', emoji: '👤' },
  { value: 'CRON', label: 'Auto', emoji: '🤖' },
  { value: 'TRIGGER', label: 'Trigger', emoji: '⚡' },
  { value: 'API', label: 'API', emoji: '🔌' },
];

export function MessagesHistoryContent({
  initialMessages,
  initialPagination,
  initialStats,
  initialFilters = {},
}: MessagesHistoryContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);

  // Estado local de filtros
  const [localSearch, setLocalSearch] = useState(initialFilters.search || '');
  const [localMessageType, setLocalMessageType] = useState(initialFilters.messageType || 'all');
  const [localBotId, setLocalBotId] = useState(initialFilters.botId || 'all');
  const [localStatus, setLocalStatus] = useState(initialFilters.status || 'all');
  const [localSource, setLocalSource] = useState(initialFilters.source || 'all');
  const [localDateFrom, setLocalDateFrom] = useState<Date | undefined>(initialFilters.dateFrom);
  const [localDateTo, setLocalDateTo] = useState<Date | undefined>(initialFilters.dateTo);

  // Construir URL con filtros
  const buildUrl = (params: Record<string, string | undefined>) => {
    const url = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'all') {
        url.set(key, value);
      }
    });
    return `/admin/comunicaciones/historial${url.toString() ? `?${url.toString()}` : ''}`;
  };

  // Aplicar filtros
  const applyFilters = (page: number = 1) => {
    const params: Record<string, string | undefined> = {
      page: page.toString(),
      search: localSearch || undefined,
      messageType: localMessageType !== 'all' ? localMessageType : undefined,
      botId: localBotId !== 'all' ? localBotId : undefined,
      status: localStatus !== 'all' ? localStatus : undefined,
      source: localSource !== 'all' ? localSource : undefined,
      dateFrom: localDateFrom?.toISOString(),
      dateTo: localDateTo?.toISOString(),
    };

    startTransition(() => {
      router.push(buildUrl(params));
    });
  };

  // Limpiar filtros
  const clearFilters = () => {
    setLocalSearch('');
    setLocalMessageType('all');
    setLocalBotId('all');
    setLocalStatus('all');
    setLocalSource('all');
    setLocalDateFrom(undefined);
    setLocalDateTo(undefined);

    startTransition(() => {
      router.push('/admin/comunicaciones/historial');
    });
  };

  // Cambiar página
  const goToPage = (page: number) => {
    applyFilters(page);
  };

  // Refrescar
  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  // Exportar
  const handleExport = async () => {
    setIsExporting(true);
    toast.info('Exportando mensajes...');

    try {
      const result = await exportMessages({
        search: localSearch || undefined,
        messageType: localMessageType !== 'all' ? localMessageType as any : undefined,
        botId: localBotId !== 'all' ? localBotId : undefined,
        status: localStatus !== 'all' ? localStatus as any : undefined,
        source: localSource !== 'all' ? localSource as any : undefined,
        dateFrom: localDateFrom,
        dateTo: localDateTo,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      const blob = new Blob([result.data!], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename!;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Mensajes exportados correctamente');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar mensajes');
    } finally {
      setIsExporting(false);
    }
  };

  // Helpers de renderizado
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <Badge variant="outline" className="gap-1 border-blue-200 text-blue-700 bg-blue-50"><Send className="h-3 w-3" />Enviado</Badge>;
      case 'DELIVERED':
        return <Badge variant="outline" className="gap-1 border-green-200 text-green-700 bg-green-50"><CheckCircle2 className="h-3 w-3" />Entregado</Badge>;
      case 'READ':
        return <Badge className="gap-1 bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-3 w-3" />Leído</Badge>;
      case 'FAILED':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Fallido</Badge>;
      case 'SENDING':
        return <Badge variant="outline" className="gap-1 border-orange-200 text-orange-700 bg-orange-50"><Clock className="h-3 w-3" />Enviando</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBotBadge = (botId: string | null) => {
    if (!botId) return <Badge variant="outline" className="text-xs">Sin bot</Badge>;
    if (botId.includes('adquisicion')) return <Badge variant="secondary" className="gap-1 text-xs">📥 Adquisición</Badge>;
    if (botId.includes('reactivacion')) return <Badge variant="secondary" className="gap-1 text-xs">🔁 Reactivación</Badge>;
    return <Badge variant="outline" className="text-xs">{botId}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeInfo = MESSAGE_TYPES.find(t => t.value === type);
    if (!typeInfo || type === 'all') {
      return <Badge variant="outline" className="text-xs">{type}</Badge>;
    }
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <span>{typeInfo.emoji}</span>
        {typeInfo.label}
      </Badge>
    );
  };

  const getSourceBadge = (source: string) => {
    const sourceInfo = SOURCES.find(s => s.value === source);
    if (!sourceInfo || source === 'all') {
      return <Badge variant="secondary" className="text-xs">{source}</Badge>;
    }
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <span>{sourceInfo.emoji}</span>
        {sourceInfo.label}
      </Badge>
    );
  };

  const hasActiveFilters = 
    localSearch || 
    localMessageType !== 'all' || 
    localBotId !== 'all' || 
    localStatus !== 'all' || 
    localSource !== 'all' || 
    localDateFrom || 
    localDateTo;

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <History className="h-8 w-8" />
            Historial de Mensajes
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualiza y analiza todos los mensajes enviados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isPending}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isPending && 'animate-spin')} />
            Actualizar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Enviados</p>
                <p className="text-2xl font-bold">{initialStats.total.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Exitosos</p>
                <p className="text-2xl font-bold text-green-600">{initialStats.successful.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fallidos</p>
                <p className="text-2xl font-bold text-red-600">{initialStats.failed.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasa de Éxito</p>
                <p className="text-2xl font-bold">{initialStats.successRate}%</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-orange-600">{initialStats.pending.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros Mejorados */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} disabled={isPending}>
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-2 space-y-2">
              <Label htmlFor="search" className="text-xs font-medium text-muted-foreground">Buscar</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Teléfono, nombre..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                    className="pl-9 h-9"
                  />
                </div>
                <Button onClick={() => applyFilters()} size="sm" disabled={isPending} className="h-9 px-3">
                  Buscar
                </Button>
              </div>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Tipo</Label>
              <Select value={localMessageType} onValueChange={(value) => { setLocalMessageType(value); setTimeout(() => applyFilters(), 100); }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.emoji && <span className="mr-2">{type.emoji}</span>}
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bot */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Bot</Label>
              <Select value={localBotId} onValueChange={(value) => { setLocalBotId(value); setTimeout(() => applyFilters(), 100); }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOTS.map((bot) => (
                    <SelectItem key={bot.value} value={bot.value}>
                      {bot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Estado</Label>
              <Select value={localStatus} onValueChange={(value) => { setLocalStatus(value); setTimeout(() => applyFilters(), 100); }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fuente */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Fuente</Label>
              <Select value={localSource} onValueChange={(value) => { setLocalSource(value); setTimeout(() => applyFilters(), 100); }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.emoji && <span className="mr-2">{source.emoji}</span>}
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha desde */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Desde</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localDateFrom ? format(localDateFrom, 'PPP', { locale: es }) : 'Fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localDateFrom}
                    onSelect={(date) => { setLocalDateFrom(date); if (date) setTimeout(() => applyFilters(), 100); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Fecha hasta */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Hasta</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localDateTo ? format(localDateTo, 'PPP', { locale: es }) : 'Fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localDateTo}
                    onSelect={(date) => { setLocalDateTo(date); if (date) setTimeout(() => applyFilters(), 100); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla Mejorada */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Mensajes ({initialPagination.total.toLocaleString()})
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Página {initialPagination.page} de {initialPagination.totalPages}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : initialMessages.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No se encontraron mensajes</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Fecha</TableHead>
                      <TableHead className="font-semibold">Destinatario</TableHead>
                      <TableHead className="font-semibold">Tipo</TableHead>
                      <TableHead className="font-semibold">Bot</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                      <TableHead className="font-semibold">Fuente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialMessages.map((message) => (
                      <TableRow key={message.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {format(new Date(message.sentAt), 'd MMM', { locale: es })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(message.sentAt), 'HH:mm', { locale: es })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col max-w-[200px]">
                            <span className="font-medium text-sm truncate">{message.recipientName}</span>
                            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {message.recipientPhone}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeBadge(message.messageType)}
                            {message.metadata?.hasImage && (
                              <Badge variant="secondary" className="gap-1 text-xs h-5 px-1.5">
                                <ImageIcon className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getBotBadge(message.botId)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(message.status)}
                        </TableCell>
                        <TableCell>
                          {getSourceBadge(message.source)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((initialPagination.page - 1) * initialPagination.pageSize) + 1} a{' '}
                  {Math.min(initialPagination.page * initialPagination.pageSize, initialPagination.total)} de {initialPagination.total.toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(initialPagination.page - 1)}
                    disabled={initialPagination.page === 1 || isPending}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, initialPagination.totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={initialPagination.page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          disabled={isPending}
                          className="h-8 w-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {initialPagination.totalPages > 5 && <span className="text-muted-foreground">...</span>}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(initialPagination.page + 1)}
                    disabled={initialPagination.page === initialPagination.totalPages || isPending}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}