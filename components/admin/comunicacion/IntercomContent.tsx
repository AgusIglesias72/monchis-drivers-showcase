// components/admin/comunicacion/IntercomContent.tsx
'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { IntercomIcon } from '@/components/admin/icons/intercom-icon';
import {
  Check,
  Search,
  Send,
  Zap,
  Info,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Bold,
  Italic,
  Link as LinkIcon,
  CornerDownLeft,
  X,
  MessageSquare,
  ImagePlus,
  Layers,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MapPin,
  ClipboardList,
  FileUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== TYPES ====================

interface HealthResponse {
  ok: boolean;
  workspace?: { name: string; region: string; id: string };
  admin?: { id: string; name: string; email: string };
  error?: string;
}

interface IntercomAdminOption {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
  awayMode: boolean;
  hasInboxSeat: boolean;
}

interface DriverOption {
  driverId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  documentNumber: string | null;
  intercomContactId: string | null;
  intercomExternalId: string | null;
  primaryZone: string | null;
}

interface SendResult {
  status: 'idle' | 'success' | 'error';
  message?: string;
  conversationId?: string;
  deliveryMethod?: 'reply' | 'outbound' | null;
}

interface Attachment {
  id: string; // local-only, para keys de React
  url: string;
  filename: string;
  size: number;
  type: string;
}

type ConversationAuthorType = 'admin' | 'user' | 'lead' | 'bot';

interface ConversationMessage {
  id: string;
  authorType: ConversationAuthorType;
  authorName: string | null;
  body: string;
  createdAt: number; // epoch seconds
  attachmentUrls: string[];
}

interface ConversationThread {
  conversationId: string;
  state: string | null;
  messages: ConversationMessage[];
}

interface ConversationListItem {
  contactId: string;
  conversationId: string | null;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  state: string | null;
  unread: boolean;
  lastMessageAt: string | null;
  lastReplyAt: string | null;
  lastOutboundAt: string | null;
}

const NO_ASSIGNEE = '__none__';
const MAX_ATTACHMENTS = 10;

// ==================== ROOT ====================

export function IntercomContent() {
  const [tab, setTab] = useState('enviar');

  return (
    <div className="space-y-6">
      <Header />
      <Separator />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="h-auto p-1 bg-muted rounded-lg gap-1">
          <TabsTrigger
            value="enviar"
            className="px-5 py-2.5 text-sm font-medium gap-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[#1F8DED]"
          >
            <Send className="h-4 w-4" />
            Enviar mensaje
          </TabsTrigger>
          <TabsTrigger
            value="conversaciones"
            className="px-5 py-2.5 text-sm font-medium gap-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[#1F8DED]"
          >
            <MessageSquare className="h-4 w-4" />
            Conversaciones
          </TabsTrigger>
          <TabsTrigger
            value="segmentos"
            className="px-5 py-2.5 text-sm font-medium gap-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-[#1F8DED]"
          >
            <Layers className="h-4 w-4" />
            Segmentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enviar" className="space-y-8 mt-6">
          <SandboxSection />
          <Separator />
          <ComingSoonSection />
        </TabsContent>

        <TabsContent value="conversaciones" className="mt-6">
          <ConversationsView />
        </TabsContent>

        <TabsContent value="segmentos" className="mt-6">
          <SegmentsView />
        </TabsContent>
      </Tabs>

      <Separator />
      <InfoFooter />
    </div>
  );
}

// ==================== HEADER ====================

function Header() {
  return (
    <header className="flex items-start gap-4">
      <div className="p-3 rounded-lg bg-[#1F8DED]/10 flex-shrink-0">
        <IntercomIcon className="h-7 w-7" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight">Intercom</h1>
          <StatusBadge />
        </div>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Mensajería 1-1 con drivers via Intercom: lanzá conversaciones manuales
          y seguí las respuestas. Cada envío queda registrado.
        </p>
      </div>
    </header>
  );
}

// ==================== STATUS (badge compacto) ====================

function StatusBadge() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/intercom/health', { cache: 'no-store' });
      const json: HealthResponse = await res.json();
      setHealth(json);
    } catch {
      setHealth({ ok: false, error: 'No se pudo contactar el endpoint' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ok = health?.ok;
  const title = loading
    ? 'Verificando conexión con Intercom…'
    : ok
      ? `Conectado${health?.workspace ? ` · ${health.workspace.name}` : ''}`
      : `Sin conexión: ${health?.error ?? 'error desconocido'}`;

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={loading}
      title={`${title} (click para reintentar)`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors',
        loading
          ? 'text-muted-foreground border-border'
          : ok
            ? 'text-success border-success bg-success-soft'
            : 'text-destructive border-destructive/30 bg-destructive/10',
      )}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span
          className={cn(
            'size-2 rounded-full',
            ok ? 'bg-success' : 'bg-destructive',
          )}
        />
      )}
      {loading ? 'Verificando…' : ok ? 'Conectado' : 'Sin conexión'}
    </button>
  );
}

// ==================== SANDBOX ====================

