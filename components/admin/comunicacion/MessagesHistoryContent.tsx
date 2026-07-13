// components/admin/comunicacion/MessagesHistoryContent.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import {
  Search,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  DatabaseZap,
  Loader2,
  MessageSquare,
  FileText,
  Send,
  FlaskConical,
} from 'lucide-react'
import type {
  WhatsAppMessageStatus,
  WhatsAppMessageSource,
  WhatsAppMessageType,
} from '@prisma/client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ComunicacionesDateFilter } from './comunicaciones-date-filter'
import { exportMessages } from '@/app/admin/comunicaciones/historial/actions'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  recipientName: string
  recipientPhone: string
  messageType: string
  status: WhatsAppMessageStatus
  source: WhatsAppMessageSource
  sentAt: Date | string
  message: string
  metadata?: any
  formDriver?: { id: string; fullName: string | null } | null
  sentByUser?: { id: string; fullName: string | null; email: string } | null
}

interface MessageStatsLike {
  total: number
  successful: number
  failed: number
  successRate: string
}

interface Props {
  messages: Message[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  statsCurrent: MessageStatsLike
  statsPrev: MessageStatsLike
  currentRange: { from: Date; to: Date }
  isDefaultRange: boolean
  filters: {
    search?: string
    messageType?: WhatsAppMessageType
    status?: WhatsAppMessageStatus
    source?: WhatsAppMessageSource
    dateFrom?: string
    dateTo?: string
  }
  dbError: boolean
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'SENT', label: 'Enviado' },
  { value: 'DELIVERED', label: 'Entregado' },
  { value: 'READ', label: 'Leído' },
  { value: 'FAILED', label: 'Falló' },
  { value: 'SENDING', label: 'Enviando' },
] as const

const SOURCE_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'TRIGGER', label: 'Trigger' },
  { value: 'CRON', label: 'Cron' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'API', label: 'API' },
] as const

const statusCopy: Record<string, { label: string; tone: 'ok' | 'pending' | 'bad' }> = {
  SENT: { label: 'Enviado', tone: 'ok' },
  DELIVERED: { label: 'Entregado', tone: 'ok' },
  READ: { label: 'Leído', tone: 'ok' },
  SENDING: { label: 'Enviando', tone: 'pending' },
  FAILED: { label: 'Falló', tone: 'bad' },
  PENDING: { label: 'Pendiente', tone: 'pending' },
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('595') && digits.length >= 11) {
    return `+595 ${digits.slice(3, 6)} ${digits.slice(6, 9)}-${digits.slice(9)}`
  }
  if (digits.startsWith('54') && digits.length >= 12) {
    return `+54 9 ${digits.slice(2, 4)} ${digits.slice(4, 8)}-${digits.slice(8)}`
  }
  return `+${digits}`
}

function rangeLabel(range: { from: Date; to: Date }, isDefault: boolean): string {
  if (isDefault) return 'últimos 7 días'
  const sameYear = range.from.getFullYear() === range.to.getFullYear()
  const sameDay =
    sameYear &&
    range.from.getMonth() === range.to.getMonth() &&
    range.from.getDate() === range.to.getDate()
  if (sameDay) return format(range.from, "d 'de' MMM", { locale: es })
  return `${format(range.from, 'd MMM', { locale: es })} – ${format(range.to, 'd MMM', { locale: es })}`
}

function computeDelta(curr: number, prev: number): {
  pct: number | null
  direction: 'up' | 'down' | 'flat'
} {
  if (prev === 0 && curr === 0) return { pct: null, direction: 'flat' }
  if (prev === 0) return { pct: null, direction: 'up' }
  const change = ((curr - prev) / prev) * 100
  if (Math.abs(change) < 1) return { pct: 0, direction: 'flat' }
  return {
    pct: Math.abs(Math.round(change)),
    direction: change > 0 ? 'up' : 'down',
  }
}

