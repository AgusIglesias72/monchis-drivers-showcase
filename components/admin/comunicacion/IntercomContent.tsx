// components/admin/comunicacion/IntercomContent.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  XCircle,
  Bold,
  Italic,
  Link as LinkIcon,
  CornerDownLeft,
  X,
  MessageSquare,
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
}

const NO_ASSIGNEE = '__none__';

// ==================== ROOT ====================

export function IntercomContent() {
  return (
    <div className="space-y-8">
      <Header />
      <Separator />
      <StatusSection />
      <Separator />
      <SandboxSection />
      <Separator />
      <ComingSoonSection />
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
        <h1 className="text-3xl font-bold tracking-tight">Intercom</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Sandbox para enviar mensajes 1-1 a drivers via Intercom desde el
          panel. Cada envío queda registrado en{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
            intercom_message_log
          </code>
          .
        </p>
      </div>
    </header>
  );
}

// ==================== STATUS ====================

function StatusSection() {
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

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Estado del conector
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Health check contra la API de Intercom (GET /me).
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="text-xs"
        >
          Reintentar
        </Button>
      </div>

      <div className="flex items-center gap-3 rounded-md border bg-card p-4">
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Verificando…</span>
          </>
        ) : health?.ok ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div className="flex-1">
              <div className="text-sm font-medium">OK</div>
              {health.workspace && (
                <div className="text-xs text-muted-foreground">
                  Workspace{' '}
                  <span className="font-mono">{health.workspace.name}</span>{' '}
                  · región {health.workspace.region}
                </div>
              )}
            </div>
            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
              Conectado
            </Badge>
          </>
        ) : (
          <>
            <XCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <div className="text-sm font-medium">Sin conexión</div>
              <div className="text-xs text-muted-foreground">
                {health?.error ?? 'Error desconocido'}
              </div>
            </div>
            <Badge variant="destructive">Down</Badge>
          </>
        )}
      </div>
    </section>
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
  const [body, setBody] = useState('');
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

  const canSend =
    !!driver?.intercomContactId &&
    !!senderId &&
    body.trim().length > 0 &&
    !sending;

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
          body,
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
          message: 'Mensaje enviado',
          conversationId: json.conversationId,
        });
        setBody('');
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

        {/* ===== Chat body (preview) ===== */}
        <ChatBody body={body} sender={sender} result={result} />

        {/* ===== Composer ===== */}
        <ChatComposer
          body={body}
          onBodyChange={setBody}
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
                  Sender: <strong>{sender?.name ?? '—'}</strong>
                </div>
                <div>
                  Assignee:{' '}
                  <strong>{assignee?.name ?? 'sin asignar'}</strong>
                </div>
                <div
                  className="rounded border bg-muted/50 p-2 max-h-32 overflow-auto text-foreground"
                  dangerouslySetInnerHTML={{ __html: body }}
                />
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

// ==================== CHAT BODY (preview) ====================

function ChatBody({
  body,
  sender,
  result,
}: {
  body: string;
  sender: IntercomAdminOption | null;
  result: SendResult;
}) {
  const hasContent = body.trim().length > 0;

  return (
    <div className="min-h-[280px] max-h-[420px] overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,_theme(colors.muted.DEFAULT)_1px,_transparent_0)] [background-size:16px_16px] bg-background px-4 py-6">
      {!hasContent ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Sin mensajes todavía</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Escribí abajo y el preview aparecerá acá como burbuja del admin.
          </p>
        </div>
      ) : (
        <div className="flex items-end gap-2 justify-end">
          <div className="max-w-[75%] space-y-1">
            <div
              className="rounded-2xl rounded-br-sm bg-[#1F8DED] text-white px-4 py-2.5 text-sm leading-relaxed shadow-sm"
              dangerouslySetInnerHTML={{ __html: body }}
            />
            <div className="text-[10px] text-muted-foreground text-right">
              {sender ? sender.name : 'Sender no seleccionado'} · preview
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
        <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-emerald-700 dark:text-emerald-400">
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
        <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {result.message}
        </div>
      )}
    </div>
  );
}

