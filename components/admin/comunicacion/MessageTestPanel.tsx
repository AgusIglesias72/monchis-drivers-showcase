// components/admin/comunicacion/MessageTestPanel.tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Loader2,
  Send,
  ArrowLeft,
  Video,
  Phone,
  MoreVertical,
  Plus,
  Smile,
  Mic,
  Bold,
  Italic,
  Strikethrough,
  Code,
  User,
  CheckCheck,
  Wifi,
  BatteryFull,
  SignalHigh,
  Camera,
  ImagePlus,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { whatsappToHtml, interpolateVariables } from '@/lib/utils/whatsapp-format'

interface TemplateOption {
  id: string
  key: string
  name: string
  content: string
}

interface Props {
  templates: TemplateOption[]
}

type WrapChar = '*' | '_' | '~' | '`'
type BotState = 'checking' | 'connected' | 'offline'

export function MessageTestPanel({ templates }: Props) {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [sentAt, setSentAt] = useState<Date | null>(null)
  const [botState, setBotState] = useState<BotState>('checking')
  const [imageUrl, setImageUrl] = useState<string>('')
  const [imageUploading, setImageUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado del bot (compacto, sin panel grande).
  const checkBot = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/bot-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/qr-status' }),
      })
      const data = await res.json()
      setBotState(data?.connected ? 'connected' : 'offline')
    } catch {
      setBotState('offline')
    }
  }, [])

  useEffect(() => {
    checkBot()
    const interval = setInterval(checkBot, 15000)
    return () => clearInterval(interval)
  }, [checkBot])

  const firstName = name.trim().split(' ')[0] || 'Juan'
  const lastName = name.trim().split(' ').slice(1).join(' ') || 'Pérez'
  const previewVars = {
    nombre: firstName,
    name: firstName,
    firstname: firstName,
    fullname: name.trim() || 'Juan Pérez',
    apellido: lastName,
    lastname: lastName,
  }
  const previewHtml = whatsappToHtml(interpolateVariables(message, previewVars))
  const canSend =
    phone.trim().length >= 8 &&
    name.trim().length >= 2 &&
    (message.trim().length > 0 || !!imageUrl) &&
    !imageUploading

  const handleImagePick = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen')
      return
    }
    setImageUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.url) {
        setImageUrl(data.url)
      } else {
        toast.error(data.error || 'No se pudo subir la imagen')
      }
    } catch {
      toast.error('Error al subir la imagen')
    } finally {
      setImageUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const loadTemplate = (templateId: string) => {
    setSelectedTemplate(templateId)
    const t = templates.find(x => x.id === templateId)
    if (t) setMessage(t.content)
  }

  const wrapSelection = (wrap: WrapChar) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart ?? 0
    const end = ta.selectionEnd ?? 0
    const sel = message.slice(start, end)
    const next = message.slice(0, start) + wrap + sel + wrap + message.slice(end)
    setMessage(next)
    requestAnimationFrame(() => {
      ta.focus()
      if (sel.length > 0) ta.setSelectionRange(start + 1, end + 1)
      else ta.setSelectionRange(start + 1, start + 1)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return
    if (e.key.toLowerCase() === 'b') {
      e.preventDefault()
      wrapSelection('*')
    } else if (e.key.toLowerCase() === 'i') {
      e.preventDefault()
      wrapSelection('_')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSend || isLoading) return
    setIsLoading(true)
    try {
      const finalMessage = interpolateVariables(message, previewVars)
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          name: name.trim(),
          type: 'CUSTOM',
          customMessage: finalMessage,
          ...(imageUrl ? { imageUrl } : {}),
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSentAt(new Date())
        toast.success(`Mensaje enviado a ${phone.trim()}`, {
          description: data.warning || 'Llegó al WhatsApp del destinatario.',
        })
      } else {
        toast.error('No se pudo enviar', {
          description: data.error || 'Verificá que el bot esté conectado.',
        })
      }
    } catch {
      toast.error('Error de conexión', {
        description: 'No se pudo contactar al servidor. Probá de nuevo.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-stretch lg:justify-items-center">
      {/* Compositor — tarjeta vertical, mismo ancho que el celular */}
      <form onSubmit={handleSubmit} className="flex w-full max-w-[400px] flex-col">
        <div className="flex flex-1 flex-col rounded-xl border bg-card overflow-hidden">
          {/* Destinatario */}
          <div className="border-b divide-y">
            <label className="flex items-center gap-2.5 px-3.5 py-3">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-muted-foreground shrink-0 w-14">Para</span>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="595984123456"
                disabled={isLoading}
                inputMode="numeric"
                className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
            </label>
            <label className="flex items-center gap-2.5 px-3.5 py-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-muted-foreground shrink-0 w-14">Nombre</span>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Juan Pérez"
                disabled={isLoading}
                className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
            </label>
          </div>

          {/* Toolbar de formato */}
          <div className="flex items-center gap-0.5 border-b bg-muted/30 px-2 py-1">
            <FmtBtn label="Negrita (⌘B)" onClick={() => wrapSelection('*')}>
              <Bold className="h-3.5 w-3.5" />
            </FmtBtn>
            <FmtBtn label="Cursiva (⌘I)" onClick={() => wrapSelection('_')}>
              <Italic className="h-3.5 w-3.5" />
            </FmtBtn>
            <FmtBtn label="Tachado" onClick={() => wrapSelection('~')}>
              <Strikethrough className="h-3.5 w-3.5" />
            </FmtBtn>
            <FmtBtn label="Monoespaciado" onClick={() => wrapSelection('`')}>
              <Code className="h-3.5 w-3.5" />
            </FmtBtn>

            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            <FmtBtn
              label={imageUploading ? 'Subiendo imagen…' : 'Adjuntar imagen'}
              onClick={() => fileInputRef.current?.click()}
            >
              {imageUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
            </FmtBtn>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleImagePick(e.target.files?.[0])}
            />

            {templates.length > 0 && (
              <div className="ml-auto">
                <Select value={selectedTemplate} onValueChange={loadTemplate} disabled={isLoading}>
                  <SelectTrigger className="h-7 cursor-pointer border-0 bg-transparent text-xs text-muted-foreground hover:text-foreground gap-1 px-2 shadow-none focus:ring-0">
                    <SelectValue placeholder="Cargar plantilla" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-sm">
                        {t.name}
                        <span className="text-muted-foreground ml-1">({t.key})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Editor */}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={e => {
              setMessage(e.target.value)
              setSelectedTemplate('')
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={'¡Hola {nombre}!\n\nEscribí tu mensaje de prueba acá.\nUsá *negrita*, _cursiva_ y variables como {nombre}.'}
            className="flex-1 border-0 rounded-none font-mono text-sm leading-relaxed resize-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[340px]"
          />

          {/* Imagen adjunta */}
          {imageUrl && (
            <div className="flex items-center gap-3 border-t bg-muted/20 px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Adjunto"
                className="h-10 w-10 rounded object-cover border"
              />
              <span className="flex-1 text-xs text-muted-foreground truncate">
                Imagen adjunta — se envía con el mensaje como caption
              </span>
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="cursor-pointer text-muted-foreground hover:text-foreground"
                aria-label="Quitar imagen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Footer del compositor */}
          <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-3 py-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {message.length} caracteres
            </span>
            <Button type="submit" size="sm" disabled={!canSend || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Enviar prueba
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Hint variables */}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Variables disponibles:{' '}
          {['nombre', 'fullname', 'apellido'].map((v, i) => (
            <span key={v}>
              {i > 0 && ', '}
              <button
                type="button"
                onClick={() => {
                  setMessage(m => m + `{${v}}`)
                  textareaRef.current?.focus()
                }}
                className="cursor-pointer font-mono text-foreground/70 hover:text-foreground hover:underline"
              >
                {`{${v}}`}
              </button>
            </span>
          ))}
          . Se reemplazan con el nombre del destinatario al enviar.
        </p>
      </form>

      {/* Preview: mockup + estado del bot */}
      <div className="flex flex-col items-center gap-4 lg:sticky lg:top-6 self-start">
        <BotStatusBadge state={botState} />
        <PhoneMockup
          html={previewHtml}
          hasContent={!!message.trim() || !!imageUrl}
          imageUrl={imageUrl}
          sentAt={sentAt}
        />
        <p className="text-[11px] text-muted-foreground text-center max-w-[340px] leading-relaxed">
          Vista previa de cómo el postulante recibe el mensaje. La hora y el avatar
          son de ejemplo.
        </p>
      </div>
    </div>
  )
}

function FmtBtn({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function BotStatusBadge({ state }: { state: BotState }) {
  if (state === 'checking') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Verificando bot…
      </div>
    )
  }
  if (state === 'connected') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Bot conectado
      </div>
    )
  }
  return (
    <Link
      href="/admin/comunicaciones"
      className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 hover:underline"
    >
      <span className="h-2 w-2 rounded-full bg-red-500" />
      Bot desconectado · conectar
    </Link>
  )
}

function PhoneMockup({
  html,
  hasContent,
  imageUrl,
  sentAt,
}: {
  html: string
  hasContent: boolean
  imageUrl?: string
  sentAt: Date | null
}) {
  const now = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const justSent = sentAt && Date.now() - sentAt.getTime() < 6000

  return (
    <div className="w-[360px] max-w-full rounded-[3rem] border-[12px] border-neutral-900 bg-neutral-900 shadow-2xl select-none">
      {/* Notch */}
      <div className="relative">
        <div className="absolute left-1/2 top-0 z-20 h-7 w-36 -translate-x-1/2 rounded-b-2xl bg-neutral-900" />
      </div>

      <div className="overflow-hidden rounded-[2rem] bg-[#ECE5DD] dark:bg-[#0b141a]">
        {/* Status bar */}
        <div className="flex items-center justify-between bg-[#075E54] dark:bg-[#202c33] px-5 pt-2 pb-0.5 text-white">
          <span className="text-[11px] font-semibold tabular-nums">{now}</span>
          <div className="flex items-center gap-1">
            <SignalHigh className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            <BatteryFull className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 bg-[#075E54] dark:bg-[#202c33] px-3 pb-2.5 pt-1 text-white">
          <ArrowLeft className="h-4 w-4 opacity-90 shrink-0" />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold shrink-0">
            M
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold leading-tight truncate">Monchis Drivers</div>
            <div className="text-[10px] text-white/70 leading-tight">en línea</div>
          </div>
          <Video className="h-4 w-4 opacity-90 shrink-0" />
          <Phone className="h-4 w-4 opacity-90 shrink-0" />
          <MoreVertical className="h-4 w-4 opacity-90 shrink-0" />
        </div>

        {/* Chat */}
        <div
          className="min-h-[460px] max-h-[560px] overflow-y-auto px-3.5 py-4 space-y-2"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27%3E%3Ccircle cx=%272%27 cy=%272%27 r=%271%27 fill=%27%23000000%27 opacity=%270.03%27/%3E%3C/svg%3E")',
          }}
        >
          {/* Cifrado E2E (system message de WhatsApp) */}
          <div className="flex justify-center">
            <span className="max-w-[85%] rounded-md bg-[#fdf4c5] dark:bg-[#182229] px-2.5 py-1 text-center text-[9px] text-neutral-600 dark:text-neutral-400 shadow-sm">
              🔒 Los mensajes están cifrados de extremo a extremo.
            </span>
          </div>

          <div className="flex justify-center pt-1">
            <span className="rounded-md bg-white/80 dark:bg-white/10 px-2 py-0.5 text-[10px] text-neutral-600 dark:text-neutral-300 shadow-sm">
              HOY
            </span>
          </div>

          {/* Mensaje de contexto (postulante) — entrante, izquierda */}
          <div className="flex justify-start">
            <div className="relative max-w-[80%] rounded-lg rounded-tl-sm bg-white dark:bg-[#202c33] px-2.5 py-1.5 shadow-sm">
              <div className="text-[13px] leading-relaxed text-neutral-800 dark:text-neutral-100">
                Hola! Vi el aviso para ser repartidor 🛵
              </div>
              <div className="mt-0.5 text-right text-[10px] text-neutral-400 tabular-nums">
                {now}
              </div>
            </div>
          </div>

          {/* Mensaje del bot — saliente, derecha, verde, con checks azules */}
          {hasContent ? (
            <div className="flex justify-end">
              <div className="relative max-w-[82%] rounded-lg rounded-tr-sm bg-[#d9fdd3] dark:bg-[#005c4b] p-1 shadow-sm">
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="Adjunto"
                    className="mb-1 max-h-48 w-full rounded-md object-cover"
                  />
                )}
                <div className="px-1.5 pb-0.5 pt-0.5">
                  {html && (
                    <div
                      className="text-[13px] leading-relaxed text-neutral-800 dark:text-neutral-50 whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  )}
                  <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-neutral-500 dark:text-neutral-300 tabular-nums">
                    {now}
                    <CheckCheck className="h-3 w-3 text-[#53bdeb]" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <div className="max-w-[82%] rounded-lg rounded-tr-sm bg-[#d9fdd3]/50 dark:bg-[#005c4b]/40 px-2.5 py-3 text-[12px] italic text-neutral-500 dark:text-neutral-400">
                Tu mensaje aparece acá mientras escribís…
              </div>
            </div>
          )}

          {justSent && (
            <div className="flex justify-center pt-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-2.5 py-1 text-[10px] font-medium text-white shadow">
                <CheckCheck className="h-3 w-3" />
                Enviado de verdad al destinatario
              </span>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 bg-[#ECE5DD] dark:bg-[#0b141a] px-2 py-2">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-white dark:bg-[#202c33] px-3 py-1.5">
            <Smile className="h-4 w-4 text-neutral-400" />
            <span className="text-[12px] text-neutral-400 flex-1">Mensaje</span>
            <Plus className="h-4 w-4 text-neutral-400" />
            <Camera className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#075E54] text-white">
            <Mic className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  )
}