function groupByDay(messages: Message[]) {
  const groups = new Map<string, Message[]>()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  for (const m of messages) {
    const d = new Date(m.sentAt)
    let label: string
    if (d >= today) label = 'Hoy'
    else if (d >= yesterday) label = 'Ayer'
    else label = format(d, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
    const cap = label.charAt(0).toUpperCase() + label.slice(1)
    if (!groups.has(cap)) groups.set(cap, [])
    groups.get(cap)!.push(m)
  }
  return Array.from(groups.entries())
}

export function MessagesHistoryContent({
  messages,
  pagination,
  statsCurrent,
  statsPrev,
  currentRange,
  isDefaultRange,
  filters,
  dbError,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isExporting, setIsExporting] = useState(false)
  const [localSearch, setLocalSearch] = useState(filters.search || '')
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)

  const sentDelta = computeDelta(statsCurrent.total, statsPrev.total)
  const periodLabel = rangeLabel(currentRange, isDefaultRange)
  const groupedMessages = groupByDay(messages)

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (value === null || value === '' || value === 'all') params.delete(key)
    else params.set(key, value)
    // Reset paginación al filtrar.
    if (key !== 'page') params.delete('page')
    startTransition(() => {
      router.push(`/admin/comunicaciones/historial${params.toString() ? `?${params.toString()}` : ''}`)
    })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateParam('search', localSearch.trim() || null)
  }

  const handleClearAll = () => {
    setLocalSearch('')
    startTransition(() => {
      router.push('/admin/comunicaciones/historial')
    })
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const result = await exportMessages({
        search: filters.search,
        messageType: filters.messageType,
        status: filters.status,
        source: filters.source,
        dateFrom: currentRange.from,
        dateTo: currentRange.to,
      })
      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename || 'mensajes.csv'
        a.click()
        URL.revokeObjectURL(url)
        toast.success(`Exportado: ${result.filename}`)
      } else {
        toast.error(result.error || 'No se pudo exportar')
      }
    } catch (err) {
      toast.error('Error al exportar')
    } finally {
      setIsExporting(false)
    }
  }

  const hasActiveFilters = !!(
    filters.search ||
    filters.messageType ||
    filters.status ||
    filters.source ||
    filters.dateFrom ||
    filters.dateTo
  )

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {dbError && (
        <Alert variant="destructive">
          <DatabaseZap className="h-4 w-4" />
          <AlertTitle>No pudimos conectar con la base de datos</AlertTitle>
          <AlertDescription>
            Las métricas y el listado pueden estar vacíos hasta que la DB vuelva.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Historial de mensajes</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Todos los mensajes WhatsApp enviados. Filtrá por fecha, estado, origen
            o buscá por nombre, teléfono o contenido.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/plantillas-whatsapp">
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Plantillas
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/comunicaciones/masivo">
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Envío masivo
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/comunicaciones/pruebas?bot=whatsapp-bot">
              <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
              Probar
            </Link>
          </Button>
          <Button onClick={handleExport} disabled={isExporting || dbError} size="sm">
            {isExporting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Exportando…
              </>
            ) : (
              <>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Exportar CSV
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Sub-header: rango */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-y py-3">
        <div className="text-xs text-muted-foreground">
          Métricas y listado de{' '}
          <span className="font-medium text-foreground">{periodLabel}</span>
        </div>
        <ComunicacionesDateFilter
          currentStartDate={filters.dateFrom}
          currentEndDate={filters.dateTo}
          basePath="/admin/comunicaciones/historial"
          paramKeys={{ from: 'dateFrom', to: 'dateTo' }}
        />
      </div>

      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-x-8 gap-y-6 pb-6 border-b sm:grid-cols-4">
        <Kpi
          label="Enviados"
          value={statsCurrent.total.toLocaleString('es-AR')}
          delta={sentDelta}
          prevValue={statsPrev.total}
        />
        <Kpi
          label="Tasa de éxito"
          value={`${parseFloat(statsCurrent.successRate).toFixed(0)}%`}
          hint={
            statsCurrent.total === 0
              ? 'sin datos en el período'
              : `${statsCurrent.successful} de ${statsCurrent.total}`
          }
          tone={
            statsCurrent.total > 0 && statsCurrent.failed > 0 && parseFloat(statsCurrent.successRate) < 90
              ? 'warn'
              : 'default'
          }
        />
        <Kpi
          label="Fallidos"
          value={statsCurrent.failed.toLocaleString('es-AR')}
          hint={
            statsCurrent.failed === 0
              ? 'todo OK'
              : statsPrev.failed > 0
              ? `${statsPrev.failed} en período anterior`
              : 'ninguno en período anterior'
          }
          tone={statsCurrent.failed > 0 ? 'warn' : 'default'}
        />
        <Kpi
          label="Resultados visibles"
          value={pagination.total.toLocaleString('es-AR')}
          hint={
            pagination.totalPages > 1
              ? `página ${pagination.page} de ${pagination.totalPages}`
              : pagination.total === 0
              ? 'sin coincidencias'
              : 'todos en esta página'
          }
        />
      </section>

      {/* Filtros */}
      <section className="space-y-4">
        <form onSubmit={handleSearchSubmit} className="space-y-1.5 max-w-md">
          <Label htmlFor="historial-search" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Buscar
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="historial-search"
              type="search"
              placeholder="Nombre, teléfono o contenido del mensaje…"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              className="pl-9 h-9"
              aria-describedby="historial-search-hint"
            />
            <span id="historial-search-hint" className="sr-only">
              Apretá Enter para aplicar la búsqueda
            </span>
          </div>
        </form>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <FilterRadioGroup
            label="Estado"
            options={STATUS_OPTIONS as any}
            value={filters.status || 'all'}
            onChange={v => updateParam('status', v === 'all' ? null : v)}
          />

          <FilterRadioGroup
            label="Origen"
            options={SOURCE_OPTIONS as any}
            value={filters.source || 'all'}
            onChange={v => updateParam('source', v === 'all' ? null : v)}
          />

          <div className="flex items-center gap-2 sm:ml-auto">
            {isPending && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Aplicando…
              </span>
            )}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={isPending}
                className="text-muted-foreground"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section>
        {messages.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} />
        ) : (
          <div className="space-y-6">
            {groupedMessages.map(([day, msgs]) => (
              <div key={day}>
                <h3 className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                  {day}
                </h3>
                <ul className="divide-y border-y">
                  {msgs.map(msg => (
                    <MessageRow
                      key={msg.id}
                      msg={msg}
                      onOpen={() => setSelectedMessage(msg)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={p => updateParam('page', String(p))}
        />
      )}

      {/* Drawer detalle */}
      <Sheet
        open={!!selectedMessage}
        onOpenChange={open => !open && setSelectedMessage(null)}
      >
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedMessage && <MessageDetail msg={selectedMessage} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  delta,
  prevValue,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: React.ReactNode
  delta?: { pct: number | null; direction: 'up' | 'down' | 'flat' }
  prevValue?: number
  tone?: 'default' | 'ok' | 'warn'
}) {
  const valueColor = tone === 'warn' ? 'text-warning' : 'text-foreground'
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-medium">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className={`text-3xl font-semibold tabular-nums ${valueColor}`}>{value}</div>
        {delta && <DeltaBadge delta={delta} />}
      </div>
      {delta ? (
        <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
          {prevValue !== undefined
            ? `vs ${prevValue.toLocaleString('es-AR')} en período anterior`
            : null}
        </div>
      ) : hint != null ? (
        <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  )
}

function DeltaBadge({
  delta,
}: {
  delta: { pct: number | null; direction: 'up' | 'down' | 'flat' }
}) {
  if (delta.direction === 'flat' && delta.pct === null) return null
  const Icon =
    delta.direction === 'up' ? TrendingUp : delta.direction === 'down' ? TrendingDown : Minus
  const color =
    delta.direction === 'up'
      ? 'text-success'
      : delta.direction === 'down'
      ? 'text-destructive'
      : 'text-muted-foreground'
  const text =
    delta.pct === null
      ? delta.direction === 'up'
        ? 'nuevo'
        : '—'
      : `${delta.pct}%`
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${color}`}>
      <Icon className="h-3 w-3" />
      {text}
    </span>
  )
}

function FilterRadioGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: ReadonlyArray<{ value: string; label: string }>
  value: string
  onChange: (v: string) => void
}) {
  const id = `filter-${label.toLowerCase()}`
  return (
    <div className="space-y-1.5">
      <Label id={`${id}-label`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <RadioGroupPrimitive.Root
        value={value}
        onValueChange={v => v && onChange(v)}
        aria-labelledby={`${id}-label`}
        className="inline-flex rounded-md border bg-background p-0.5"
      >
        {options.map(opt => {
          const isSelected = value === opt.value
          return (
            <RadioGroupPrimitive.Item
              key={opt.value}
              value={opt.value}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium outline-none transition-colors',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                isSelected
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              {opt.label}
            </RadioGroupPrimitive.Item>
          )
        })}
      </RadioGroupPrimitive.Root>
    </div>
  )
}

function MessageRow({
  msg,
  onOpen,
}: {
  msg: Message
  onOpen: () => void
}) {
  const status = statusCopy[msg.status] ?? { label: msg.status, tone: 'pending' as const }
  const time = format(new Date(msg.sentAt), 'HH:mm', { locale: es })
  const templateKey = (msg.metadata as any)?.templateKey as string | undefined
  const displayName = msg.formDriver?.fullName || msg.recipientName || 'Sin nombre'
  const sourceLabel =
    msg.source === 'TRIGGER'
      ? 'auto'
      : msg.source === 'CRON'
      ? 'cron'
      : msg.source === 'MANUAL'
      ? 'manual'
      : msg.source.toLowerCase()

  return (
    <li
      onClick={onOpen}
      className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-3 text-sm cursor-pointer hover:bg-muted/40 transition-colors px-1 -mx-1 rounded"
    >
      <span className="tabular-nums text-xs text-muted-foreground w-10">{time}</span>

      <div className="min-w-0">
        <div className="truncate font-medium">{displayName}</div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {formatPhone(msg.recipientPhone)}
        </div>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-0.5 text-right">
        <code className="text-xs text-muted-foreground">
          {templateKey || msg.messageType.toLowerCase()}
        </code>
        <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
          {sourceLabel}
        </span>
      </div>

      <StatusDot tone={status.tone} label={status.label} />
    </li>
  )
}

function StatusDot({ tone, label }: { tone: 'ok' | 'pending' | 'bad'; label: string }) {
  const color =
    tone === 'ok' ? 'bg-success' : tone === 'bad' ? 'bg-destructive' : 'bg-warning'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden />
      <span>{label}</span>
    </span>
  )
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
}) {
  return (
    <div className="flex items-center justify-between border-t pt-4">
      <span className="text-xs text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
        >
          Siguiente
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-md border border-dashed py-16 text-center">
      <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm font-medium">
        {hasFilters ? 'Ningún mensaje coincide con los filtros' : 'No hay mensajes en el período'}
      </p>
      <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
        {hasFilters
          ? 'Ajustá la fecha, el estado o el origen para ver más resultados.'
          : 'Cuando el bot mande mensajes vas a verlos acá.'}
      </p>
    </div>
  )
}

function MessageDetail({ msg }: { msg: Message }) {
  const status = statusCopy[msg.status] ?? { label: msg.status, tone: 'pending' as const }
  const templateKey = (msg.metadata as any)?.templateKey as string | undefined
  const sentAt = new Date(msg.sentAt)
  const displayName = msg.formDriver?.fullName || msg.recipientName || 'Sin nombre'

  return (
    <div className="space-y-5">
      <SheetHeader>
        <SheetTitle>{displayName}</SheetTitle>
        <SheetDescription className="tabular-nums">
          {formatPhone(msg.recipientPhone)} ·{' '}
          {format(sentAt, "d MMM yyyy 'a las' HH:mm", { locale: es })} (
          {formatDistanceToNow(sentAt, { addSuffix: true, locale: es })})
        </SheetDescription>
      </SheetHeader>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Estado</dt>
        <dd>
          <StatusDot tone={status.tone} label={status.label} />
        </dd>

        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Origen</dt>
        <dd className="text-sm">{msg.source}</dd>

        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</dt>
        <dd className="text-sm">{msg.messageType}</dd>

        {templateKey && (
          <>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Plantilla</dt>
            <dd>
              <code className="text-xs">{templateKey}</code>
            </dd>
          </>
        )}

        {msg.sentByUser && (
          <>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Enviado por</dt>
            <dd className="text-sm">{msg.sentByUser.fullName || msg.sentByUser.email}</dd>
          </>
        )}

        {msg.formDriver?.id && (
          <>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Postulación</dt>
            <dd className="text-sm">
              <Link
                href={`/admin/postulaciones/${(msg.formDriver as any).slug ?? msg.formDriver.id}`}
                className="underline hover:text-foreground"
              >
                Ver detalle
              </Link>
            </dd>
          </>
        )}
      </dl>

      <div className="border-t pt-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Contenido
        </div>
        <div className="rounded-md bg-muted/40 p-3 text-sm whitespace-pre-wrap">
          {msg.message || <span className="text-muted-foreground italic">Sin contenido</span>}
        </div>
      </div>
    </div>
  )
}