// ==================== CHAT COMPOSER ====================

function ChatComposer({
  body,
  onBodyChange,
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
  body: string;
  onBodyChange: (b: string) => void;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(open: string, close: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.slice(start, end);
    const next =
      body.slice(0, start) + open + selected + close + body.slice(end);
    onBodyChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + open.length, end + open.length);
    });
  }

  function insertAtCursor(text: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = body.slice(0, start) + text + body.slice(end);
    onBodyChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + text.length, start + text.length);
    });
  }

  function insertLink() {
    const url = window.prompt('URL del enlace:', 'https://');
    if (!url) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.slice(start, end) || 'click acá';
    wrapSelection(
      `<a href="${url}" target="_blank" rel="noopener noreferrer">`,
      '</a>',
    );
    // Si no había selección, reemplazo el placeholder
    if (start === end) {
      requestAnimationFrame(() => {
        ta.focus();
      });
    }
    void selected;
  }

  return (
    <div className="border-t bg-card">
      {/* Toolbar de formato */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b">
        <ToolbarButton
          icon={<Bold className="h-3.5 w-3.5" />}
          label="Negrita"
          onClick={() => wrapSelection('<b>', '</b>')}
        />
        <ToolbarButton
          icon={<Italic className="h-3.5 w-3.5" />}
          label="Cursiva"
          onClick={() => wrapSelection('<i>', '</i>')}
        />
        <ToolbarButton
          icon={<LinkIcon className="h-3.5 w-3.5" />}
          label="Enlace"
          onClick={insertLink}
        />
        <ToolbarButton
          icon={<CornerDownLeft className="h-3.5 w-3.5" />}
          label="Salto de línea"
          onClick={() => insertAtCursor('<br>\n')}
        />
        <div className="ml-auto text-[10px] text-muted-foreground pr-1">
          {body.length} / 5000
        </div>
      </div>

      {/* Textarea — el editor */}
      <Textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        placeholder={
          driver
            ? `Escribí un mensaje para ${driver.fullName}…`
            : 'Primero seleccioná un driver arriba…'
        }
        disabled={!driver}
        className="min-h-32 max-h-64 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-y text-sm leading-relaxed shadow-none"
        maxLength={5000}
      />

      {/* Footer: De / Asignar a + botón Enviar */}
      <div className="flex items-center justify-between gap-2 border-t px-3 py-2 bg-muted/20 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <AdminPickerInline
            label="De"
            placeholder={
              adminsLoading ? 'Cargando…' : 'Seleccionar sender'
            }
            admins={admins}
            value={sender}
            onChange={onSenderChange}
            disabled={adminsLoading}
          />
          <span className="text-muted-foreground text-xs">·</span>
          <AdminPickerInline
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

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="h-7 w-7 p-0"
    >
      {icon}
    </Button>
  );
}

// ==================== INLINE ADMIN PICKER ====================

function AdminPickerInline({
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
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <Select
        value={value?.id ?? (allowNone ? NO_ASSIGNEE : '')}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger
          size="sm"
          className="h-7 min-w-[160px] text-xs bg-background gap-2"
        >
          <SelectValue placeholder={placeholder}>
            {value ? (
              <span className="flex items-center gap-1.5">
                <Avatar className="size-4">
                  <AvatarFallback className="text-[8px] bg-muted">
                    {initials(value.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{value.name}</span>
              </span>
            ) : allowNone ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowNone && (
            <SelectItem value={NO_ASSIGNEE}>
              <span className="text-muted-foreground">{placeholder}</span>
            </SelectItem>
          )}
          {admins.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              <span className="flex items-center gap-2">
                <Avatar className="size-5">
                  <AvatarFallback className="text-[9px] bg-muted">
                    {initials(a.name)}
                  </AvatarFallback>
                </Avatar>
                <span>{a.name}</span>
                {a.awayMode && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    away
                  </Badge>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
          className="flex items-center gap-2 text-sm font-medium hover:underline text-foreground"
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