function SandboxSection() {
  const [admins, setAdmins] = useState<IntercomAdminOption[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [adminsError, setAdminsError] = useState<string | null>(null);

  const [driver, setDriver] = useState<DriverOption | null>(null);
  const [senderId, setSenderId] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>(NO_ASSIGNEE);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult>({ status: 'idle' });

  useEffect(() => {
    fetch('/api/intercom/admins', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setAdminsError(json.error);
          return;
        }
        setAdmins(json.admins ?? []);
      })
      .catch((err) => setAdminsError(String(err)))
      .finally(() => setAdminsLoading(false));
  }, []);

  const sender = useMemo(
    () => admins.find((a) => a.id === senderId) ?? null,
    [admins, senderId],
  );
  const assignee = useMemo(
    () =>
      assigneeId === NO_ASSIGNEE
        ? null
        : admins.find((a) => a.id === assigneeId) ?? null,
    [admins, assigneeId],
  );

  // Permitimos enviar si hay body O al menos un attachment (Intercom acepta
  // mensajes con solo adjuntos).
  const hasContent =
    body.trim().length > 0 || attachments.length > 0;
  const canSend =
    !!driver?.intercomContactId && !!senderId && hasContent && !sending;

  async function handleSend() {
    if (!driver?.intercomContactId || !senderId) return;
    setSending(true);
    setResult({ status: 'idle' });
    try {
      const res = await fetch('/api/intercom/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: driver.intercomContactId,
          senderAdminId: senderId,
          assigneeAdminId: assigneeId === NO_ASSIGNEE ? null : assigneeId,
          subject,
          body,
          attachmentUrls: attachments.map((a) => a.url),
          driverId: driver.driverId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResult({
          status: 'error',
          message: json.error ?? `Error ${res.status}`,
        });
      } else {
        setResult({
          status: 'success',
          message:
            'Mensaje enviado. La conversación queda en la pestaña Conversaciones.',
          conversationId: json.conversationId,
          deliveryMethod: json.deliveryMethod,
        });
        setSubject('');
        setBody('');
        setAttachments([]);
      }
    } catch (err) {
      setResult({
        status: 'error',
        message: err instanceof Error ? err.message : 'Error desconocido',
      });
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sandbox — Mensaje 1-1
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Conversación nueva en Intercom; el driver la ve en el Messenger de
          Monchis Express.
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        {/* ===== Chat header ===== */}
        <ChatHeader driver={driver} onDriverChange={setDriver} />

        {/* ===== Chat body (preview del mensaje a enviar) ===== */}
        <ChatBody
          subject={subject}
          body={body}
          attachments={attachments}
          sender={sender}
          result={result}
          driver={driver}
        />

        {/* ===== Composer ===== */}
        <ChatComposer
          subject={subject}
          onSubjectChange={setSubject}
          body={body}
          onBodyChange={setBody}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          admins={admins}
          adminsLoading={adminsLoading}
          adminsError={adminsError}
          sender={sender}
          onSenderChange={setSenderId}
          assignee={assignee}
          onAssigneeChange={setAssigneeId}
          canSend={canSend}
          sending={sending}
          onSend={() => setConfirmOpen(true)}
          driver={driver}
        />
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envío</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div>
                  Vas a enviar un mensaje al driver{' '}
                  <strong>{driver?.fullName}</strong>.
                </div>
                <div>
                  Remitente: <strong>{sender?.name ?? '—'}</strong>
                </div>
                <div>
                  Asignado a:{' '}
                  <strong>{assignee?.name ?? 'sin asignar'}</strong>
                </div>
                <div className="rounded border bg-muted/50 p-2 max-h-40 overflow-auto text-foreground space-y-1">
                  {subject.trim() && (
                    <div className="font-semibold">{subject}</div>
                  )}
                  <div dangerouslySetInnerHTML={{ __html: body }} />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={sending}>
              {sending ? 'Enviando…' : 'Confirmar envío'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

// ==================== CHAT HEADER ====================

function ChatHeader({
  driver,
  onDriverChange,
}: {
  driver: DriverOption | null;
  onDriverChange: (d: DriverOption | null) => void;
}) {
  if (!driver) {
    return (
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Conversación con
            </div>
            <DriverCombobox value={null} onChange={onDriverChange} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-3">
        <Avatar className="size-10 flex-shrink-0">
          <AvatarFallback className="bg-[#1F8DED]/10 text-[#1F8DED] font-semibold text-sm">
            {initials(driver.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{driver.fullName}</span>
            {driver.primaryZone && (
              <Badge variant="outline" className="text-[10px]">
                {driver.primaryZone}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {driver.phone ?? '—'}
            {driver.email && ` · ${driver.email}`}
            {driver.documentNumber && ` · CI ${driver.documentNumber}`}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDriverChange(null)}
          className="text-xs"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Cambiar
        </Button>
      </div>
    </div>
  );
}

// ==================== CHAT BODY (preview del mensaje a enviar) ====================

function ChatBody({
  subject,
  body,
  attachments,
  sender,
  result,
  driver,
}: {
  subject: string;
  body: string;
  attachments: Attachment[];
  sender: IntercomAdminOption | null;
  result: SendResult;
  driver: DriverOption | null;
}) {
  const hasSubject = subject.trim().length > 0;
  const hasText = body.trim().length > 0;
  const hasAttachments = attachments.length > 0;
  const hasPreview = hasSubject || hasText || hasAttachments;

  const showEmpty = !hasPreview;

  return (
    <div className="min-h-[280px] max-h-[420px] overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,_theme(colors.muted.DEFAULT)_1px,_transparent_0)] [background-size:16px_16px] bg-background px-4 py-6 space-y-3">
      {showEmpty && (
        <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">
            {driver ? 'Listo para escribir' : 'Sin mensajes todavía'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {driver
              ? 'Escribí abajo y el preview aparece acá como lo verá el driver.'
              : 'Seleccioná un driver para empezar.'}
          </p>
        </div>
      )}

      {/* Preview del mensaje que se está escribiendo */}
      {hasPreview && (
        <div className="flex items-end gap-2 justify-end">
          <div className="max-w-[75%] space-y-1">
            {hasAttachments && (
              <div
                className={cn(
                  'grid gap-1 rounded-2xl rounded-br-sm overflow-hidden bg-[#1F8DED]/10 p-1',
                  attachments.length === 1 && 'grid-cols-1',
                  attachments.length === 2 && 'grid-cols-2',
                  attachments.length >= 3 && 'grid-cols-3',
                )}
              >
                {attachments.map((att) => (
                  <img
                    key={att.id}
                    src={att.url}
                    alt={att.filename}
                    className="w-full h-32 object-cover rounded-md"
                  />
                ))}
              </div>
            )}
            {(hasSubject || hasText) && (
              <div className="rounded-2xl rounded-br-sm bg-[#1F8DED] text-white px-4 py-2.5 text-sm leading-relaxed shadow-sm opacity-70 ring-1 ring-[#1F8DED]/30">
                {hasSubject && (
                  <div className="font-semibold mb-1">{subject}</div>
                )}
                {hasText && (
                  <div
                    className="[&_b]:font-semibold [&_strong]:font-semibold [&_i]:italic [&_em]:italic [&_a]:underline [&_a]:text-white"
                    dangerouslySetInnerHTML={{ __html: body }}
                  />
                )}
              </div>
            )}
            <div className="text-[10px] text-muted-foreground text-right">
              {sender ? sender.name : 'Remitente no seleccionado'} · vista previa
            </div>
          </div>
          <Avatar className="size-7 flex-shrink-0">
            <AvatarFallback className="bg-[#1F8DED] text-white text-[10px] font-semibold">
              {sender ? initials(sender.name) : '·'}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {result.status === 'success' && (
        <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {result.message}
          {result.conversationId && (
            <span className="font-mono opacity-70">
              · {result.conversationId}
            </span>
          )}
        </div>
      )}
      {result.status === 'error' && (
        <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {result.message}
        </div>
      )}
    </div>
  );
}

// ==================== CHAT MESSAGE (mensaje del historial) ====================

function ChatMessage({ message }: { message: ConversationMessage }) {
  const isAdminSide = message.authorType === 'admin' || message.authorType === 'bot';
  const hasText = message.body.trim().length > 0;
  const hasImages = message.attachmentUrls.length > 0;

  return (
    <div
      className={cn(
        'flex items-end gap-2',
        isAdminSide ? 'justify-end' : 'justify-start',
      )}
    >
      {!isAdminSide && (
        <Avatar className="size-7 flex-shrink-0">
          <AvatarFallback className="bg-muted text-[10px] font-semibold">
            {initials(message.authorName ?? 'Driver')}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="max-w-[75%] space-y-1">
        {hasImages && (
          <div
            className={cn(
              'grid gap-1 rounded-2xl overflow-hidden p-1',
              isAdminSide
                ? 'rounded-br-sm bg-[#1F8DED]/10'
                : 'rounded-bl-sm bg-muted',
              message.attachmentUrls.length === 1 && 'grid-cols-1',
              message.attachmentUrls.length === 2 && 'grid-cols-2',
              message.attachmentUrls.length >= 3 && 'grid-cols-3',
            )}
          >
            {message.attachmentUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt="adjunto"
                  className="w-full h-32 object-cover rounded-md"
                />
              </a>
            ))}
          </div>
        )}
        {hasText && (
          <div
            className={cn(
              'rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm [&_b]:font-semibold [&_strong]:font-semibold [&_i]:italic [&_em]:italic [&_a]:underline',
              isAdminSide
                ? 'rounded-br-sm bg-[#1F8DED] text-white [&_a]:text-white'
                : 'rounded-bl-sm bg-muted text-foreground [&_a]:text-[#1F8DED]',
            )}
            dangerouslySetInnerHTML={{ __html: message.body }}
          />
        )}
        <div
          className={cn(
            'text-[10px] text-muted-foreground',
            isAdminSide ? 'text-right' : 'text-left',
          )}
        >
          {message.authorName ?? (isAdminSide ? 'Admin' : 'Driver')}
          {' · '}
          {formatChatTime(message.createdAt)}
        </div>
      </div>
      {isAdminSide && (
        <Avatar className="size-7 flex-shrink-0">
          <AvatarFallback className="bg-[#1F8DED] text-white text-[10px] font-semibold">
            {initials(message.authorName ?? 'Admin')}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

// ==================== CHAT COMPOSER ====================

function ChatComposer({
  subject,
  onSubjectChange,
  body,
  onBodyChange,
  attachments,
  onAttachmentsChange,
  admins,
  adminsLoading,
  adminsError,
  sender,
  onSenderChange,
  assignee,
  onAssigneeChange,
  canSend,
  sending,
  onSend,
  driver,
}: {
  subject: string;
  onSubjectChange: (s: string) => void;
  body: string;
  onBodyChange: (b: string) => void;
  attachments: Attachment[];
  onAttachmentsChange: (a: Attachment[]) => void;
  admins: IntercomAdminOption[];
  adminsLoading: boolean;
  adminsError: string | null;
  sender: IntercomAdminOption | null;
  onSenderChange: (id: string) => void;
  assignee: IntercomAdminOption | null;
  onAssigneeChange: (id: string) => void;
  canSend: boolean;
  sending: boolean;
  onSend: () => void;
  driver: DriverOption | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    setUploadError(null);
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      setUploadError(`Máximo ${MAX_ATTACHMENTS} imágenes por mensaje`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const uploaded: Attachment[] = [];
      for (const file of toUpload) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/intercom/upload-attachment', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? `Error subiendo ${file.name}`);
        }
        uploaded.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url: json.url,
          filename: json.filename,
          size: json.size,
          type: json.type,
        });
      }
      onAttachmentsChange([...attachments, ...uploaded]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeAttachment(id: string) {
    onAttachmentsChange(attachments.filter((a) => a.id !== id));
  }

  return (
    <div className="border-t bg-card">
      {/* Asunto / título del mensaje */}
      <input
        type="text"
        value={subject}
        onChange={(e) => onSubjectChange(e.target.value)}
        disabled={!driver}
        placeholder="Asunto (opcional) — aparece como título del mensaje"
        maxLength={255}
        className="w-full border-b px-3 py-2 text-sm font-medium bg-transparent outline-none placeholder:font-normal placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      />

      <RichEditor
        value={body}
        onChange={onBodyChange}
        disabled={!driver}
        placeholder={
          driver
            ? `Escribí un mensaje para ${driver.fullName}…`
            : 'Primero seleccioná un driver arriba…'
        }
        onImageClick={() => fileInputRef.current?.click()}
        imageDisabled={
          !driver || uploading || attachments.length >= MAX_ATTACHMENTS
        }
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
          }
        }}
      />

      {/* Attachment thumbnails */}
      {(attachments.length > 0 || uploading || uploadError) && (
        <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/10 overflow-x-auto">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative flex-shrink-0 group rounded-md overflow-hidden border bg-background"
            >
              <img
                src={att.url}
                alt={att.filename}
                className="h-16 w-16 object-cover"
              />
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                aria-label="Eliminar imagen"
                className="absolute top-0.5 right-0.5 size-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/90"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {uploading && (
            <div className="h-16 w-16 rounded-md border border-dashed flex items-center justify-center bg-muted/30 flex-shrink-0">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {uploadError && (
            <div className="flex items-center gap-1.5 text-xs text-destructive ml-2">
              <AlertCircle className="h-3.5 w-3.5" />
              {uploadError}
            </div>
          )}
          {attachments.length > 0 && (
            <div className="ml-auto text-[10px] text-muted-foreground flex-shrink-0">
              {attachments.length} / {MAX_ATTACHMENTS}
            </div>
          )}
        </div>
      )}

      {/* Footer: De / Asignar a + botón Enviar */}
      <div className="flex items-center justify-between gap-2 border-t px-3 py-2 bg-muted/20 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <AdminCombobox
            label="De"
            placeholder={adminsLoading ? 'Cargando…' : 'Seleccionar sender'}
            admins={admins}
            value={sender}
            onChange={onSenderChange}
            disabled={adminsLoading}
          />
          <span className="text-muted-foreground text-xs">·</span>
          <AdminCombobox
            label="Asignar a"
            placeholder="Sin asignar"
            admins={admins}
            value={assignee}
            onChange={onAssigneeChange}
            allowNone
            disabled={adminsLoading}
          />
          {adminsError && (
            <span className="text-[11px] text-destructive">
              · {adminsError}
            </span>
          )}
        </div>
        <Button
          onClick={onSend}
          disabled={!canSend}
          size="sm"
          className="gap-1.5 bg-[#1F8DED] hover:bg-[#1F8DED]/90 text-white"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Enviar
        </Button>
      </div>
    </div>
  );
}

// ==================== RICH EDITOR (contentEditable WYSIWYG) ====================

// Shortcodes estilo Slack/GitHub → emoji Unicode. El texto de las comunicaciones
// se suele copiar desde Slack, donde los emojis viajan como ":wave:". Sin esto
// quedarían literales en el Messenger del driver. Mapa curado (no exhaustivo);
// los no mapeados quedan tal cual.
const EMOJI_SHORTCODES: Record<string, string> = {
  wave: '👋',
  rocket: '🚀',
  moneybag: '💰',
  money_with_wings: '💸',
  dollar: '💵',
  date: '📅',
  calendar: '📆',
  telephone_receiver: '📞',
  phone: '☎️',
  calling: '📲',
  iphone: '📱',
  email: '📧',
  envelope: '✉️',
  tada: '🎉',
  sparkles: '✨',
  fire: '🔥',
  star: '⭐',
  star2: '🌟',
  bulb: '💡',
  gift: '🎁',
  warning: '⚠️',
  rotating_light: '🚨',
  bell: '🔔',
  loudspeaker: '📢',
  mega: '📣',
  white_check_mark: '✅',
  heavy_check_mark: '✔️',
  x: '❌',
  '100': '💯',
  point_right: '👉',
  point_down: '👇',
  point_up: '☝️',
  pushpin: '📌',
  memo: '📝',
  package: '📦',
  car: '🚗',
  motorcycle: '🏍️',
  scooter: '🛵',
  chart_with_upwards_trend: '📈',
  trophy: '🏆',
  crown: '👑',
  gem: '💎',
  key: '🔑',
  handshake: '🤝',
  muscle: '💪',
  clap: '👏',
  raised_hands: '🙌',
  pray: '🙏',
  ok_hand: '👌',
  '+1': '👍',
  thumbsup: '👍',
  '-1': '👎',
  thumbsdown: '👎',
  heart: '❤️',
  eyes: '👀',
  smile: '😄',
  smiley: '😃',
  grinning: '😀',
  blush: '😊',
  wink: '😉',
  joy: '😂',
  sweat_smile: '😅',
  heart_eyes: '😍',
  sunglasses: '😎',
  thinking_face: '🤔',
  hugging_face: '🤗',
  slightly_smiling_face: '🙂',
};

// Reemplaza todos los ":shortcode:" reconocidos por su emoji.
function replaceEmojiShortcodes(text: string): string {
  return text.replace(/:([a-z0-9_+-]+):/gi, (match, code) => {
    const emoji = EMOJI_SHORTCODES[String(code).toLowerCase()];
    return emoji ?? match;
  });
}

function RichEditor({
  value,
  onChange,
  disabled,
  placeholder,
  onImageClick,
  imageDisabled,
}: {
  value: string;
  onChange: (html: string) => void;
  disabled: boolean;
  placeholder: string;
  onImageClick?: () => void;
  imageDisabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Sincronizamos el DOM con el state SOLO cuando value se vacía desde afuera
  // (reset post-send). Para todos los demás cambios, el contentEditable se
  // autogestiona y reescribirle innerHTML rompe el cursor.
  useLayoutEffect(() => {
    if (
      ref.current &&
      value === '' &&
      ref.current.innerHTML !== '' &&
      ref.current.innerHTML !== '<br>'
    ) {
      ref.current.innerHTML = '';
    }
  }, [value]);

  function emitChange() {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    // Normalizamos el "<br>" solitario que Chrome agrega al borrar todo.
    onChange(html === '<br>' ? '' : html);
  }

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    // execCommand está deprecated pero soportado en todos los browsers.
    // Para un editor interno alcanza. Si en el futuro se complica, migrar a
    // Selection API + Range manual o a Tiptap.
    document.execCommand(cmd, false, arg);
    emitChange();
  }

  function handleLinkClick() {
    const url = window.prompt('URL del enlace:', 'https://');
    if (!url) return;
    exec('createLink', url);
    // Forzar target=_blank en el último <a> creado (execCommand no lo soporta).
    if (ref.current) {
      const anchors = ref.current.querySelectorAll('a');
      const last = anchors[anchors.length - 1];
      if (last && last.getAttribute('href') === url) {
        last.setAttribute('target', '_blank');
        last.setAttribute('rel', 'noopener noreferrer');
        emitChange();
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Shortcuts estándar
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      exec('bold');
    } else if (meta && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      exec('italic');
    }
  }

  // Pegado: forzamos plain text para no traer estilos raros del clipboard y
  // convertimos shortcodes (:wave:) a emoji, que es como suele venir de Slack.
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = replaceEmojiShortcodes(e.clipboardData.getData('text/plain'));
    document.execCommand('insertText', false, text);
    emitChange();
  }

  const visibleLength = useMemo(() => {
    if (!value) return 0;
    if (typeof document === 'undefined') return 0;
    const div = document.createElement('div');
    div.innerHTML = value;
    return div.textContent?.length ?? 0;
  }, [value]);

  const isEmpty = !value || value === '<br>';

  return (
    <>
      {/* Toolbar de formato */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b">
        <ToolbarButton
          icon={<Bold className="h-3.5 w-3.5" />}
          label="Negrita (Cmd/Ctrl+B)"
          onClick={() => exec('bold')}
          disabled={disabled}
        />
        <ToolbarButton
          icon={<Italic className="h-3.5 w-3.5" />}
          label="Cursiva (Cmd/Ctrl+I)"
          onClick={() => exec('italic')}
          disabled={disabled}
        />
        <ToolbarButton
          icon={<LinkIcon className="h-3.5 w-3.5" />}
          label="Enlace"
          onClick={handleLinkClick}
          disabled={disabled}
        />
        <ToolbarButton
          icon={<CornerDownLeft className="h-3.5 w-3.5" />}
          label="Salto de línea"
          onClick={() => exec('insertHTML', '<br>')}
          disabled={disabled}
        />
        {onImageClick && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <ToolbarButton
              icon={<ImagePlus className="h-3.5 w-3.5" />}
              label="Adjuntar imagen"
              onClick={onImageClick}
              disabled={imageDisabled}
            />
          </>
        )}
        <div className="ml-auto text-[10px] text-muted-foreground pr-1">
          {visibleLength} / 5000
        </div>
      </div>

      {/* Editor */}
      <div className="relative">
        <div
          ref={ref}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={emitChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={cn(
            'min-h-32 max-h-64 overflow-y-auto px-3 py-3 text-sm leading-relaxed focus:outline-none',
            // Estilado de tags inline (lo que renderiza dentro del editor)
            '[&_b]:font-semibold [&_strong]:font-semibold',
            '[&_i]:italic [&_em]:italic',
            '[&_a]:text-[#1F8DED] [&_a]:underline',
            disabled && 'opacity-50 cursor-not-allowed bg-muted/30',
          )}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute top-3 left-3 text-sm text-muted-foreground">
            {placeholder}
          </div>
        )}
      </div>
    </>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      // Evitamos que el blur del editor mueva el cursor antes de aplicar el cmd
      onMouseDown={(e) => e.preventDefault()}
      className="h-7 w-7 p-0"
    >
      {icon}
    </Button>
  );
}

// ==================== ADMIN COMBOBOX (searchable) ====================

function AdminCombobox({
  label,
  placeholder,
  admins,
  value,
  onChange,
  allowNone = false,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  admins: IntercomAdminOption[];
  value: IntercomAdminOption | null;
  onChange: (id: string) => void;
  allowNone?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const lower = q.trim().toLowerCase();
    if (!lower) return admins;
    return admins.filter(
      (a) =>
        a.name.toLowerCase().includes(lower) ||
        a.email.toLowerCase().includes(lower) ||
        (a.jobTitle?.toLowerCase().includes(lower) ?? false),
    );
  }, [admins, q]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQ('');
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 h-7 px-2 min-w-[160px] text-xs rounded-md border bg-background cursor-pointer [&_*]:cursor-pointer',
              'hover:bg-accent transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {value ? (
              <>
                <Avatar className="size-4">
                  <AvatarFallback className="text-[8px] bg-muted">
                    {initials(value.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate flex-1 text-left">{value.name}</span>
                {value.awayMode && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 ml-1"
                  >
                    ausente
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-muted-foreground flex-1 text-left">
                {placeholder}
              </span>
            )}
            <ChevronsUpDownSmall />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[280px] p-0"
          align="start"
          sideOffset={4}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar admin…"
              value={q}
              onValueChange={setQ}
            />
            <CommandList>
              {allowNone && (
                <CommandGroup>
                  <CommandItem
                    value="__none__"
                    onSelect={() => pick(NO_ASSIGNEE)}
                    className="text-muted-foreground"
                  >
                    {placeholder}
                  </CommandItem>
                </CommandGroup>
              )}
              {filtered.length === 0 && (
                <CommandEmpty>Sin resultados</CommandEmpty>
              )}
              {filtered.length > 0 && (
                <CommandGroup>
                  {filtered.map((a) => (
                    <CommandItem
                      key={a.id}
                      value={a.id}
                      onSelect={() => pick(a.id)}
                      className="flex items-center gap-2 py-2"
                    >
                      <Avatar className="size-6 flex-shrink-0">
                        <AvatarFallback className="text-[10px] bg-muted">
                          {initials(a.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium truncate">
                            {a.name}
                          </span>
                          {a.awayMode && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0"
                            >
                              ausente
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {a.email}
                          {a.jobTitle && ` · ${a.jobTitle}`}
                        </div>
                      </div>
                      <Check
                        className={cn(
                          'h-3.5 w-3.5 flex-shrink-0',
                          value?.id === a.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ChevronsUpDownSmall() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="opacity-50 flex-shrink-0"
    >
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}

// ==================== DRIVER COMBOBOX ====================

function DriverCombobox({
  value,
  onChange,
}: {
  value: DriverOption | null;
  onChange: (d: DriverOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/intercom/drivers?q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal, cache: 'no-store' },
        );
        const json = await res.json();
        setDrivers(json.drivers ?? []);
        setTruncated(json.truncated ?? false);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(handle);
      ctrl.abort();
    };
  }, [q, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex items-center gap-2 text-sm font-medium hover:underline text-foreground cursor-pointer [&_*]:cursor-pointer"
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          {value ? (
            <span className="truncate">{value.fullName}</span>
          ) : (
            <span>Buscar driver…</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start" sideOffset={8}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Nombre, teléfono, email, CI…"
            value={q}
            onValueChange={setQ}
          />
          <CommandList>
            {loading && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                Buscando…
              </div>
            )}
            {!loading && drivers.length === 0 && (
              <CommandEmpty>
                <div className="px-3 py-6 text-center space-y-1">
                  <p className="text-sm">Sin resultados</p>
                  <p className="text-xs text-muted-foreground">
                    Solo se muestran drivers con intercom_contact_id resuelto
                    (cron diario).
                  </p>
                </div>
              </CommandEmpty>
            )}
            {!loading && drivers.length > 0 && (
              <CommandGroup>
                {drivers.map((d) => (
                  <CommandItem
                    key={d.driverId}
                    value={d.driverId}
                    onSelect={() => {
                      onChange(d);
                      setOpen(false);
                      setQ('');
                    }}
                    className="flex items-center gap-2 py-2"
                  >
                    <Avatar className="size-7 flex-shrink-0">
                      <AvatarFallback className="text-[10px] bg-[#1F8DED]/10 text-[#1F8DED]">
                        {initials(d.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {d.fullName}
                        </span>
                        {d.primaryZone && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0"
                          >
                            {d.primaryZone}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {d.phone ?? '—'}
                        {d.documentNumber && ` · CI ${d.documentNumber}`}
                      </div>
                    </div>
                    <Check
                      className={cn(
                        'h-4 w-4 flex-shrink-0',
                        value?.driverId === d.driverId
                          ? 'opacity-100'
                          : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
                {truncated && (
                  <div className="px-3 py-2 text-center text-[11px] text-muted-foreground border-t">
                    Mostrando los primeros 50. Refiná la búsqueda para ver más.
                  </div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ==================== CONVERSATIONS VIEW (2 columnas) ====================

const CONVERSATIONS_POLL_MS = 45_000;

function ConversationsView() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selected, setSelected] = useState<ConversationListItem | null>(null);
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ConversationListItem | null>(
    null,
  );
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selected?.conversationId ?? null;

  const loadList = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setListLoading(true);
    try {
      const res = await fetch('/api/intercom/conversations', {
        cache: 'no-store',
      });
      const json = await res.json();
      setConversations(json.conversations ?? []);
    } catch {
      if (!opts.silent) setConversations([]);
    } finally {
      if (!opts.silent) setListLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(
        `/api/intercom/conversation?conversationId=${encodeURIComponent(conversationId)}`,
        { cache: 'no-store' },
      );
      const json = await res.json();
      // Solo aplicar si sigue siendo la conversación abierta.
      if (selectedIdRef.current === conversationId) {
        setThread(json.thread ?? null);
      }
    } catch {
      /* silencioso en polling */
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Polling: refresca la lista (barato, lee el índice local) y el hilo abierto.
  useEffect(() => {
    const id = setInterval(() => {
      loadList({ silent: true });
      const convId = selectedIdRef.current;
      if (convId) loadThread(convId);
    }, CONVERSATIONS_POLL_MS);
    return () => clearInterval(id);
  }, [loadList, loadThread]);

  async function closeConv(conversationId: string) {
    setActioningId(conversationId);
    try {
      await fetch('/api/intercom/conversations/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.conversationId === conversationId ? { ...c, state: 'closed' } : c,
        ),
      );
      setSelected((s) =>
        s?.conversationId === conversationId ? { ...s, state: 'closed' } : s,
      );
    } finally {
      setActioningId(null);
    }
  }

  async function removeConv(conversationId: string) {
    setActioningId(conversationId);
    try {
      await fetch('/api/intercom/conversations/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
      setConversations((prev) =>
        prev.filter((c) => c.conversationId !== conversationId),
      );
      setSelected((s) =>
        s?.conversationId === conversationId ? null : s,
      );
    } finally {
      setActioningId(null);
    }
  }

  async function selectConversation(c: ConversationListItem) {
    setSelected(c);
    setThread(null);
    setThreadLoading(true);

    // Marcar leído (optimista en la lista) por conv_id.
    if (c.unread && c.conversationId) {
      const convId = c.conversationId;
      setConversations((prev) =>
        prev.map((x) =>
          x.conversationId === convId ? { ...x, unread: false } : x,
        ),
      );
      fetch('/api/intercom/conversations/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId }),
      }).catch(() => {});
    }

    if (!c.conversationId) {
      setThread(null);
      setThreadLoading(false);
      return;
    }

    setThreadLoading(true);
    await loadThread(c.conversationId);
    setThreadLoading(false);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-[600px] border rounded-lg overflow-hidden">
      {/* Lista */}
      <div className="border-r overflow-y-auto bg-muted/10">
        <div className="flex items-center justify-between px-3 py-2 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
          <span className="text-sm font-semibold">Conversaciones</span>
          <span
            className="text-[10px] text-muted-foreground"
            title="Se actualiza automáticamente cada 45s"
          >
            Auto · 45s
          </span>
        </div>

        {listLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            Todavía no hay conversaciones. Aparecen acá cuando enviás un mensaje
            o un driver responde.
          </div>
        ) : (
          <ul>
            {conversations.map((c) => (
              <li key={c.conversationId ?? c.contactId}>
                <button
                  type="button"
                  onClick={() => selectConversation(c)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 border-b flex items-center gap-3 cursor-pointer hover:bg-accent transition-colors',
                    selected?.conversationId === c.conversationId && 'bg-accent',
                  )}
                >
                  <Avatar className="size-9 flex-shrink-0">
                    <AvatarFallback className="bg-[#1F8DED]/10 text-[#1F8DED] text-xs font-semibold">
                      {initials(c.driverName ?? 'Driver')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'truncate text-sm',
                          c.unread ? 'font-semibold' : 'font-medium',
                        )}
                      >
                        {c.driverName ?? '(sin nombre)'}
                      </span>
                      {c.unread && (
                        <span className="size-2 rounded-full bg-[#1F8DED] flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.state === 'closed' ? 'Cerrada' : 'Abierta'}
                      {c.lastMessageAt &&
                        ` · ${formatChatTime(
                          Math.floor(new Date(c.lastMessageAt).getTime() / 1000),
                        )}`}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detalle / hilo */}
      <div className="flex flex-col min-w-0">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Elegí una conversación</p>
            <p className="text-xs text-muted-foreground mt-1">
              Seleccioná de la lista para ver el hilo completo.
            </p>
          </div>
        ) : (
          <>
            {/* Header del hilo */}
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
              <Avatar className="size-9 flex-shrink-0">
                <AvatarFallback className="bg-[#1F8DED]/10 text-[#1F8DED] text-xs font-semibold">
                  {initials(selected.driverName ?? 'Driver')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {selected.driverName ?? '(sin nombre)'}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {selected.driverPhone ?? '—'}
                  {' · '}
                  {selected.state === 'closed' ? 'Cerrada' : 'Abierta'}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {selected.conversationId && selected.state !== 'closed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    disabled={actioningId === selected.conversationId}
                    onClick={() => closeConv(selected.conversationId!)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Cerrar
                  </Button>
                )}
                {selected.conversationId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                    disabled={actioningId === selected.conversationId}
                    onClick={() => setRemoveTarget(selected)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,_theme(colors.muted.DEFAULT)_1px,_transparent_0)] [background-size:16px_16px] bg-background px-4 py-6 space-y-3">
              {threadLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !thread || thread.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-sm font-medium">Sin mensajes en el hilo</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Puede ser un envío outbound que el driver todavía no respondió
                    (no genera conversación de inbox hasta que conteste).
                  </p>
                </div>
              ) : (
                thread.messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))
              )}
            </div>

            {/* Footer read-only */}
            <div className="border-t px-4 py-3 bg-muted/20 text-xs text-muted-foreground text-center">
              Vista de solo lectura. Para responder, usá la pestaña{' '}
              <span className="font-medium">Enviar mensaje</span>.
            </div>
          </>
        )}
      </div>

      {/* Confirmación de eliminar (dialog con estilo de la app) */}
      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitar de la bandeja</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.driverName
                ? `Vas a quitar la conversación con ${removeTarget.driverName} de esta vista. `
                : 'Vas a quitar esta conversación de esta vista. '}
              No se borra de Intercom, solo deja de aparecer acá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (removeTarget?.conversationId) {
                  removeConv(removeTarget.conversationId);
                }
                setRemoveTarget(null);
              }}
            >
              Quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== SEGMENTOS ====================

interface SegmentShiftDto {
  shiftId: string;
  zoneName: string;
  dateIso: string;
  dayName: string;
  fromHour: number | null;
  toHour: number | null;
  paymentType: 'guaranteed' | 'per-order';
}

interface SegmentDriverDto {
  driverId: string;
  fullName: string;
  phone: string | null;
  primaryZone: string | null;
  linked: boolean;
  intercomContactId: string | null;
  intercomExternalId: string | null;
  shiftCount: number;
  shifts: SegmentShiftDto[];
  workedLastWeekDays: number;
  shiftsLast30d: number;
  hasConversation: boolean;
}

interface SegmentsDto {
  windowDays: number;
  windowFromIso: string;
  windowToIso: string;
  fetchedAt: string;
  attendanceMaxDay: string | null;
  errors: { zoneId: string; message: string }[];
  enabledFilter: EnabledFilter;
  conTurnos: SegmentDriverDto[];
  sinTurnos: SegmentDriverDto[];
  totals: {
    drivers: number;
    conTurnos: number;
    sinTurnos: number;
    linkedConTurnos: number;
    linkedSinTurnos: number;
    linkedTotal: number;
  };
}

type SegmentKey = 'con' | 'sin' | 'todos';
type EnabledFilter = 'enabled' | 'disabled' | 'all';

const PAGE_SIZE = 25;

function SegmentsView() {
  const [data, setData] = useState<SegmentsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<SegmentKey>('con');
  const [query, setQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('all');
  const [sinSort, setSinSort] = useState<'shifts30d' | 'name'>('shifts30d');
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>('enabled');
  const [excludeContacted, setExcludeContacted] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);

  const load = useCallback(
    async (fresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (fresh) params.set('fresh', '1');
        params.set('status', enabledFilter);
        const res = await fetch(`/api/intercom/segments?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        setData(json as SegmentsDto);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    },
    [enabledFilter],
  );

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpanded = useCallback((driverId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(driverId)) next.delete(driverId);
      else next.add(driverId);
      return next;
    });
  }, []);

  // Opciones de los filtros zona/día (derivadas de los turnos en la ventana).
  const zoneOptions = useMemo<string[]>(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const d of data.conTurnos)
      for (const s of d.shifts) if (s.zoneName) set.add(s.zoneName);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data]);

  const dayOptions = useMemo<{ value: string; label: string }[]>(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    for (const d of data.conTurnos)
      for (const s of d.shifts)
        if (!map.has(s.dateIso))
          map.set(s.dateIso, `${capitalize(s.dayName)} ${fmtSegDate(s.dateIso)}`);
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, label]) => ({ value, label }));
  }, [data]);

  // Los filtros zona/día solo aplican al detalle de turnos (segmento "con").
  const applyShiftFilters = useCallback(
    (driver: SegmentDriverDto): SegmentDriverDto => {
      if (zoneFilter === 'all' && dayFilter === 'all') return driver;
      const shifts = driver.shifts.filter(
        (s) =>
          (zoneFilter === 'all' || s.zoneName === zoneFilter) &&
          (dayFilter === 'all' || s.dateIso === dayFilter),
      );
      return { ...driver, shifts, shiftCount: shifts.length };
    },
    [zoneFilter, dayFilter],
  );

  const list = useMemo<SegmentDriverDto[]>(() => {
    if (!data) return [];
    if (segment === 'sin')
      return [...data.sinTurnos].sort((a, b) =>
        sinSort === 'name'
          ? a.fullName.localeCompare(b.fullName)
          : b.shiftsLast30d - a.shiftsLast30d ||
            a.fullName.localeCompare(b.fullName),
      );
    if (segment === 'con')
      return data.conTurnos
        .map(applyShiftFilters)
        .filter((d) => d.shifts.length > 0);
    // "todos": sin filtros zona/día (no aplican a drivers sin turnos)
    return [...data.conTurnos, ...data.sinTurnos].sort((a, b) =>
      a.fullName.localeCompare(b.fullName),
    );
  }, [data, segment, applyShiftFilters, sinSort]);

  const filtered = useMemo<SegmentDriverDto[]>(() => {
    const q = query.trim().toLowerCase();
    let res = list;
    if (q)
      res = res.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          (d.phone ?? '').toLowerCase().includes(q) ||
          (d.primaryZone ?? '').toLowerCase().includes(q) ||
          d.driverId.toLowerCase().includes(q),
      );
    if (excludeContacted) res = res.filter((d) => !d.hasConversation);
    return res;
  }, [list, query, excludeContacted]);

  // Reset de página al cambiar de vista; reset de selección al cambiar segmento
  // o estado (habilitados/deshabilitados son universos distintos).
  useEffect(() => {
    setPage(0);
  }, [
    segment,
    query,
    zoneFilter,
    dayFilter,
    sinSort,
    excludeContacted,
    enabledFilter,
  ]);
  useEffect(() => {
    setSelected(new Set());
  }, [segment, enabledFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  // Solo los vinculados pueden recibir mensajes → solo ellos son seleccionables.
  const selectableIds = useMemo(
    () => filtered.filter((d) => d.linked).map((d) => d.driverId),
    [filtered],
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selectableIds.some((id) => selected.has(id));

  const toggleSelected = useCallback((driverId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(driverId)) next.delete(driverId);
      else next.add(driverId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const all =
        selectableIds.length > 0 && selectableIds.every((id) => next.has(id));
      if (all) selectableIds.forEach((id) => next.delete(id));
      else selectableIds.forEach((id) => next.add(id));
      return next;
    });
  }, [selectableIds]);

  // Selección rápida: los primeros N vinculados en el orden actual del segmento
  // (p.ej. en "sin turnos" ordenado por 30d → los N más activos). Reemplaza la
  // selección actual.
  const selectFirst = useCallback(
    (n: number) => setSelected(new Set(selectableIds.slice(0, n))),
    [selectableIds],
  );

  // Selección por pegado de IDs (CSV / lista). Matchea cada token contra el
  // universo cargado por intercomContactId y, como fallback, por driverId. Solo
  // marca a los vinculados (los únicos que pueden recibir). Suma a la selección
  // actual (no la reemplaza) y devuelve el resumen para mostrar feedback.
  const applyPastedIds = useCallback(
    (raw: string) => {
      // Ignoramos encabezados típicos de CSV exportado (p.ej. "User ID").
      const HEADER_TOKENS = new Set([
        'user',
        'id',
        'userid',
        'driverid',
        'external_id',
        'externalid',
      ]);
      const tokens = [
        ...new Set(
          raw
            .split(/[\s,;]+/)
            .map((t) => t.trim().replace(/^["']+|["']+$/g, ''))
            .filter((t) => t && !HEADER_TOKENS.has(t.toLowerCase())),
        ),
      ];
      // El CSV de churns trae el "User ID" numérico de Monchis = intercomExternalId.
      // Igual aceptamos intercomContactId (hex) y driverId (ObjectId) como fallback.
      const lookup = new Map<string, SegmentDriverDto>();
      if (data) {
        for (const d of [...data.conTurnos, ...data.sinTurnos]) {
          lookup.set(d.driverId, d);
          if (d.intercomExternalId) lookup.set(d.intercomExternalId, d);
          if (d.intercomContactId) lookup.set(d.intercomContactId, d);
        }
      }
      const matchedIds = new Set<string>();
      const notFound: string[] = [];
      const notLinked: string[] = [];
      for (const tok of tokens) {
        const d = lookup.get(tok);
        if (!d) {
          notFound.push(tok);
        } else if (!d.linked || !d.intercomContactId) {
          notLinked.push(tok);
        } else {
          matchedIds.add(d.driverId);
        }
      }
      if (matchedIds.size > 0)
        setSelected((prev) => new Set([...prev, ...matchedIds]));
      return {
        matched: matchedIds.size,
        notFound,
        notLinked,
        total: tokens.length,
      };
    },
    [data],
  );

  const selectedDrivers = useMemo<SegmentDriverDto[]>(() => {
    if (!data || selected.size === 0) return [];
    const byId = new Map(
      [...data.conTurnos, ...data.sinTurnos].map((d) => [d.driverId, d]),
    );
    return [...selected]
      .map((id) => byId.get(id))
      .filter((d): d is SegmentDriverDto => Boolean(d));
  }, [data, selected]);

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Segmentos de drivers
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Drivers según sus turnos de los próximos {data?.windowDays ?? 3} días
            {data ? ` (hasta ${fmtSegDate(data.windowToIso)})` : ''}. El badge
            indica si están vinculados en Intercom.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-muted-foreground">
              {data.totals.linkedTotal} de {data.totals.drivers} vinculados
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
            />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={() => setComposerOpen(true)}
            disabled={selected.size === 0}
            className="gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            Enviar Comunicación
            {selected.size > 0 && ` (${selected.size})`}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, zona, teléfono…"
            className="w-full h-9 pl-9 pr-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <RadioGroup
          value={enabledFilter}
          onValueChange={(v) => setEnabledFilter(v as EnabledFilter)}
          className="flex items-center gap-4 h-9 px-3 rounded-md border bg-background"
        >
          {(
            [
              { value: 'enabled', label: 'Habilitados' },
              { value: 'disabled', label: 'Deshabilitados' },
              { value: 'all', label: 'Todos' },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              htmlFor={`enabled-${opt.value}`}
              className="flex items-center gap-1.5 text-sm cursor-pointer"
            >
              <RadioGroupItem
                id={`enabled-${opt.value}`}
                value={opt.value}
                className="cursor-pointer"
              />
              {opt.label}
            </label>
          ))}
        </RadioGroup>
        {segment === 'con' && (
          <>
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="h-9 w-full sm:w-44">
                <SelectValue placeholder="Zona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las zonas</SelectItem>
                {zoneOptions.map((z) => (
                  <SelectItem key={z} value={z}>
                    {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger className="h-9 w-full sm:w-44">
                <SelectValue placeholder="Día" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los días</SelectItem>
                {dayOptions.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        {segment === 'sin' && (
          <Select
            value={sinSort}
            onValueChange={(v) => setSinSort(v as 'shifts30d' | 'name')}
          >
            <SelectTrigger className="h-9 w-full sm:w-48">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shifts30d">Más turnos (30 días)</SelectItem>
              <SelectItem value="name">Nombre (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        )}
        <label className="flex items-center gap-2 text-sm whitespace-nowrap cursor-pointer h-9 px-1 sm:px-2">
          <Checkbox
            checked={excludeContacted}
            onCheckedChange={(v) => setExcludeContacted(v === true)}
          />
          <span className="text-muted-foreground">Excluir ya contactados</span>
        </label>
      </div>

      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        <SegmentTab
          active={segment === 'con'}
          onClick={() => setSegment('con')}
          label="Con turnos (3 días)"
          count={data?.totals.conTurnos}
        />
        <SegmentTab
          active={segment === 'sin'}
          onClick={() => setSegment('sin')}
          label="Sin turnos"
          count={data?.totals.sinTurnos}
        />
        <SegmentTab
          active={segment === 'todos'}
          onClick={() => setSegment('todos')}
          label="Todos"
          count={data?.totals.drivers}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {segment === 'sin' && data?.attendanceMaxDay && (
        <p className="text-xs text-muted-foreground">
          &quot;Trabajó&quot; usa la asistencia registrada de los últimos 7 días
          (datos hasta {fmtSegDate(data.attendanceMaxDay)}).
        </p>
      )}

      {!loading && selectableIds.length > 0 && (
        <div className="flex items-center justify-between gap-x-4 gap-y-2 px-1 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={
                  allSelected ? true : someSelected ? 'indeterminate' : false
                }
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-muted-foreground">
                Seleccionar vinculados ({selectableIds.length})
              </span>
            </label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Primeros:</span>
              {[50, 100, 150, 200, 300, 400, 500].map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={selectableIds.length < n}
                  onClick={() => selectFirst(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
            <PasteIdsButton onApply={applyPastedIds} />
            <UploadCsvButton onApply={applyPastedIds} />
          </div>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {selected.size} seleccionados · limpiar
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border divide-y max-h-[560px] overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <SegmentRowSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border divide-y max-h-[560px] overflow-y-auto">
          {visible.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No hay drivers en este segmento.
            </div>
          ) : (
            visible.map((d) => (
              <SegmentRow
                key={d.driverId}
                driver={d}
                expanded={expanded.has(d.driverId)}
                onToggle={() => toggleExpanded(d.driverId)}
                selected={selected.has(d.driverId)}
                onToggleSelect={() => toggleSelected(d.driverId)}
              />
            ))
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {filtered.length} driver{filtered.length === 1 ? '' : 's'} · página{' '}
            {safePage + 1} de {pageCount}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <BroadcastSheet
        open={composerOpen}
        onOpenChange={setComposerOpen}
        recipients={selectedDrivers}
        onSent={() => {
          setSelected(new Set());
          load();
        }}
      />
    </section>
  );
}

type PasteResult = {
  matched: number;
  notFound: string[];
  notLinked: string[];
  total: number;
};

function PasteIdsButton({
  onApply,
}: {
  onApply: (raw: string) => PasteResult;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [result, setResult] = useState<PasteResult | null>(null);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setResult(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Pegar IDs
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-2">
        <div>
          <p className="text-sm font-medium">Seleccionar por ID</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pegá los User ID (columna del CSV de churns), uno por línea o
            separados por coma. Se marcan los vinculados del universo cargado y
            se suman a la selección actual.
          </p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={'User ID\n3693715\n6270491'}
          className="w-full resize-y rounded-md border bg-background p-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring/40"
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setText('');
              setResult(null);
            }}
            className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
          >
            Limpiar
          </button>
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={!text.trim()}
            onClick={() => setResult(onApply(text))}
          >
            Seleccionar
          </Button>
        </div>
        {result && <PasteSummary result={result} />}
      </PopoverContent>
    </Popover>
  );
}

function PasteSummary({ result }: { result: PasteResult }) {
  return (
    <div className="space-y-1 rounded-md border bg-muted/40 p-2 text-xs">
      <div className="flex items-center gap-1.5 text-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        {result.matched} agregado{result.matched === 1 ? '' : 's'} a la
        selección
      </div>
      {result.notLinked.length > 0 && (
        <div className="text-warning">
          {result.notLinked.length} sin vincular en Intercom (omitidos)
        </div>
      )}
      {result.notFound.length > 0 && (
        <div className="text-muted-foreground">
          {result.notFound.length} no encontrado
          {result.notFound.length === 1 ? '' : 's'} en el universo cargado
        </div>
      )}
    </div>
  );
}

// CSV multi-columna: si hay encabezado con una columna de ID reconocible, se
// extrae solo esa columna; si no, se pasa el texto entero (el matcher tolera
// tokens que no son IDs, solo suman "no encontrados").
function extractIdsFromCsv(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return text;
  const splitRow = (l: string) =>
    l.split(/[,;\t]/).map((c) => c.trim().replace(/^["']+|["']+$/g, ''));
  const header = splitRow(lines[0]);
  if (header.length < 2) return text;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const ID_HEADERS = ['userid', 'id', 'externalid', 'driverid'];
  const idx = header.findIndex((h) => ID_HEADERS.includes(norm(h)));
  if (idx === -1) return text;
  return lines
    .slice(1)
    .map((l) => splitRow(l)[idx] ?? '')
    .filter(Boolean)
    .join('\n');
}

function UploadCsvButton({
  onApply,
}: {
  onApply: (raw: string) => PasteResult;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<PasteResult | null>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    setFileName(file.name);
    setResult(onApply(extractIdsFromCsv(text)));
    setOpen(true);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="h-3.5 w-3.5" />
          Subir CSV
        </Button>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-80 space-y-2">
        <div>
          <p className="text-sm font-medium">Seleccionar por CSV</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {fileName}
          </p>
        </div>
        {result && <PasteSummary result={result} />}
      </PopoverContent>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = '';
        }}
      />
    </Popover>
  );
}

function SegmentTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer',
        active
          ? 'bg-background shadow-sm text-[#1F8DED]'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      {typeof count === 'number' && (
        <span className="ml-1.5 text-xs text-muted-foreground">{count}</span>
      )}
    </button>
  );
}

function SegmentRowSkeleton() {
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-4 rounded-sm" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

function SegmentRow({
  driver,
  expanded,
  onToggle,
  selected,
  onToggleSelect,
}: {
  driver: SegmentDriverDto;
  expanded: boolean;
  onToggle: () => void;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const hasShifts = driver.shifts.length > 0;
  return (
    <div className="px-3 py-2.5">
      <div
        className={cn(
          'flex items-center gap-3',
          hasShifts && 'cursor-pointer',
        )}
        onClick={hasShifts ? onToggle : undefined}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          disabled={!driver.linked}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Seleccionar ${driver.fullName}`}
          className="flex-shrink-0"
        />
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs bg-muted">
            {initials(driver.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{driver.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {[
              driver.primaryZone,
              driver.phone,
              !hasShifts && driver.workedLastWeekDays > 0
                ? `activo ${driver.workedLastWeekDays}d últ. sem.`
                : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Sin datos'}
          </p>
        </div>
        {!hasShifts && (
          <Badge
            variant="secondary"
            className="text-[11px] flex-shrink-0 tabular-nums"
          >
            {driver.shiftsLast30d} {driver.shiftsLast30d === 1 ? 'turno' : 'turnos'}{' '}
            · 30d
          </Badge>
        )}
        {driver.hasConversation && (
          <Badge
            variant="outline"
            className="gap-1 border-info bg-info-soft text-info text-[11px] font-medium flex-shrink-0"
          >
            <MessageSquare className="h-3 w-3" />
            Chat iniciado
          </Badge>
        )}
        {driver.linked ? (
          <Badge
            variant="outline"
            className="gap-1 border-success bg-success-soft text-success text-[11px] font-medium flex-shrink-0"
          >
            <IntercomIcon className="h-3 w-3" />
            En Intercom
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-[11px] text-muted-foreground flex-shrink-0"
          >
            Sin vincular
          </Badge>
        )}
        {hasShifts && (
          <>
            <Badge
              variant="secondary"
              className="text-[11px] flex-shrink-0 tabular-nums"
            >
              {driver.shiftCount} turno{driver.shiftCount === 1 ? '' : 's'}
            </Badge>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform flex-shrink-0',
                expanded && 'rotate-180',
              )}
            />
          </>
        )}
      </div>

      {hasShifts && expanded && (
        <div className="mt-2 ml-11 space-y-1">
          {driver.shifts.map((s) => (
            <div
              key={s.shiftId}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span className="font-medium text-foreground tabular-nums">
                {capitalize(s.dayName)} {fmtSegDate(s.dateIso)}
              </span>
              <span className="tabular-nums">
                {fmtSegHour(s.fromHour)}–{fmtSegHour(s.toHour)}
              </span>
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {s.zoneName}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== BROADCAST SHEET ====================

interface BroadcastResponse {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  results: { driverId: string; status: 'sent' | 'failed'; error?: string }[];
}

// Por debajo del MAX_RECIPIENTS (300) del route; el "sin límite" lo da el
// chunking secuencial del cliente.
const BROADCAST_CHUNK_SIZE = 150;

function BroadcastSheet({
  open,
  onOpenChange,
  recipients,
  onSent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipients: SegmentDriverDto[];
  onSent: () => void;
}) {
  const [admins, setAdmins] = useState<IntercomAdminOption[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [adminsError, setAdminsError] = useState<string | null>(null);
  const [senderId, setSenderId] = useState('');
  const [assigneeId, setAssigneeId] = useState(NO_ASSIGNEE);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{
    batch: number;
    batches: number;
    sent: number;
    total: number;
  } | null>(null);
  const [result, setResult] = useState<BroadcastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [tagId, setTagId] = useState('');
  const [closeAfter, setCloseAfter] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setUploadError(null);
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      setUploadError(`Máximo ${MAX_ATTACHMENTS} imágenes por mensaje`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const uploaded: Attachment[] = [];
      for (const file of toUpload) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/intercom/upload-attachment', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `Error subiendo ${file.name}`);
        uploaded.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url: json.url,
          filename: json.filename,
          size: json.size,
          type: json.type,
        });
      }
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  useEffect(() => {
    if (!open || admins.length > 0) return;
    setAdminsLoading(true);
    fetch('/api/intercom/admins', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setAdminsError(json.error);
        else setAdmins(json.admins ?? []);
      })
      .catch((err) => setAdminsError(String(err)))
      .finally(() => setAdminsLoading(false));
  }, [open, admins.length]);

  useEffect(() => {
    if (!open || tags.length > 0) return;
    fetch('/api/intercom/tags', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) return;
        const list: { id: string; name: string }[] = json.tags ?? [];
        setTags(list);
        // Preseleccionar "Bonos Semanales" por defecto (si no hay otra elegida).
        const def = list.find((t) => t.name === 'Bonos Semanales');
        if (def) setTagId((prev) => prev || def.id);
      })
      .catch(() => {});
  }, [open, tags.length]);

  // Limpiar el resultado al reabrir (para una nueva difusión).
  useEffect(() => {
    if (open) {
      setResult(null);
      setError(null);
    }
  }, [open]);

  const sender = useMemo(
    () => admins.find((a) => a.id === senderId) ?? null,
    [admins, senderId],
  );
  const assignee = useMemo(
    () =>
      assigneeId === NO_ASSIGNEE
        ? null
        : admins.find((a) => a.id === assigneeId) ?? null,
    [admins, assigneeId],
  );

  const recipientCount = recipients.length;
  const hasContent = body.trim().length > 0 || attachments.length > 0;
  // Si se cierra al enviar, la etiqueta es obligatoria: sin ella el cierre
  // dispara el workflow de CSAT ("Gracias por tu calificación") y reabre la conv.
  const needsTag = closeAfter && !tagId;
  const canSend =
    recipientCount > 0 &&
    !!senderId &&
    hasContent &&
    !uploading &&
    !sending &&
    !needsTag;

  // Sin límite de destinatarios: el cliente parte la selección en tandas por
  // debajo del MAX_RECIPIENTS del route (el envío server-side es secuencial
  // dentro del request y está acotado por el maxDuration de Vercel).
  async function runSend(driverIds: string[]) {
    if (!senderId || !hasContent || driverIds.length === 0) return;
    setSending(true);
    setError(null);
    setResult(null);

    const batches: string[][] = [];
    for (let i = 0; i < driverIds.length; i += BROADCAST_CHUNK_SIZE) {
      batches.push(driverIds.slice(i, i + BROADCAST_CHUNK_SIZE));
    }

    const combined: BroadcastResponse = {
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      results: [],
    };
    let anyOk = false;
    let firstError: string | null = null;

    try {
      for (let b = 0; b < batches.length; b++) {
        setProgress({
          batch: b + 1,
          batches: batches.length,
          sent: combined.sent,
          total: driverIds.length,
        });
        try {
          const res = await fetch('/api/intercom/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              driverIds: batches[b],
              senderAdminId: senderId,
              assigneeAdminId: assigneeId === NO_ASSIGNEE ? null : assigneeId,
              subject,
              body,
              attachmentUrls: attachments.map((a) => a.url),
              tagId: tagId || null,
              closeAfter,
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            const msg: string = json.error ?? `Error ${res.status}`;
            firstError ??= msg;
            combined.total += batches[b].length;
            combined.failed += batches[b].length;
            combined.results.push(
              ...batches[b].map((driverId) => ({
                driverId,
                status: 'failed' as const,
                error: msg,
              })),
            );
          } else {
            anyOk = true;
            const r = json as BroadcastResponse;
            combined.total += r.total;
            combined.sent += r.sent;
            combined.failed += r.failed;
            combined.skipped += r.skipped;
            combined.results.push(...r.results);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          firstError ??= msg;
          combined.total += batches[b].length;
          combined.failed += batches[b].length;
          combined.results.push(
            ...batches[b].map((driverId) => ({
              driverId,
              status: 'failed' as const,
              error: msg,
            })),
          );
        }
      }

      if (!anyOk) {
        setError(firstError ?? 'Error desconocido');
      } else {
        setResult(combined);
        // Si hubo fallidos se conserva el mensaje para poder reintentar
        // solo esos destinatarios.
        if (combined.failed === 0) {
          setSubject('');
          setBody('');
          setAttachments([]);
        }
        onSent();
      }
    } finally {
      setSending(false);
      setProgress(null);
    }
  }

  function handleSend() {
    void runSend(recipients.map((r) => r.driverId));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b text-left">
          <SheetTitle>Enviar comunicación</SheetTitle>
          <SheetDescription>
            Difusión 1-1 via Intercom a {recipientCount} driver
            {recipientCount === 1 ? '' : 's'}. Cada uno la recibe en su Messenger
            y la conversación queda en la pestaña Conversaciones.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="h-5 w-5" />
                Difusión enviada
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <ResultStat label="Enviados" value={result.sent} tone="ok" />
                <ResultStat label="Fallidos" value={result.failed} tone="err" />
                <ResultStat label="Omitidos" value={result.skipped} tone="mut" />
              </div>
              {result.skipped > 0 && (
                <p className="text-xs text-muted-foreground">
                  Omitidos = seleccionados sin vincular en Intercom (no se les
                  puede enviar).
                </p>
              )}
              {result.failed > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive space-y-1 max-h-40 overflow-y-auto">
                  {result.results
                    .filter((r) => r.status === 'failed')
                    .slice(0, 20)
                    .map((r) => (
                      <div key={r.driverId}>
                        {r.driverId}: {r.error ?? 'error'}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Destinatarios ({recipientCount})
                </p>
                {recipientCount === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay drivers seleccionados.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto rounded-md border bg-muted/30 p-2">
                    {recipients.map((r) => (
                      <Badge
                        key={r.driverId}
                        variant="secondary"
                        className="text-[11px] font-normal"
                      >
                        {r.fullName}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {adminsError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{adminsError}</span>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <AdminCombobox
                  label="Remitente"
                  placeholder={
                    adminsLoading ? 'Cargando…' : 'Elegir remitente'
                  }
                  admins={admins}
                  value={sender}
                  onChange={setSenderId}
                  disabled={adminsLoading}
                />
                <AdminCombobox
                  label="Asignar a"
                  placeholder="Sin asignar"
                  admins={admins}
                  value={assignee}
                  onChange={setAssigneeId}
                  allowNone
                  disabled={adminsLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Asunto (opcional)
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Título destacado del mensaje"
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Mensaje
                </label>
                <RichEditor
                  value={body}
                  onChange={setBody}
                  disabled={sending}
                  placeholder="Escribí el mensaje a difundir…"
                  onImageClick={() => fileInputRef.current?.click()}
                  imageDisabled={
                    sending || uploading || attachments.length >= MAX_ATTACHMENTS
                  }
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFiles(e.target.files);
                    }
                  }}
                />
                {(attachments.length > 0 || uploading || uploadError) && (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/10 p-2 overflow-x-auto">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="relative flex-shrink-0 group rounded-md overflow-hidden border bg-background"
                      >
                        <img
                          src={att.url}
                          alt={att.filename}
                          className="h-16 w-16 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          aria-label="Eliminar imagen"
                          className="absolute top-0.5 right-0.5 size-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/90"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {uploading && (
                      <div className="h-16 w-16 rounded-md border border-dashed flex items-center justify-center bg-muted/30 flex-shrink-0">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {uploadError && (
                      <div className="flex items-center gap-1.5 text-xs text-destructive ml-2">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {uploadError}
                      </div>
                    )}
                    {attachments.length > 0 && (
                      <div className="ml-auto text-[10px] text-muted-foreground flex-shrink-0">
                        {attachments.length} / {MAX_ATTACHMENTS}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Etiqueta en Intercom (opcional)
                  </label>
                  <Select
                    value={tagId || 'none'}
                    onValueChange={(v) => setTagId(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sin etiqueta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin etiqueta</SelectItem>
                      {tags.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={closeAfter}
                    onCheckedChange={(v) => setCloseAfter(v === true)}
                  />
                  <span>Cerrar la conversación al enviar</span>
                </label>
                {closeAfter && !tagId && (
                  <p className="flex items-start gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      Para cerrar al enviar necesitás elegir una etiqueta
                      (&quot;Bonos Semanales&quot;). Sin ella, el cierre dispara
                      el &quot;Gracias por tu calificación&quot; y reabre la
                      conversación. El envío está bloqueado hasta elegirla.
                    </span>
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        <SheetFooter className="px-5 py-4 border-t flex-row items-center justify-end gap-2">
          {sending && progress && progress.batches > 1 && (
            <span className="mr-auto text-xs tabular-nums text-muted-foreground">
              Tanda {progress.batch}/{progress.batches} · {progress.sent}/
              {progress.total} enviados
            </span>
          )}
          {result ? (
            <>
              {result.failed > 0 && (
                <Button
                  variant="outline"
                  disabled={sending}
                  className="gap-2"
                  onClick={() =>
                    void runSend(
                      result.results
                        .filter((r) => r.status === 'failed')
                        .map((r) => r.driverId),
                    )
                  }
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Reintentar fallidos ({result.failed})
                </Button>
              )}
              <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={sending}
              >
                Cancelar
              </Button>
              <Button onClick={handleSend} disabled={!canSend} className="gap-2">
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sending ? 'Enviando…' : `Enviar a ${recipientCount}`}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ResultStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'ok' | 'err' | 'mut';
}) {
  return (
    <div className="rounded-md border p-2">
      <div
        className={cn(
          'text-lg font-semibold tabular-nums',
          tone === 'ok' && 'text-success',
          tone === 'err' && value > 0 && 'text-destructive',
          tone === 'mut' && 'text-muted-foreground',
        )}
      >
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

// ==================== COMING SOON ====================

function ComingSoonSection() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Próximamente
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Funcionalidades en backlog para esta sección.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ComingSoonCard
          icon={<Send className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-500/10"
          title="Envío masivo"
          description="Cargar un CSV con drivers y mandar el mismo mensaje (o uno con variables) a todos. Pendiente formato del CSV."
        />
        <ComingSoonCard
          icon={<Zap className="h-5 w-5 text-warning" />}
          iconBg="bg-warning/10"
          title="Triggers automáticos"
          description="Eventos del sistema (turno asignado, pedido rechazado, etc.) que disparan mensajes 1-1 sin intervención manual."
        />
      </div>
    </section>
  );
}

function ComingSoonCard({
  icon,
  iconBg,
  title,
  description,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-2 opacity-60 bg-muted/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-lg flex-shrink-0', iconBg)}>
            {icon}
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

// ==================== INFO FOOTER ====================

function InfoFooter() {
  return (
    <footer>
      <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-4">
        <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Cómo funciona el sandbox</p>
          <p className="text-sm text-muted-foreground">
            El envío crea una conversación 1-1 admin → user via{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              POST /messages
            </code>
            . Si el assignee es distinto del sender, se asigna después con{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              POST /conversations/&#123;id&#125;/parts
            </code>
            . Solo se listan drivers con{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              intercom_contact_id
            </code>{' '}
            ya resuelto en DB (los nuevos los engancha el cron diario de
            sincronización).
          </p>
        </div>
      </div>
    </footer>
  );
}

// ==================== HELPERS ====================

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtSegHour(h: number | null): string {
  if (h == null) return '—';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function fmtSegDate(iso: string): string {
  const [, m, d] = iso.split('-');
  if (!m || !d) return iso;
  return `${d}/${m}`;
}

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '·';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatChatTime(epochSeconds: number): string {
  if (!epochSeconds) return '';
  const date = new Date(epochSeconds * 1000);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
