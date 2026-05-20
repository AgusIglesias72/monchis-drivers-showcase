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
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
        </TabsList>

        <TabsContent value="enviar" className="space-y-8 mt-6">
          <SandboxSection />
          <Separator />
          <ComingSoonSection />
        </TabsContent>

        <TabsContent value="conversaciones" className="mt-6">
          <ConversationsView />
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
            ? 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30'
            : 'text-destructive border-destructive/30 bg-destructive/10',
      )}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span
          className={cn(
            'size-2 rounded-full',
            ok ? 'bg-emerald-500' : 'bg-destructive',
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

  // Historial de la conversación de Intercom con el driver seleccionado.
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  const loadThread = useCallback(async (contactId: string) => {
    setThreadLoading(true);
    try {
      const res = await fetch(
        `/api/intercom/conversation?contactId=${encodeURIComponent(contactId)}`,
        { cache: 'no-store' },
      );
      const json = await res.json();
      setThread(json.thread ?? null);
    } catch {
      setThread(null);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  // Al cambiar de driver, cargar su conversación.
  useEffect(() => {
    if (driver?.intercomContactId) {
      loadThread(driver.intercomContactId);
    } else {
      setThread(null);
    }
  }, [driver?.intercomContactId, loadThread]);

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
            json.deliveryMethod === 'outbound'
              ? 'Enviado al Messenger (aparecerá en el inbox cuando responda)'
              : 'Enviado a la conversación abierta (visible en el inbox)',
          conversationId: json.conversationId,
          deliveryMethod: json.deliveryMethod,
        });
        setSubject('');
        setBody('');
        setAttachments([]);
        // Refrescar el historial para que el mensaje nuevo aparezca en el hilo.
        // Pequeño delay para dar tiempo a que Intercom lo indexe.
        if (driver?.intercomContactId) {
          const contactId = driver.intercomContactId;
          setTimeout(() => loadThread(contactId), 1200);
        }
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

        {/* ===== Chat body (historial + preview) ===== */}
        <ChatBody
          subject={subject}
          body={body}
          attachments={attachments}
          sender={sender}
          result={result}
          thread={thread}
          threadLoading={threadLoading}
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

// ==================== CHAT BODY (historial + preview) ====================

function ChatBody({
  subject,
  body,
  attachments,
  sender,
  result,
  thread,
  threadLoading,
  driver,
}: {
  subject: string;
  body: string;
  attachments: Attachment[];
  sender: IntercomAdminOption | null;
  result: SendResult;
  thread: ConversationThread | null;
  threadLoading: boolean;
  driver: DriverOption | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasSubject = subject.trim().length > 0;
  const hasText = body.trim().length > 0;
  const hasAttachments = attachments.length > 0;
  const hasPreview = hasSubject || hasText || hasAttachments;
  const historyMessages = thread?.messages ?? [];
  const hasHistory = historyMessages.length > 0;

  // Auto-scroll al fondo cuando cambia el historial o el preview.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [historyMessages.length, hasPreview, threadLoading]);

  const showEmpty = !driver || (!hasHistory && !hasPreview && !threadLoading);

  return (
    <div
      ref={scrollRef}
      className="min-h-[320px] max-h-[460px] overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,_theme(colors.muted.DEFAULT)_1px,_transparent_0)] [background-size:16px_16px] bg-background px-4 py-6 space-y-3"
    >
      {showEmpty && (
        <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-center">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">
            {driver ? 'Sin conversación previa' : 'Sin mensajes todavía'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {driver
              ? 'Este driver no tiene conversaciones en Intercom. Tu mensaje iniciará una nueva.'
              : 'Seleccioná un driver para ver el historial de la conversación.'}
          </p>
        </div>
      )}

      {driver && threadLoading && !hasHistory && (
        <div className="flex items-center justify-center h-full min-h-[260px]">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Historial real de Intercom */}
      {historyMessages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

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
        <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-emerald-700 dark:text-emerald-400">
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

  // Pegado: forzamos plain text para no traer estilos raros del clipboard.
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
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

function ConversationsView() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selected, setSelected] = useState<ConversationListItem | null>(null);
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch('/api/intercom/conversations', {
        cache: 'no-store',
      });
      const json = await res.json();
      setConversations(json.conversations ?? []);
    } catch {
      setConversations([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function selectConversation(c: ConversationListItem) {
    setSelected(c);
    setThread(null);
    setThreadLoading(true);

    // Marcar leído (optimista en la lista).
    if (c.unread) {
      setConversations((prev) =>
        prev.map((x) =>
          x.contactId === c.contactId ? { ...x, unread: false } : x,
        ),
      );
      fetch('/api/intercom/conversations/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: c.contactId }),
      }).catch(() => {});
    }

    try {
      const res = await fetch(
        `/api/intercom/conversation?contactId=${encodeURIComponent(c.contactId)}`,
        { cache: 'no-store' },
      );
      const json = await res.json();
      setThread(json.thread ?? null);
    } catch {
      setThread(null);
    } finally {
      setThreadLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-[600px] border rounded-lg overflow-hidden">
      {/* Lista */}
      <div className="border-r overflow-y-auto bg-muted/10">
        <div className="flex items-center justify-between px-3 py-2 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
          <span className="text-sm font-semibold">Conversaciones</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadList}
            disabled={listLoading}
            className="h-7 px-2 text-xs"
          >
            Actualizar
          </Button>
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
              <li key={c.contactId}>
                <button
                  type="button"
                  onClick={() => selectConversation(c)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 border-b flex items-center gap-3 cursor-pointer hover:bg-accent transition-colors',
                    selected?.contactId === c.contactId && 'bg-accent',
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
          icon={<Zap className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-500/10"
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
