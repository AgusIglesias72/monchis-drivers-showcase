'use client'

import { useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Bug, FileText, Paperclip, X } from 'lucide-react'
import {
  Callout,
  Drawer,
  Field,
  LoadingButton,
  SegmentedControl,
  Spinner,
  TextareaField,
  notify,
} from '@/components/ds'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const TYPE_OPTIONS = [
  { value: 'BUG', label: 'Bug' },
  { value: 'MEJORA', label: 'Mejora' },
  { value: 'IDEA', label: 'Idea' },
  { value: 'OTRO', label: 'Otro' },
]

const ACCEPTED_MIMES = 'image/jpeg,image/png,image/webp,image/gif,application/pdf'
const MAX_ATTACHMENTS = 5
const MAX_SIZE = 5 * 1024 * 1024

interface Attachment {
  id: string
  name: string
  size: number
  contentType: string
  status: 'uploading' | 'done' | 'error'
  url?: string
  previewUrl?: string
  error?: string
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function BugReportWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('BUG')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const idRef = useRef(0)

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).filter((f) =>
      ACCEPTED_MIMES.split(',').includes(f.type.toLowerCase()),
    )
    if (incoming.length === 0) return

    setError(null)
    const slots = MAX_ATTACHMENTS - attachments.length
    if (slots <= 0) {
      setError(`Máximo ${MAX_ATTACHMENTS} adjuntos por reporte`)
      return
    }

    const accepted: { attachment: Attachment; file: File }[] = []
    for (const file of incoming) {
      if (accepted.length >= slots) {
        setError(`Máximo ${MAX_ATTACHMENTS} adjuntos por reporte`)
        break
      }
      if (file.size > MAX_SIZE) {
        setError(`"${file.name}" pesa más de 5MB`)
        continue
      }
      const id = `att-${++idRef.current}`
      accepted.push({
        file,
        attachment: {
          id,
          name: file.name,
          size: file.size,
          contentType: file.type,
          status: 'uploading',
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        },
      })
    }
    if (accepted.length === 0) return

    setAttachments((prev) => [...prev, ...accepted.map((a) => a.attachment)])
    for (const { attachment, file } of accepted) void uploadFile(attachment.id, file)
  }

  async function uploadFile(id: string, file: File) {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/bug-reports/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al subir el archivo')
      setAttachments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'done', url: data.url } : a)),
      )
    } catch (err) {
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'error',
                error: err instanceof Error ? err.message : 'Error al subir',
              }
            : a,
        ),
      )
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((a) => a.id !== id)
    })
  }

  function resetForm() {
    setType('BUG')
    setTitle('')
    setDescription('')
    setAttachments((prev) => {
      prev.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl))
      return []
    })
    setError(null)
  }

  const uploading = attachments.some((a) => a.status === 'uploading')
  const failed = attachments.filter((a) => a.status === 'error')
  const canSend = title.trim().length > 0 && description.trim().length > 0 && !uploading

  async function handleSubmit() {
    if (!canSend || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          pageUrl: pathname,
          attachments: attachments
            .filter((a) => a.status === 'done' && a.url)
            .map((a) => ({
              url: a.url,
              name: a.name,
              contentType: a.contentType,
              size: a.size,
            })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el reporte')
      notify.success('Reporte enviado. Gracias por avisar.')
      resetForm()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el reporte')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Reportar un problema"
            data-testid="bug-report-trigger"
            onClick={() => setOpen(true)}
          >
            <Bug className="size-[18px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Reportar un problema</TooltipContent>
      </Tooltip>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Reportar un problema"
        subtitle="El reporte llega al equipo con la página actual adjunta"
        footer={
          <LoadingButton
            className="w-full"
            data-testid="bug-report-submit"
            loading={sending}
            disabled={!canSend}
            onClick={handleSubmit}
          >
            Enviar reporte
          </LoadingButton>
        }
      >
        <div
          className="space-y-5"
          onPaste={(e) => {
            if (e.clipboardData.files.length > 0) {
              e.preventDefault()
              addFiles(e.clipboardData.files)
            }
          }}
        >
          <Field label="Tipo">
            <SegmentedControl
              className="self-start"
              value={type}
              onValueChange={setType}
              options={TYPE_OPTIONS}
              aria-label="Tipo de reporte"
            />
          </Field>

          <Field label="Título" required htmlFor="bug-report-title">
            <Input
              id="bug-report-title"
              data-testid="bug-report-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Qué está pasando, en una línea"
              maxLength={150}
            />
          </Field>

          <TextareaField
            label="Descripción"
            required
            data-testid="bug-report-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Pasos para reproducirlo, qué esperabas que pase, qué pasó"
            rows={10}
            className="[&_textarea]:min-h-52"
            maxLength={5000}
          />

          <Field
            label="Adjuntos"
            hint="Capturas o documentos (JPG, PNG, PDF · máx. 5MB c/u). También podés pegar una imagen."
          >
            <div className="space-y-2">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--r-md)] border border-border bg-muted/40 p-2 pr-2.5',
                    a.status === 'error' && 'border-destructive/40',
                  )}
                >
                  {a.previewUrl ? (
                    <Image
                      src={a.previewUrl}
                      alt={a.name}
                      width={36}
                      height={36}
                      unoptimized
                      className="h-9 w-9 shrink-0 rounded-[var(--r-sm)] object-cover"
                    />
                  ) : (
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-sm)] bg-muted text-muted-foreground">
                      <FileText className="size-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.status === 'error' ? (
                        <span className="text-destructive">{a.error}</span>
                      ) : (
                        formatSize(a.size)
                      )}
                    </p>
                  </div>
                  {a.status === 'uploading' ? (
                    <Spinner size="sm" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      aria-label={`Quitar ${a.name}`}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {attachments.length < MAX_ATTACHMENTS && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="size-3.5" />
                  Adjuntar archivo
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_MIMES}
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </div>
          </Field>

          {failed.length > 0 && (
            <Callout tone="warning">
              Los adjuntos con error no se van a incluir en el reporte. Quitalos o volvé a
              intentar.
            </Callout>
          )}

          {error && <Callout tone="danger">{error}</Callout>}
        </div>
      </Drawer>
    </>
  )
}
